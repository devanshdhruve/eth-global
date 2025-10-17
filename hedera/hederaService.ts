// src/hederaService.ts
import "dotenv/config";
import {
    Client,
    PrivateKey,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicMessageQuery,
    TopicId
} from "@hashgraph/sdk";

const operatorId = process.env.ACCOUNT_ID;
const operatorKeyHex = process.env.HEX_ENCODED_PRIVATE_KEY;

if (!operatorId ||!operatorKeyHex) {
    throw new Error("Environment variables ACCOUNT_ID and HEX_ENCODED_PRIVATE_KEY must be present");
}

const operatorKey = PrivateKey.fromString(operatorKeyHex);

const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);

export async function createProjectTopic(): Promise<string> {
    console.log("Creating a new HCS topic for the project...");
    const transaction = new TopicCreateTransaction({
        topicMemo: `Annotation Project Events - ${new Date().toISOString()}`,
    });
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const topicId = receipt.topicId as TopicId;
    console.log(`Success! New topic created with ID: ${topicId}`);
    return topicId.toString();
}

export async function submitEventMessage(topicId: string, eventPayload: object): Promise<void> {
    console.log(`Submitting event to topic ${topicId}:`, eventPayload);
    const message = JSON.stringify(eventPayload);
    const transaction = new TopicMessageSubmitTransaction({
        topicId: topicId,
        message: message,
    });
    const sendResponse = await transaction.execute(client);
    const receipt = await sendResponse.getReceipt(client);
    const transactionStatus = receipt.status;
    console.log(`Message submission status: ${transactionStatus.toString()}`);
}

export function subscribeToTopic(topicId: string): void {
    console.log(`Subscribing to messages on topic ${topicId}...`);
    try {
        new TopicMessageQuery()
           .setTopicId(topicId)
           .setStartTime(0)
           .subscribe(
                client,
                (message) => {
                    const messageAsString = Buffer.from(message.contents, "utf8").toString();
                    console.log(
                        `${message.consensusTimestamp.toDate()} Received: ${messageAsString}`
                    );
                },
                (error) => {
                    console.log(`Error during subscription: ${error.message}`);
                }
            );
    } catch (error: any) {
        console.error(`Error setting up subscription: ${error.message}`);
        process.exit(1);
    }
}