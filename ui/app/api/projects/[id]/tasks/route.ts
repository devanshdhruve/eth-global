// /app/api/projects/[id]/tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const PROJECT_TOPICS_ID = process.env.PROJECT_TOPICS_ID;
const SCREENING_TOPIC_ID = process.env.SCREENING_TOPICS_ID;
const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

interface HCSProject {
  event: string;
  projectId: string;
  instruction: string; // Added instruction field
  tasks: Array<{
    taskId: number;
    ipfsHash: string;
  }>;
}

interface HCSScreeningResult {
  type: "SCREENING_RESULT";
  projectId: string;
  userId: string;
  status: 'passed' | 'failed';
}

interface Task {
  taskId: number;
  text: string;
  ipfsHash: string;
  metadata?: any;
}

// Helper function to fetch messages from a topic
async function fetchTopicMessages(topicId: string) {
  const response = await fetch(
    `${MIRROR_NODE_URL}/api/v1/topics/${topicId}/messages?limit=100&order=desc`
  );
  if (!response.ok) {
    throw new Error(`Mirror Node API error for topic ${topicId}: ${response.statusText}`);
  }
  const data = await response.json();
  return data.messages || [];
}

// Helper function to fetch data from IPFS via Pinata gateway
async function fetchFromIPFS(ipfsHash: string) {
  try {
    const url = `${PINATA_GATEWAY}/${ipfsHash}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching IPFS hash ${ipfsHash}:`, error);
    throw error;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the authenticated user ID
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const projectId = params.id;

    if (!PROJECT_TOPICS_ID || !SCREENING_TOPIC_ID) {
      return NextResponse.json(
        { error: "Missing PROJECT_TOPICS_ID or SCREENING_TOPIC_ID configuration" },
        { status: 500 }
      );
    }

    console.log(`📡 Fetching tasks for project ${projectId}...`);

    // Step 1: Verify user passed screening for this project
    const screeningMessages = await fetchTopicMessages(SCREENING_TOPIC_ID);
    
    let userPassed = false;
    // Process newest first to find the most recent attempt
    for (const msg of screeningMessages) {
      try {
        const messageString = Buffer.from(msg.message, "base64").toString("utf-8");
        const resultData: HCSScreeningResult = JSON.parse(messageString);

        if (resultData.projectId === projectId && resultData.userId === userId) {
          if (resultData.status === 'passed') {
            userPassed = true;
          }
          // If most recent attempt is fail or pass, we found it.
          break; 
        }
      } catch (err) {
        console.warn("Could not parse a screening message:", err);
      }
    }

    if (!userPassed) {
      return NextResponse.json(
        { 
          error: "Access denied - You must pass the screening test first",
          canAnnotate: false 
        },
        { status: 403 }
      );
    }

    // Step 2: Find the project and get IPFS hashes
    const projectMessages = await fetchTopicMessages(PROJECT_TOPICS_ID);
    
    let projectTasks: Array<{ taskId: number; ipfsHash: string }> | null = null;
    let projectInstruction: string | null = null; // Variable to hold the instruction


    for (const msg of projectMessages) {
      try {
        const messageString = Buffer.from(msg.message, "base64").toString("utf-8");
        const projectData: HCSProject = JSON.parse(messageString);

        if (projectData.event === "new_project" && projectData.projectId === projectId) {
          projectTasks = projectData.tasks;
          projectInstruction = projectData.instruction; // Capture the instruction
          break;
        }
      } catch (err) {
        console.warn("Could not parse a project message:", err);
      }
    }

    if (!projectTasks || projectTasks.length === 0) {
      return NextResponse.json(
        { error: "Project not found or has no tasks" },
        { status: 404 }
      );
    }

    console.log(`✅ Found ${projectTasks.length} tasks for project ${projectId}`);

    // Step 3: Fetch task data from IPFS
    const tasks: Task[] = [];
    const fetchPromises = projectTasks.map(async (task) => {
      try {
        const ipfsData = await fetchFromIPFS(task.ipfsHash);
        
        return {
          taskId: task.taskId,
          text: ipfsData.text || ipfsData.content || JSON.stringify(ipfsData),
          ipfsHash: task.ipfsHash,
          metadata: ipfsData.metadata || ipfsData,
        };
      } catch (error) {
        console.error(`Failed to fetch task ${task.taskId}:`, error);
        // Return a placeholder if IPFS fetch fails
        return {
          taskId: task.taskId,
          text: `[Task data unavailable - IPFS hash: ${task.ipfsHash}]`,
          ipfsHash: task.ipfsHash,
          metadata: { error: "Failed to fetch from IPFS" },
        };
      }
    });

    const fetchedTasks = await Promise.all(fetchPromises);
    
    // Sort by taskId
    fetchedTasks.sort((a, b) => a.taskId - b.taskId);

    console.log(`✅ Successfully fetched ${fetchedTasks.length} tasks from IPFS`);

    // Step 4: Return tasks
    return NextResponse.json({
      success: true,
      projectId,
      instruction: projectInstruction, // Return the instruction
      tasks: fetchedTasks,
      totalTasks: fetchedTasks.length,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("❌ Error fetching tasks:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        message: err.message,
      },
      { status: 500 }
    );
  }
}
