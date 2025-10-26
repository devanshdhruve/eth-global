// /app/api/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const PROJECT_TOPICS_ID = process.env.PROJECT_TOPICS_ID;
const SCREENING_TOPIC_ID = process.env.SCREENING_TOPICS_ID;
const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

// Interfaces remain the same
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

interface HCSScreeningResult {
  type: "SCREENING_RESULT";
  projectId: string;
  userId: string;
  score: number;
  status: 'passed' | 'failed';
  timestamp: string;
}

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

    // --- Step 1: Fetch and process all projects (No change here) ---
    console.log(`📡 Fetching project messages from topic: ${PROJECT_TOPICS_ID}`);
    const projectMessages = await fetchTopicMessages(PROJECT_TOPICS_ID);
    const projectMap = new Map<string, HCSProject>();

    // Process projects oldest to newest to get correct final state
    for (const msg of projectMessages.reverse()) {
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

    // --- Step 2: Fetch screening results for the provided user ID ---

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
    
    // ✅ FIX: Use a Map to store the *most recent* screening status for the user.
    const screeningStatusMap = new Map<string, 'passed' | 'failed'>();

    // Process messages newest to oldest (default API order)
    for (const msg of screeningMessages) {
      try {
        const messageString = Buffer.from(msg.message, "base64").toString("utf-8");
        const resultData: HCSScreeningResult = JSON.parse(messageString);

        // Check if the result is for the current user
        if (resultData.userId === userId) {
          // ✅ FIX: Only add to map if we don't have a status yet.
          // Since we process newest-first, this captures the *most recent* attempt.
          if (!screeningStatusMap.has(resultData.projectId)) {
            screeningStatusMap.set(resultData.projectId, resultData.status);
          }
        }
        // ✅ FIX: Removed incorrect `else` block that logged spam.
      } catch (err) {
        console.warn("Could not parse a screening message:", err);
      }
      // ✅ FIX: Removed redundant log from inside the loop.
    }

    // ✅ FIX: New summary log based on the Map's contents.
    let passes = 0;
    let fails = 0;
    for (const status of screeningStatusMap.values()) {
        if (status === 'passed') passes++;
        if (status === 'failed') fails++;
    }
    console.log(`✅ User ${userId} has ${passes} passed and ${fails} failed projects (based on most recent attempts).`);


    // --- Step 3: Categorize projects into "available" and "myProjects" ---
    const availableProjects: HCSProject[] = [];
    const myProjects: Array<{ project: HCSProject; screeningStatus: 'passed' | 'failed' }> = [];

    // ✅ FIX: Updated categorization logic to use the Map.
    for (const project of allOpenProjects) {
      const userStatus = screeningStatusMap.get(project.projectId);

      if (userStatus === 'passed') {
        // User's most recent attempt was a pass
        myProjects.push({ project, screeningStatus: 'passed' });
      } else if (userStatus === 'failed') {
        // User's most recent attempt was a fail
        myProjects.push({ project, screeningStatus: 'failed' });
      } else {
        // userStatus is undefined, so user hasn't attempted this project
        availableProjects.push(project);
      }
    }

    // --- Step 4: Return the structured response (No change here) ---
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
