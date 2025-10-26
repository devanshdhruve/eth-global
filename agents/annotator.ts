import { TopicMessageQuery, Client, TopicMessage, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { client, TopicIds } from "../hedera/hcs/topics";

export interface HcsProjectMessage {
  event: string;
  projectId: string;
  taskCount: number;
  reward: number;
}

export class AnnotatorAgent {
  public availableProjects: HcsProjectMessage[] = [];
  // wallet address / unique id used in screening messages
  public walletAddress: string;
  // screening status: 'pending' | 'pass' | 'fail'
  public screeningStatus: "pending" | "pass" | "fail" = "pending";

  constructor(public name: string, walletAddress: string, private topicIds: TopicIds) {
    this.walletAddress = walletAddress;
  }

  subscribeToProjects() {
    new TopicMessageQuery()
      .setTopicId(this.topicIds["projects-updates"])
      .subscribe(
        client as unknown as Client,
        (message: TopicMessage | null, error: Error | null) => {
          if (error) console.error("HCS subscription error:", error);
        },
        (message: TopicMessage) => {
          if (!message || !message.contents) return;
          const contentsStr = typeof (message.contents as any) === "string"
            ? (message.contents as unknown as string)
            : typeof TextDecoder !== "undefined"
              ? new TextDecoder().decode(message.contents as Uint8Array)
              : Buffer.from(message.contents as unknown as Uint8Array).toString("utf8");
          const msgJson: HcsProjectMessage = JSON.parse(contentsStr);
          console.log(`[${this.name}] New project received:`, msgJson);
          this.availableProjects.push(msgJson);
        }
      );
  }

  /**
   * Subscribe to screening results topic and update local screeningStatus
   */
  subscribeToScreening() {
    if (!this.topicIds["screening-results"]) return;

    new TopicMessageQuery()
      .setTopicId(this.topicIds["screening-results"])
      .subscribe(
        client as unknown as Client,
        (message: TopicMessage | null, error: Error | null) => {
          if (error) console.error("Screening HCS subscription error:", error);
        },
        (message: TopicMessage) => {
          if (!message || !message.contents) return;
          try {
            const contentsStr = typeof (message.contents as any) === "string"
              ? (message.contents as unknown as string)
              : typeof TextDecoder !== "undefined"
                ? new TextDecoder().decode(message.contents as Uint8Array)
                : Buffer.from(message.contents as unknown as Uint8Array).toString("utf8");

            const payload = JSON.parse(contentsStr);
            // expected payload: { type: 'SCREENING_RESULT', projectId, userId, score, status }
            if (payload.userId && payload.userId === this.walletAddress) {
              if (payload.status === "passed") {
                this.screeningStatus = "pass";
                console.log(`[${this.name}] Screening passed for project ${payload.projectId}`);
              } else {
                this.screeningStatus = "fail";
                console.log(`[${this.name}] Screening failed for project ${payload.projectId}`);
              }
            }
          } catch (err) {
            console.error("Failed to parse screening message:", err);
          }
        }
      );
  }
  async submitTask(projectId: string) {
    const message = Buffer.from(JSON.stringify({
      event: "task_completed",
      annotator: this.name,
      projectId
    }));

    await new TopicMessageSubmitTransaction()
      .setTopicId(this.topicIds["task-completion"])
      .setMessage(message)
      .execute(client as unknown as Client);

    console.log(`[${this.name}] Submitted task for project ${projectId}`);
  }
}
