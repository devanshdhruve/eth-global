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

  constructor(public name: string, private topicIds: TopicIds) {}

  subscribeToProjects() {
    new TopicMessageQuery()
      .setTopicId(this.topicIds["projects-updates"])
      .subscribe(
        client,
        (message: TopicMessage | null, error: Error | null) => {
          if (error) console.error("HCS subscription error:", error);
        },
        (message: TopicMessage) => {
          if (!message || !message.contents) return;
          const msgJson: HcsProjectMessage = JSON.parse(
            Buffer.from(message.contents, "utf8").toString()
          );
          console.log(`[${this.name}] New project received:`, msgJson);
          this.availableProjects.push(msgJson);
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
      .execute(client);

    console.log(`[${this.name}] Submitted task for project ${projectId}`);
  }
}
