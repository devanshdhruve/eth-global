// /app/api/projects/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const PROJECT_TOPICS_ID = process.env.PROJECT_TOPICS_ID;
const SCREENING_TOPIC_ID = process.env.SCREENING_TOPICS_ID;
const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

interface HCSProject {
  event: string;
  projectId: string;
  taskCount: number;
  instruction: string;
  reward: number;
  category?: string;
  description?: string;
  tasks: Array<{
    taskId: number;
    ipfsHash: string;
  }>;
  timestamp: string;
  status?: string;
  clientId?: string;
  clientName?: string;
}

interface HCSScreeningResult {
  type: "SCREENING_RESULT";
  projectId: string;
  userId: string;
  score: number;
  status: 'passed' | 'failed';
  timestamp: string;
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

    console.log(`📡 Fetching project ${projectId} from HCS...`);

    // Step 1: Fetch project messages from HCS
    const projectMessages = await fetchTopicMessages(PROJECT_TOPICS_ID);
    
    let foundProject: HCSProject | null = null;

    // Find the specific project by ID
    for (const msg of projectMessages) {
      try {
        const messageString = Buffer.from(msg.message, "base64").toString("utf-8");
        const projectData: HCSProject = JSON.parse(messageString);

        if (projectData.event === "new_project" && projectData.projectId === projectId) {
          projectData.status = "open";
          projectData.timestamp = msg.consensus_timestamp;
          foundProject = projectData;
          break;
        }
      } catch (err) {
        console.warn("Could not parse a project message:", err);
      }
    }

    if (!foundProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check for project status updates
    for (const msg of projectMessages) {
      try {
        const messageString = Buffer.from(msg.message, "base64").toString("utf-8");
        const projectData: HCSProject = JSON.parse(messageString);

        if (projectData.projectId === projectId) {
          if (projectData.event === "project_completed") {
            foundProject.status = "completed";
          } else if (projectData.event === "project_failed") {
            foundProject.status = "failed";
          } else if (projectData.event === "project_assigned") {
            foundProject.status = "assigned";
          }
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    console.log(`✅ Found project: ${foundProject.projectId} (status: ${foundProject.status})`);

    // Step 2: Check screening status for current user
    console.log(`📡 Checking screening status for user ${userId}...`);
    const screeningMessages = await fetchTopicMessages(SCREENING_TOPIC_ID);
    
    let userScreeningStatus: 'passed' | 'failed' | 'not-attempted' = 'not-attempted';
    let screeningScore: number | null = null;

    for (const msg of screeningMessages) {
      try {
        const messageString = Buffer.from(msg.message, "base64").toString("utf-8");
        const resultData: HCSScreeningResult = JSON.parse(messageString);

        if (resultData.projectId === projectId && resultData.userId === userId) {
          userScreeningStatus = resultData.status;
          screeningScore = resultData.score;
          break;
        }
      } catch (err) {
        console.warn("Could not parse a screening message:", err);
      }
    }

    console.log(`✅ User screening status: ${userScreeningStatus}`);

    // Step 3: Return project with screening status
    return NextResponse.json({
      success: true,
      project: {
        ...foundProject,
        userScreeningStatus,
        screeningScore,
        canAnnotate: userScreeningStatus === 'passed',
      },
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("❌ Error fetching project:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch project from Hedera",
        message: err.message,
      },
      { status: 500 }
    );
  }
}
