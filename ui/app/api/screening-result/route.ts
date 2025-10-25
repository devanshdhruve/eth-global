// /app/api/screening-result/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  Client,
  PrivateKey,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";

// Ensure environment variables are loaded
// import * as dotenv from "dotenv";
// dotenv.config({ path: '/Users/veerchheda/coding/ethonline/eth-global/ui/.env' });

export async function POST(req: NextRequest) {
  // 1. Get Operator Account Details from .env
  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  const screeningTopicId = process.env.SCREENING_TOPICS_ID;

  if (!operatorId || !operatorKey || !screeningTopicId) {
    console.error("Environment variables OPERATOR_ID, OPERATOR_PVKEY, or SCREENING_TOPIC_ID are not set.");
    return NextResponse.json(
      { success: false, error: "Server configuration error." },
      { status: 500 }
    );
  }

  try {
    // 2. Configure the Hedera Client
    const client = Client.forTestnet(); // Or Client.forMainnet()
    client.setOperator(operatorId, PrivateKey.fromStringECDSA(operatorKey));

    // 3. Parse the incoming request body
    const { projectId, userId, score, status } = await req.json();

    if (!projectId || !userId || score === undefined || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields in request body." },
        { status: 400 }
      );
    }
    
    // 4. Create the HCS message payload
    const messagePayload = {
      type: "SCREENING_RESULT",
      projectId,
      userId,
      score,
      status, // 'passed' or 'failed'
      timestamp: new Date().toISOString(),
    };

    // 5. Create and execute the HCS transaction
    const transaction = await new TopicMessageSubmitTransaction({
      topicId: screeningTopicId,
      message: JSON.stringify(messagePayload),
    }).execute(client);
    
    // 6. Get the receipt to confirm success
    const receipt = await transaction.getReceipt(client);
    const transactionStatus = receipt.status;

    console.log(`✅ HCS message submitted with status: ${transactionStatus.toString()}`);
    console.log(`Payload: ${JSON.stringify(messagePayload)}`);

    return NextResponse.json(
      { success: true, status: transactionStatus.toString() },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Failed to submit message to HCS:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred." },
      { status: 500 }
    );
  }
}