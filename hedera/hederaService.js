require("dotenv").config();
const {
    Client,
    PrivateKey,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicMessageQuery
} = require("@hashgraph/sdk");


const operatorId = process.env.ACCOUNT_ID;
const operatorKeyHex = process.env.PRIVATE_KEY;

if (operatorId == null || operatorKeyHex == null) {
        throw new Error("Environment variables ACCOUNT_ID and HEX_ENCODED_PRIVATE_KEY must be present");
    }

const operatorKey = PrivateKey.fromString(operatorKeyHex);

const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);

/**
 * Creates a new HCS Topic to track events for an annotation project.
 * @returns {Promise<string>} The new Topic ID.
 */

async function createProjectTopic() {
    console.log("Creating a new HCS topic for the project...");

    // Create the transaction to create a new topic
    const transaction = new TopicCreateTransaction({
        topicMemo: `Annotation Project Events - ${new Date().toISOString()}`,
    });

    // Sign with the client operator private key and submit the transaction to a Hedera network
    const txResponse = await transaction.execute(client);

    // Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    // Get the topic ID from the receipt
    const topicId = receipt.topicId;

    console.log(`Success! New topic created with ID: ${topicId}`);

    return topicId.toString();
}

/**
 * Submits a structured message to a specific HCS Topic.
 * @param {string} topicId - The ID of the topic to submit the message to.
 * @param {object} eventPayload - A JSON object representing the event.
 * @returns {Promise<void>}
 */

async function submitEventMessage(topicId, eventPayload) {
    console.log(`Submitting event to topic ${topicId}:`, eventPayload);

    // Serialize the event payload to a string
    const message = JSON.stringify(eventPayload);

    // Create the transaction to submit a message to the topic
    const transaction = new TopicMessageSubmitTransaction({
        topicId: topicId,
        message: message,
    });

    // Sign with the client operator key and submit to a Hedera network
    const sendResponse = await transaction.execute(client);

    // Get the receipt of the transaction
    const receipt = await sendResponse.getReceipt(client);

    // Get the status of the transaction
    const transactionStatus = receipt.status;
    console.log(`Message submission status: ${transactionStatus.toString()}`);
    console.log(`New sequence number: ${receipt.topicSequenceNumber}`);
}

/**
 * Subscribes to an HCS topic and logs incoming messages.
 * @param {string} topicId - The ID of the topic to subscribe to.
 */

function subscribeToTopic(topicId) {
    console.log(`Subscribing to messages on topic ${topicId}...`);

    try {
        new TopicMessageQuery()
          .setTopicId(topicId)
          .setStartTime(0) // Start from the beginning of the topic's history
          .subscribe(
                client,
                (message) => {
                    const messageAsString = Buffer.from(message.contents, "utf8").toString();
                    console.log(
                        `${message.consensusTimestamp.toDate()} Received sequence #${message.sequenceNumber}: ${messageAsString}`
                    );
                    // In a real application, you would parse the JSON and trigger business logic here.
                },
                (error) => {
                    console.log(`Error during subscription: ${error}`);
                }
            );
    } catch (error) {
        console.error("Error setting up subscription:", error);
        process.exit(1);
    }
}