import {
  Client,
  TopicCreateTransaction,
  PrivateKey,
  AccountId,
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function createHCSTopics() {
  const accountId = AccountId.fromString(process.env.HEDERA_TESTNET_ACCOUNT_ID!);
  const privateKey = PrivateKey.fromString(process.env.HEDERA_TESTNET_PRIVATE_KEY!);

  const client = Client.forTestnet().setOperator(accountId, privateKey);

  try {
    console.log("Creating HCS Topics...");

    // Tasks Topic
    const tasksTopicTx = await new TopicCreateTransaction()
      .setTopicMemo("Annotation Tasks Topic")
      .setAdminKey(privateKey.publicKey)
      .setSubmitKey(privateKey.publicKey)
      .execute(client);
    const tasksTopicReceipt = await tasksTopicTx.getReceipt(client);
    const tasksTopicId = tasksTopicReceipt.topicId;

    // Annotations Topic
    const annotationsTopicTx = await new TopicCreateTransaction()
      .setTopicMemo("Annotation Submissions Topic")
      .setAdminKey(privateKey.publicKey)
      .setSubmitKey(privateKey.publicKey)
      .execute(client);
    const annotationsTopicReceipt = await annotationsTopicTx.getReceipt(client);
    const annotationsTopicId = annotationsTopicReceipt.topicId;

    // Payments Topic
    const paymentsTopicTx = await new TopicCreateTransaction()
      .setTopicMemo("Payment Releases Topic")
      .setAdminKey(privateKey.publicKey)
      .setSubmitKey(privateKey.publicKey)
      .execute(client);
    const paymentsTopicReceipt = await paymentsTopicTx.getReceipt(client);
    const paymentsTopicId = paymentsTopicReceipt.topicId;

    console.log("✅ HCS Topics Created!");
    console.log(`Tasks Topic ID: ${tasksTopicId}`);
    console.log(`Annotations Topic ID: ${annotationsTopicId}`);
    console.log(`Payments Topic ID: ${paymentsTopicId}`);
    console.log("\nAdd these to your .env file:");
    console.log(`TASKS_TOPIC_ID=${tasksTopicId}`);
    console.log(`ANNOTATIONS_TOPIC_ID=${annotationsTopicId}`);
    console.log(`PAYMENTS_TOPIC_ID=${paymentsTopicId}`);

    return {
      tasksTopicId,
      annotationsTopicId,
      paymentsTopicId,
    };
  } catch (error) {
    console.error("Error creating topics:", error);
    throw error;
  } finally {
    client.close();
  }
}

createHCSTopics();