// /app/api/annotations/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  Client,
  PrivateKey,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";

const TASK_COMPLETION_TOPIC_ID = process.env.TASK_COMPLETION_TOPIC_ID;
const SCREENING_TOPIC_ID = process.env.SCREENING_TOPICS_ID;
const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

interface HCSScreeningResult {
  type: "SCREENING_RESULT";
  projectId: string;
  userId: string;
  status: 'passed' | 'failed';
}

interface AnnotationSubmission {
  projectId: string;
  taskId: number;
  annotation: {
    label: string;
    notes?: string;
    confidence?: number;
  };
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

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Get user's wallet address from Clerk metadata
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const walletAddress = user.publicMetadata?.walletAddress as string | undefined;

    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Wallet address not found. Please set up your wallet in profile settings." 
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body: AnnotationSubmission = await req.json();
    const { projectId, taskId, annotation } = body;

    if (!projectId || taskId === undefined || !annotation || !annotation.label) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: projectId, taskId, annotation.label" 
        },
        { status: 400 }
      );
    }

    // Validate environment variables
    const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;

    if (!operatorId || !operatorKey || !TASK_COMPLETION_TOPIC_ID || !SCREENING_TOPIC_ID) {
      console.error("Missing environment variables for Hedera configuration");
      return NextResponse.json(
        { success: false, error: "Server configuration error." },
        { status: 500 }
      );
    }

    // Step 1: Verify user passed screening for this project
    console.log(`📡 Verifying screening status for user ${userId} on project ${projectId}...`);
    const screeningMessages = await fetchTopicMessages(SCREENING_TOPIC_ID);
    
    let userPassed = false;

    for (const msg of screeningMessages) {
      try {
        const messageString = Buffer.from(msg.message, "base64").toString("utf-8");
        const resultData: HCSScreeningResult = JSON.parse(messageString);

        if (resultData.projectId === projectId && 
            resultData.userId === userId && 
            resultData.status === 'passed') {
          userPassed = true;
          break;
        }
      } catch (err) {
        console.warn("Could not parse a screening message:", err);
      }
    }

    if (!userPassed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Access denied - You must pass the screening test for this project first" 
        },
        { status: 403 }
      );
    }

    console.log(`✅ User has passed screening for project ${projectId}`);

    // Step 2: Configure Hedera client
    const client = Client.forTestnet();
    client.setOperator(operatorId, PrivateKey.fromStringECDSA(operatorKey));

    // Step 3: Create structured message payload
    const messagePayload = {
      type: "TASK_COMPLETED",
      projectId,
      taskId,
      userId,
      walletAddress,
      annotation: {
        label: annotation.label,
        notes: annotation.notes || "",
        confidence: annotation.confidence || 100,
      },
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    console.log(`📝 Submitting annotation for task ${taskId} in project ${projectId}...`);

    // Step 4: Submit to HCS
    const transaction = await new TopicMessageSubmitTransaction({
      topicId: TASK_COMPLETION_TOPIC_ID,
      message: JSON.stringify(messagePayload),
    }).execute(client);

    // Step 5: Get receipt
    const receipt = await transaction.getReceipt(client);
    const transactionStatus = receipt.status;

    console.log(`✅ Annotation submitted with status: ${transactionStatus.toString()}`);
    console.log(`Transaction ID: ${transaction.transactionId?.toString()}`);

    return NextResponse.json({
      success: true,
      status: transactionStatus.toString(),
      transactionId: transaction.transactionId?.toString(),
      message: "Annotation submitted successfully",
      data: {
        projectId,
        taskId,
        timestamp: messagePayload.timestamp,
      },
    });

  } catch (error: any) {
    console.error("❌ Failed to submit annotation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to submit annotation",
        message: error.message || "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
