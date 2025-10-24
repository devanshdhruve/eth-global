import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { 
  TaskManagerServer, 
  Task, 
  Project, 
  ProjectOwner,
  TaskStatus 
} from "@/lib/projectUpload";

const PINATA_JWT = process.env.PINATA_JWT;
const HEDERA_ACCOUNT_ID = process.env.HEDERA_TESTNET_ACCOUNT_ID;
const HEDERA_PRIVATE_KEY = process.env.HEDERA_TESTNET_PRIVATE_KEY;
const PROJECT_TOPICS_ID = process.env.PROJECT_TOPICS_ID;

console.log("🔍 Environment check:");
console.log("PINATA_JWT:", PINATA_JWT ? "✅ Set" : "❌ Missing");
console.log("HEDERA_ACCOUNT_ID:", HEDERA_ACCOUNT_ID ? "✅ Set" : "❌ Missing");
console.log("HEDERA_PRIVATE_KEY:", HEDERA_PRIVATE_KEY ? "✅ Set" : "❌ Missing");
console.log("PROJECT_TOPICS_ID:", PROJECT_TOPICS_ID ? "✅ Set" : "❌ Missing");

export const POST = async (req: NextRequest) => {
  let taskManager: TaskManagerServer | null = null;

  try {
    console.log("\n🚀 === NEW PROJECT UPLOAD REQUEST ===");

    // Validate environment variables
    if (!PINATA_JWT) {
      throw new Error("Missing PINATA_JWT environment variable");
    }
    if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY || !PROJECT_TOPICS_ID) {
      throw new Error("Missing Hedera configuration in environment variables");
    }

    // Parse form data
    console.log("Step 1: Parsing form data...");
    const formData = await req.formData();
    
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const projectName = formData.get("projectName") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const rewardStr = formData.get("reward") as string;
    
    // Owner information
    const ownerAccountId = formData.get("ownerAccountId") as string;
    const ownerWallet = formData.get("ownerWallet") as string;
    const ownerName = formData.get("ownerName") as string;
    const ownerEmail = formData.get("ownerEmail") as string;

    console.log("📋 Form data received:");
    console.log("  - File:", file?.name);
    console.log("  - Project ID:", projectId);
    console.log("  - Project Name:", projectName);
    console.log("  - Owner Account:", ownerAccountId);
    console.log("  - Category:", category);
    console.log("  - Reward:", rewardStr);

    // Validation
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }
    if (!projectName) {
      return NextResponse.json({ error: "Missing projectName" }, { status: 400 });
    }
    if (!rewardStr) {
      return NextResponse.json({ error: "Missing reward" }, { status: 400 });
    }

    const reward = parseFloat(rewardStr);
    if (isNaN(reward) || reward <= 0) {
      return NextResponse.json({ error: "Invalid reward amount" }, { status: 400 });
    }

    // Create owner object
    const owner: ProjectOwner = {
      accountId: ownerAccountId || HEDERA_ACCOUNT_ID!,
      walletAddress: ownerWallet,
      name: ownerName || "Anonymous",
      email: ownerEmail,
    };

    console.log(`👤 Project Owner: ${owner.name} (${owner.accountId})`);
    console.log(`💰 Total Reward: ${reward} HBAR`);

    // Step 2: Parse the uploaded file
    console.log("\nStep 2: Parsing uploaded file...");
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileText = buffer.toString("utf-8");

    let taskData: any[] = [];

    if (file.name.endsWith(".csv")) {
      console.log("  Parsing as CSV...");
      const rows = parse(fileText, {
        skip_empty_lines: true,
        trim: true,
        columns: false,
      });
      taskData = rows.map((row: any, index: number) => ({
        taskId: index + 1,
        data: Array.isArray(row) ? row : [row],
      }));
    } else if (file.name.endsWith(".json")) {
      console.log("  Parsing as JSON...");
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

    console.log(`✅ Parsed ${taskData.length} tasks from file`);

    // Step 3: Pin each task to IPFS via Pinata
    console.log("\nStep 3: Pinning tasks to IPFS...");
    const tasks: Task[] = [];

    for (let i = 0; i < taskData.length; i++) {
      const task = taskData[i];
      console.log(`  📌 Pinning task ${task.taskId}/${taskData.length}...`);

      try {
        const ipfsHash = await pinTaskToPinata({
          taskId: task.taskId,
          projectId,
          payload: task.data,
        });

        tasks.push({
          taskId: task.taskId,
          ipfsHash,
          status: "pending" as TaskStatus,
          raw: task.data,
        });

        console.log(`  ✅ Task ${task.taskId} pinned: ${ipfsHash}`);
      } catch (pinError: any) {
        console.error(`  ❌ Failed to pin task ${task.taskId}:`, pinError);
        throw new Error(`Failed to pin task ${task.taskId}: ${pinError.message}`);
      }
    }

    console.log(`\n🎯 All ${tasks.length} tasks pinned to IPFS`);

    // Step 4: Submit to Hedera Consensus Service
    console.log("\nStep 4: Submitting to Hedera Consensus Service...");
    
    taskManager = new TaskManagerServer(
      PROJECT_TOPICS_ID,
      HEDERA_ACCOUNT_ID,
      HEDERA_PRIVATE_KEY
    );

    const project: Project = {
      projectId,
      projectName,
      description,
      owner,
      taskCount: tasks.length,
      reward,
      status: "open",
      tasks,
      createdAt: new Date(),
      category,
    };

    const transactionId = await taskManager.submitProjectToHCS(project);

    // Get task statistics
    const stats = taskManager.getTaskStatusStats(tasks);

    // Step 5: Return success response
    const response = {
      success: true,
      project: {
        projectId: project.projectId,
        projectName: project.projectName,
        description: project.description,
        owner: {
          accountId: project.owner.accountId,
          name: project.owner.name,
          walletAddress: project.owner.walletAddress,
        },
        taskCount: project.taskCount,
        reward: project.reward,
        rewardPerTask: (project.reward / project.taskCount).toFixed(4),
        status: project.status,
        category: project.category,
        createdAt: project.createdAt,
        statistics: {
          pending: stats.pending,
          completionRate: stats.completionRate,
        },
      },
      tasks: tasks.map((t) => ({
        taskId: t.taskId,
        ipfsHash: t.ipfsHash,
        status: t.status,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${t.ipfsHash}`,
      })),
      hedera: {
        topicId: PROJECT_TOPICS_ID,
        transactionId,
        message: `Project ${projectId} created with ${tasks.length} tasks by ${owner.name}`,
      },
    };

    console.log(`\n✅ === PROJECT CREATED SUCCESSFULLY ===`);
    console.log(`Project: ${projectId}`);
    console.log(`Owner: ${owner.name} (${owner.accountId})`);
    console.log(`Tasks: ${tasks.length}`);
    console.log(`Reward: ${reward} HBAR`);
    console.log(`Transaction: ${transactionId}\n`);

    return NextResponse.json(response, { status: 201 });
  } catch (err: any) {
    console.error("\n❌ === ERROR CREATING PROJECT ===");
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
    
    return NextResponse.json(
      {
        error: err.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
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
