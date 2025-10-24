import { NextRequest, NextResponse } from "next/server";

const PROJECT_TOPICS_ID = process.env.PROJECT_TOPICS_ID;
const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

interface HCSProject {
  event: string;
  projectId: string;
  taskCount: number;
  reward: number;
  tasks: Array<{
    taskId: number;
    ipfsHash: string;
  }>;
  timestamp: string;
  status?: string;
}

export const GET = async (req: NextRequest) => {
  try {
    if (!PROJECT_TOPICS_ID) {
      return NextResponse.json(
        { error: "Missing PROJECT_TOPICS_ID configuration" },
        { status: 500 }
      );
    }

    console.log(`📡 Fetching messages from Mirror Node for topic: ${PROJECT_TOPICS_ID}`);

    // Fetch messages from Hedera Mirror Node
    const response = await fetch(
      `${MIRROR_NODE_URL}/api/v1/topics/${PROJECT_TOPICS_ID}/messages?limit=100&order=desc`
    );

    if (!response.ok) {
      throw new Error(`Mirror Node API error: ${response.statusText}`);
    }

    const data = await response.json();
    const projectMap = new Map<string, HCSProject>();

    // Process messages (newest first)
    for (const msg of data.messages.reverse()) {
      try {
        const messageBytes = Buffer.from(msg.message, "base64");
        const messageString = messageBytes.toString("utf-8");
        const projectData: HCSProject = JSON.parse(messageString);

        console.log(`📨 Processing: ${projectData.event} - ${projectData.projectId}`);

        // Track the latest state of each project
        if (projectData.event === "new_project") {
          projectData.status = "open";
          projectData.timestamp = msg.consensus_timestamp;
          projectMap.set(projectData.projectId, projectData);
        } else if (projectData.event === "project_assigned") {
          const existing = projectMap.get(projectData.projectId);
          if (existing) {
            existing.status = "assigned";
          }
        } else if (projectData.event === "project_completed") {
          const existing = projectMap.get(projectData.projectId);
          if (existing) {
            existing.status = "completed";
          }
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    }

    // Convert map to array and filter for open projects
    const allProjects = Array.from(projectMap.values());
    const openProjects = allProjects.filter((p) => p.status === "open");

    console.log(`✅ Found ${allProjects.length} total projects, ${openProjects.length} open`);

    return NextResponse.json({
      success: true,
      projects: openProjects,
      totalProjects: allProjects.length,
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

// Enable caching for better performance
export const revalidate = 30; // Revalidate every 30 seconds
