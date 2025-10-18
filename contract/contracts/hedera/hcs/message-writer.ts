import {
  Client,
  TopicMessageSubmitTransaction,
  PrivateKey,
  AccountId,
  TopicId,
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

interface HCSMessage {
  event: string;
  projectId?: string;
  taskId?: string;
  annotatorAddress?: string;
  [key: string]: any;
}

export class HCSMessageWriter {
  private client: Client;

  constructor() {
    const accountId = AccountId.fromString(process.env.HEDERA_TESTNET_ACCOUNT_ID!);
    const privateKey = PrivateKey.fromString(process.env.HEDERA_TESTNET_PRIVATE_KEY!);
    this.client = Client.forTestnet().setOperator(accountId, privateKey);
  }

  async submitMessage(topicId: string, message: HCSMessage): Promise<string> {
    try {
      const messageString = JSON.stringify({
        ...message,
        timestamp: Date.now(),
      });

      const submitTx = await new TopicMessageSubmitTransaction()
        .setTopicId(TopicId.fromString(topicId))
        .setMessage(messageString)
        .execute(this.client);

      const receipt = await submitTx.getReceipt(this.client);
      const sequenceNumber = receipt.topicSequenceNumber;

      console.log(`✅ Message submitted to topic ${topicId}`);
      console.log(`Sequence number: ${sequenceNumber}`);

      return sequenceNumber.toString();
    } catch (error) {
      console.error("Error submitting message:", error);
      throw error;
    }
  }

  async submitTaskCreated(projectId: string, taskId: string, datasetHash: string) {
    const topicId = process.env.TASKS_TOPIC_ID!;
    return this.submitMessage(topicId, {
      event: "TASK_CREATED",
      projectId,
      taskId,
      datasetHash,
    });
  }

  async submitAnnotation(projectId: string, taskId: string, annotatorAddress: string, annotationHash: string) {
    const topicId = process.env.ANNOTATIONS_TOPIC_ID!;
    return this.submitMessage(topicId, {
      event: "ANNOTATION_SUBMITTED",
      projectId,
      taskId,
      annotatorAddress,
      annotationHash,
    });
  }

  async submitPayment(projectId: string, taskId: string, annotatorAddress: string, amount: string, txHash: string) {
    const topicId = process.env.PAYMENTS_TOPIC_ID!;
    return this.submitMessage(topicId, {
      event: "PAYMENT_RELEASED",
      projectId,
      taskId,
      annotatorAddress,
      amount,
      txHash,
    });
  }

  close() {
    this.client.close();
  }
}