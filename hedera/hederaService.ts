import dotenv from "dotenv";
import {
    Client,
    PrivateKey,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicMessageQuery,
    TopicId,
    TopicInfoQuery,
    TransactionReceipt,
    Status
} from "@hashgraph/sdk";

dotenv.config({ path: '/Users/veerchheda/coding/ethonline/eth-global/hedera/.env' });

const operatorId = process.env.ACCOUNT_ID;
const operatorKeyHex = process.env.PRIVATE_KEY;

if (!operatorId || !operatorKeyHex) {
    throw new Error("Environment variables ACCOUNT_ID and PRIVATE_KEY must be present");
}

let operatorKey: PrivateKey;
// Prefer ECDSA parser for 0x-hex private keys; fall back to generic parser for DER/ED25519 strings
if (operatorKeyHex.startsWith("0x")) {
    operatorKey = PrivateKey.fromStringECDSA(operatorKeyHex);
} else {
    operatorKey = PrivateKey.fromString(operatorKeyHex);
}

const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);

/**
 * Creates a new HCS Topic to track events for an annotation project.
 * @returns {Promise<string>} The new Topic ID.
 */
export async function createProjectTopic(): Promise<string> {
    console.log("Creating a new HCS topic for the project...");

    const transaction = new TopicCreateTransaction({
        topicMemo: `Annotation Project Events - ${new Date().toISOString()}`,
    });

    const txResponse = await transaction.execute(client);
    const receipt: TransactionReceipt = await txResponse.getReceipt(client);
    const topicId: TopicId | null = receipt.topicId ?? null;

    if (!topicId) {
        throw new Error("Failed to create topic: topicId not found in receipt");
    }

    console.log(`✅ Success! New topic created with ID: ${topicId.toString()}`);
    return topicId.toString();
}

/**
 * Submits a structured message to a specific HCS Topic.
 * @param topicId - The ID of the topic to submit the message to.
 * @param eventPayload - A JSON object representing the event.
 */
export async function submitEventMessage(
    topicId: string,
    eventPayload: Record<string, any>
): Promise<void> {
    console.log(`Submitting event to topic ${topicId}:`, eventPayload);

    const message = JSON.stringify(eventPayload);

    const transaction = new TopicMessageSubmitTransaction({
        topicId: TopicId.fromString(topicId),
        message,
    });

    const sendResponse = await transaction.execute(client);
    const receipt: TransactionReceipt = await sendResponse.getReceipt(client);

    const transactionStatus: Status = receipt.status;
    console.log(`📨 Message submission status: ${transactionStatus.toString()}`);
    console.log(`🧾 New sequence number: ${receipt.topicSequenceNumber?.toString()}`);
}

/**
 * Subscribes to an HCS topic and logs incoming messages.
 * @param topicId - The ID of the topic to subscribe to.
 */
export function subscribeToTopic(topicId: string): void {
    console.log(`Subscribing to messages on topic ${topicId}...`);

    try {
        // Ensure topic exists on network (mirror propagation can take a moment)
        (async () => {
            const maxAttempts = 6; // ~1+2+4+8+16+32 = ~63s worst case
            let delayMs = 1000;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    await new TopicInfoQuery().setTopicId(TopicId.fromString(topicId)).execute(client);
                    break; // Exists
                } catch (e) {
                    await new Promise((res) => setTimeout(res, delayMs));
                    delayMs = Math.min(delayMs * 2, 8000);
                    if (attempt === maxAttempts - 1) throw e;
                }
            }

            // Helper to establish subscription with recent startTime
            const establishSubscription = () => {
                const startTime = new Date(Date.now() - 1000); // 1s ago
                new TopicMessageQuery()
                    .setTopicId(TopicId.fromString(topicId))
                    .setStartTime(startTime)
                    .subscribe(
                        client,
                        (message) => {
                            try {
                                if (!message) {
                                    console.warn("Received null message");
                                    return;
                                }
                                const messageAsString = new TextDecoder("utf-8").decode(message.contents);
                                const consensusDate = message.consensusTimestamp ? message.consensusTimestamp.toDate() : undefined;
                                const sequence = message.sequenceNumber ?? "unknown";
                                console.log(`${consensusDate} — Received sequence #${sequence}: ${messageAsString}`);
                            } catch (e) {
                                console.error("Listener error while handling message:", e);
                            }
                        },
                        (error) => {
                            // Some SDK versions surface message-like objects here on decoding issues; handle gracefully
                            const maybeMsg = error as unknown as { contents?: Uint8Array };
                            if (maybeMsg && maybeMsg.contents) {
                                try {
                                    const decoded = new TextDecoder("utf-8").decode(maybeMsg.contents);
                                    console.log(`Recovered message from error path: ${decoded}`);
                                    return;
                                } catch {}
                            }
                            const details = (error instanceof Error) ? `${error.name}: ${error.message}` : String(error);
                            console.error(`❌ Error during subscription: ${details}`);
                            setTimeout(establishSubscription, 1500);
                        }
                    );
            };

            establishSubscription();
        })();
    } catch (error) {
        console.error("Error setting up subscription:", error);
        process.exit(1);
    }
}
