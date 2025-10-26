// /app/api/projects/route.ts

import { NextRequest, NextResponse } from "next/server";

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
        }
      } catch (err) {
        console.warn("Could not parse a project message:", err);
      }
    }

    const allOpenProjects = Array.from(projectMap.values()).filter((p) => p.status === "open");
    console.log(`✅ Found ${allOpenProjects.length} open projects.`);

    // --- Step 2: Fetch screening results for the provided user ID ---
    
    // MODIFIED: Get the userId from the request's query parameters
    const { searchParams } = new URL(req.url);
    const currentUserId = searchParams.get("userId");
    
    const passedProjectIds = new Set<string>();

    // NEW: Only fetch screening results if a userId is provided
    if (currentUserId) {
        console.log(`📡 Fetching screening results for user: ${currentUserId}`);
        const screeningMessages = await fetchTopicMessages(SCREENING_TOPIC_ID);

        for (const msg of screeningMessages) {
            try {
                const messageString = Buffer.from(msg.message, "base64").toString("utf-8");
                const resultData: HCSScreeningResult = JSON.parse(messageString);

                // Check if the result is for the current user and if they passed
                if (resultData.userId.toLowerCase() === currentUserId.toLowerCase() && resultData.status === 'passed') {
                    passedProjectIds.add(resultData.projectId);
                }
            } catch(err) {
                console.warn("Could not parse a screening message:", err);
            }
        }
        console.log(`✅ User ${currentUserId} has passed screening for ${passedProjectIds.size} projects.`);
    } else {
        console.log("⚠️ No userId provided; skipping 'myProjects' lookup.");
    }


    // --- Step 3: Categorize projects (No change in logic) ---
    const availableProjects: HCSProject[] = [];
    const myProjects: HCSProject[] = [];

    for (const project of allOpenProjects) {
        if (passedProjectIds.has(project.projectId)) {
            myProjects.push(project);
        } else {
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

export const revalidate = 30;