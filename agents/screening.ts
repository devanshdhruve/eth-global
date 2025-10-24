import { TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { client, TopicIds } from "../hedera/hcs/topics";

export interface ScreeningResultMessage {
  event: string;
  annotator: string;
  status: "pass" | "fail";
}

export class ScreeningAgent {
  constructor(private topicIds: TopicIds) {}

  async evaluateAnnotator(annotatorName: string, testScore: number): Promise<"pass" | "fail"> {
    const status: "pass" | "fail" = testScore >= 70 ? "pass" : "fail";
    const message: ScreeningResultMessage = {
      event: "screening_result",
      annotator: annotatorName,
      status
    };

    await new TopicMessageSubmitTransaction()
      .setTopicId(this.topicIds["screening-results"])
      .setMessage(Buffer.from(JSON.stringify(message)))
      .execute(client);

    console.log(`Screening result for ${annotatorName}: ${status}`);
    return status;
  }
}
