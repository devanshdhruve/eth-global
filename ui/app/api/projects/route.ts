// /app/api/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const PROJECT_TOPICS_ID = process.env.PROJECT_TOPICS_ID;
// NEW: Add your screening topic ID from .env
const SCREENING_TOPIC_ID = process.env.SCREENING_TOPICS_ID; 
const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

// Define the structure of a project message
interface HCSProject {
  event: string;
  projectId: string;
  taskCount: number;
  instruction: string;
  reward: number;
  tasks: Array<{
    taskId: number;
    ipfsHash: string;
  }>;
  timestamp: string;
  status?: string;
}

// Define the structure of a screening result message
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

export const GET = async (req: NextRequest) => {
  try {
    if (!PROJECT_TOPICS_ID || !SCREENING_TOPIC_ID) {
      return NextResponse.json(
        { error: "Missing PROJECT_TOPICS_ID or SCREENING_TOPIC_ID configuration" },
        { status: 500 }
      );
    }

    // --- Step 1: Fetch and process all projects ---
    console.log(`📡 Fetching project messages from topic: ${PROJECT_TOPICS_ID}`);
    const projectMessages = await fetchTopicMessages(PROJECT_TOPICS_ID);
    const projectMap = new Map<string, HCSProject>();

    for (const msg of projectMessages.reverse()) { // Process oldest first
      try {
        const messageString = Buffer.from(msg.message, "base64").toString("utf-8");
        const projectData: HCSProject = JSON.parse(messageString);

        if (projectData.event === "new_project") {
          projectData.status = "open";
          projectData.timestamp = msg.consensus_timestamp;
          projectMap.set(projectData.projectId, projectData);
        } else if (projectData.event === "project_completed") {
          const existing = projectMap.get(projectData.projectId);
          if (existing) existing.status = "completed";
        } else if (projectData.event === "project_failed") {
          const existing = projectMap.get(projectData.projectId);
          if (existing) existing.status = "failed";
        }
      } catch (err) {
        console.warn("Could not parse a project message:", err);
      }
    }

  const allProjects = Array.from(projectMap.values());
  const allOpenProjects = allProjects.filter((p) => p.status === "open");
  console.log(`✅ Found ${allOpenProjects.length} open projects (total projects: ${allProjects.length}).`);

    // --- Step 2: Fetch and process screening results for the current user ---
    
    // Get the authenticated user ID from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }
    
    console.log(`📡 Fetching screening results from topic: ${SCREENING_TOPIC_ID}`);
    const screeningMessages = await fetchTopicMessages(SCREENING_TOPIC_ID);
  const passedProjectIds = new Set<string>();
  const failedProjectIds = new Set<string>();

    for (const msg of screeningMessages) {
        try {
            const messageString = Buffer.from(msg.message, "base64").toString("utf-8");
            const resultData: HCSScreeningResult = JSON.parse(messageString);

      // Check if the result is for the current user and record pass/fail
      if (resultData.userId === userId) {
        if (resultData.status === 'passed') passedProjectIds.add(resultData.projectId);
        if (resultData.status === 'failed') failedProjectIds.add(resultData.projectId);
      }
        } catch(err) {
            console.warn("Could not parse a screening message:", err);
        }
    }
  console.log(`✅ User ${userId} has passed screening for ${passedProjectIds.size} projects and failed ${failedProjectIds.size} projects.`);


    // --- Step 3: Categorize projects into "available" and "myProjects" ---
  const availableProjects: HCSProject[] = [];
  // myProjects will include per-user screeningStatus metadata
  const myProjects: Array<{ project: HCSProject; screeningStatus: 'passed' | 'failed' }> = [];

  for (const project of allOpenProjects) {
    if (passedProjectIds.has(project.projectId)) {
      // If the user has a 'passed' record for this project, it's theirs
      myProjects.push({ project, screeningStatus: 'passed' });
    } else if (failedProjectIds.has(project.projectId)) {
      // If the user failed screening for this project, include it as failed
      myProjects.push({ project, screeningStatus: 'failed' });
    } else {
      // Otherwise, it's available for them to screen
      availableProjects.push(project);
    }
  }

    // --- Step 4: Return the structured response ---
    return NextResponse.json({
      success: true,
      projects: {
        available: availableProjects,
        myProjects: myProjects,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("❌ Error fetching projects:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch projects from Hedera",
        message: err.message,
      },
      { status: 500 }
    );
  }
};

// Revalidate every 30 seconds
export const revalidate = 30;