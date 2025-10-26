import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  Client,
  PrivateKey,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";

const TASK_COMPLETION_TOPIC_ID = process.env.COMPLETION_TOPICS_ID;
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
  walletAddress: string; 
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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const body: AnnotationSubmission = await req.json();
    const { projectId, taskId, annotation, walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Wallet address was not provided in the request body." 
        },
        { status: 400 }
      );
    }
    
    if (!projectId || taskId === undefined || !annotation || !annotation.label) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: projectId, taskId, annotation.label" 
        },
        { status: 400 }
      );
    }

    const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;

    if (!operatorId || !operatorKey || !TASK_COMPLETION_TOPIC_ID || !SCREENING_TOPIC_ID) {
      console.error("Missing environment variables for Hedera configuration");
      return NextResponse.json(
        { success: false, error: "Server configuration error." },
        { status: 500 }
      );
    }

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

    const client = Client.forTestnet();
    client.setOperator(operatorId, PrivateKey.fromStringECDSA(operatorKey));

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

    const transaction = await new TopicMessageSubmitTransaction({
      topicId: TASK_COMPLETION_TOPIC_ID,
      message: JSON.stringify(messagePayload),
    }).execute(client);

    const receipt = await transaction.getReceipt(client);
    const transactionStatus = receipt.status;

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
    console.error("Failed to submit annotation:", error);
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