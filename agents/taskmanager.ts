import { TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { client, TopicIds } from "../hedera/hcs/topics";

export interface Project {
  projectId: string;
  taskCount: number;
  reward: number;
  status: "open" | "assigned" | "completed";
}

export class TaskManagerAgent {
  private projects: Project[] = [];
  constructor(private topicIds: TopicIds) {}

  async createProject(projectId: string, taskCount: number, reward: number) {
    const project: Project = { projectId, taskCount, reward, status: "open" };
    this.projects.push(project);

    const message = Buffer.from(JSON.stringify({
      event: "new_project",
      projectId,
      taskCount,
      reward
    }));

    await new TopicMessageSubmitTransaction()
      .setTopicId(this.topicIds["projects-updates"])
      .setMessage(message)
      .execute(client);

    console.log(`Project ${projectId} created and published to HCS.`);
  }

  listProjects(): Project[] {
    return this.projects.filter(p => p.status === "open");
  }
}
