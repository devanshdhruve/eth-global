import { Client, TopicCreateTransaction } from "@hashgraph/sdk";
import * as dotenv from "dotenv";
// Load .env from repository root or working directory. Avoid hardcoded absolute paths.
dotenv.config();

// console.log("Account:", process.env.HEDERA_TESTNET_ACCOUNT_ID);
// console.log("Private Key:", process.env.HEDERA_TESTNET_OPERATOR_KEY)

export const client = Client.forTestnet();
const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID || process.env.HEDERA_TESTNET_CLIENT_ID;
const operatorKey = process.env.HEDERA_TESTNET_OPERATOR_KEY || process.env.HEDERA_TESTNET_PRIVATE_KEY || process.env.HEDERA_TESTNET_PVKEY;
if (!operatorId || !operatorKey) {
  console.warn("Hedera operator ID or key not set — make sure your .env contains HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_OPERATOR_KEY");
} else {
  client.setOperator(operatorId, operatorKey);
}

export interface TopicIds {
  [key: string]: string;
}

export async function createTopics(): Promise<TopicIds> {
  const topics = ["projects-updates", "screening-results", "task-assignments", "task-completion", "payments"];
  const topicIds: TopicIds = {};

  for (const t of topics) {
    const tx = await new TopicCreateTransaction().execute(client);
    const receipt = await tx.getReceipt(client);
    topicIds[t] = receipt.topicId!.toString();
  }

  console.log("Created HCS Topics:", topicIds);
  return topicIds;
}
