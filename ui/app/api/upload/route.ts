import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { TaskManagerServer, Task, Project } from "../../../lib/projectUpload";

const PINATA_JWT = process.env.PINATA_JWT;
const HEDERA_ACCOUNT_ID = process.env.HEDERA_TESTNET_ACCOUNT_ID;
const HEDERA_PRIVATE_KEY = process.env.HEDERA_TESTNET_PRIVATE_KEY;
const PROJECT_TOPICS_ID = process.env.PROJECT_TOPICS_ID;

export const POST = async (req: NextRequest) => {
  let taskManager: TaskManagerServer | null = null;

  try {
    // Validate environment variables
    if (!PINATA_JWT) {
      throw new Error("Missing PINATA_JWT environment variable");
    }
    if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY || !PROJECT_TOPICS_ID) {
      throw new Error("Missing Hedera configuration in environment variables");
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const rewardStr = formData.get("reward") as string;

    // Validation
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }
    if (!rewardStr) {
      return NextResponse.json({ error: "Missing reward" }, { status: 400 });
    }

    const reward = parseFloat(rewardStr);
    if (isNaN(reward) || reward <= 0) {
      return NextResponse.json({ error: "Invalid reward amount" }, { status: 400 });
    }

    console.log(`📦 Processing project: ${projectId}`);
    console.log(`💰 Reward: ${reward} HBAR`);
    console.log(`📄 File: ${file.name} (${file.size} bytes)`);

    // Step 1: Parse the uploaded file
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileText = buffer.toString("utf-8");

    let taskData: any[] = [];

    if (file.name.endsWith(".csv")) {
      const rows = parse(fileText, {
        skip_empty_lines: true,
        trim: true,
        columns: false, // Don't use first row as headers
      });
      taskData = rows.map((row: any, index: number) => ({
        taskId: index + 1,
        data: Array.isArray(row) ? row : [row],
      }));
    } else if (file.name.endsWith(".json")) {
      const json = JSON.parse(fileText);
      if (!Array.isArray(json)) {
        return NextResponse.json(
          { error: "JSON must be an array of tasks" },
          { status: 400 }
        );
      }
      taskData = json.map((item: any, index: number) => ({
        taskId: index + 1,
        data: item,
      }));
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Use .csv or .json" },
        { status: 400 }
      );
    }

    if (taskData.length === 0) {
      return NextResponse.json(
        { error: "File contains no tasks" },
        { status: 400 }
      );
    }

    console.log(`📋 Parsed ${taskData.length} tasks from file`);

    // Step 2: Pin each task to IPFS via Pinata
    const tasks: Task[] = [];

    for (let i = 0; i < taskData.length; i++) {
      const task = taskData[i];
      console.log(`📌 Pinning task ${task.taskId} to IPFS...`);

      try {
        const ipfsHash = await pinTaskToPinata({
          taskId: task.taskId,
          projectId,
          payload: task.data,
        });

        tasks.push({
          taskId: task.taskId,
          ipfsHash,
          raw: task.data,
        });

        console.log(`✅ Task ${task.taskId} pinned: ${ipfsHash}`);
      } catch (pinError: any) {
        console.error(`❌ Failed to pin task ${task.taskId}:`, pinError);
        throw new Error(`Failed to pin task ${task.taskId}: ${pinError.message}`);
      }
    }

    console.log(`\n🎯 All ${tasks.length} tasks pinned to IPFS`);

    // Step 3: Submit to Hedera Consensus Service
    console.log(`\n📤 Submitting to Hedera Consensus Service...`);
    
    taskManager = new TaskManagerServer(
      PROJECT_TOPICS_ID,
      HEDERA_ACCOUNT_ID,
      HEDERA_PRIVATE_KEY
    );

    const project: Project = {
      projectId,
      taskCount: tasks.length,
      reward,
      status: "open",
      tasks,
      createdAt: new Date(),
    };

    const transactionId = await taskManager.submitProjectToHCS(project);

    // Step 4: Return success response
    const response = {
      success: true,
      project: {
        projectId: project.projectId,
        taskCount: project.taskCount,
        reward: project.reward,
        status: project.status,
        createdAt: project.createdAt,
      },
      tasks: tasks.map((t) => ({
        taskId: t.taskId,
        ipfsHash: t.ipfsHash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${t.ipfsHash}`,
      })),
      hedera: {
        topicId: PROJECT_TOPICS_ID,
        transactionId,
        message: `Project ${projectId} created with ${tasks.length} tasks`,
      },
    };

    console.log(`\n✅ Project ${projectId} successfully created!`);
    return NextResponse.json(response, { status: 201 });
  } catch (err: any) {
    console.error("❌ Error creating project:", err);
    return NextResponse.json(
      {
        error: err.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    // Cleanup: Close Hedera client connection
    if (taskManager) {
      try {
        taskManager.cleanup();
      } catch (cleanupError) {
        console.error("Warning: Failed to cleanup:", cleanupError);
      }
    }
  }
};

/**
 * Pin a single task to Pinata IPFS
 */
const pinTaskToPinata = async (task: {
  taskId: number;
  projectId: string;
  payload: any;
}): Promise<string> => {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataOptions: {
        cidVersion: 1,
      },
      pinataMetadata: {
        name: `task-${task.taskId}`,
        keyvalues: {
          projectId: task.projectId,
          taskId: task.taskId.toString(),
        },
      },
      pinataContent: {
        projectId: task.projectId,
        taskId: task.taskId,
        data: task.payload,
        timestamp: new Date().toISOString(),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata API error (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.IpfsHash;
};
