import { Client, TopicCreateTransaction } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config({ path: '/Users/veerchheda/coding/ethonline/eth-global/hedera/.env' });

// console.log("Account:", process.env.HEDERA_TESTNET_ACCOUNT_ID);
// console.log("Private Key:", process.env.HEDERA_TESTNET_OPERATOR_KEY)

export const client = Client.forTestnet();
client.setOperator(process.env.HEDERA_TESTNET_ACCOUNT_ID!, process.env.HEDERA_TESTNET_OPERATOR_KEY!);

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
