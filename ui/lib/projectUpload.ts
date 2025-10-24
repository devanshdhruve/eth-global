import { Client, PrivateKey, TopicMessageSubmitTransaction } from '@hashgraph/sdk';

export interface Task {
  taskId: number;
  ipfsHash: string;
  raw?: any;
}

export interface Project {
  projectId: string;
  taskCount: number;
  reward: number;
  status: "open" | "assigned" | "completed";
  tasks: Task[];
  createdAt: Date;
}

export interface ProjectMessage {
  event: "new_project" | "project_assigned" | "project_completed";
  projectId: string;
  taskCount: number;
  reward: number;
  tasks: Array<{
    taskId: number;
    ipfsHash: string;
  }>;
  timestamp: string;
}

/**
 * Lightweight server-side task manager without AI agent
 */
export class TaskManagerServer {
  private client: Client;
  private topicId: string;

  constructor(topicId: string, accountId: string, privateKey: string) {
    this.topicId = topicId;
    this.client = Client.forTestnet().setOperator(
      accountId,
      PrivateKey.fromStringECDSA(privateKey)
    );
  }

  /**
   * Submit project to HCS directly (no AI agent needed)
   */
  async submitProjectToHCS(project: Project): Promise<string> {
    try {
      const message: ProjectMessage = {
        event: "new_project",
        projectId: project.projectId,
        taskCount: project.taskCount,
        reward: project.reward,
        tasks: project.tasks.map(t => ({
          taskId: t.taskId,
          ipfsHash: t.ipfsHash
        })),
        timestamp: new Date().toISOString()
      };

      const messageJson = JSON.stringify(message);
      const messageBuffer = Buffer.from(messageJson);

      const transaction = await new TopicMessageSubmitTransaction()
        .setTopicId(this.topicId)
        .setMessage(messageBuffer)
        .execute(this.client);

      const receipt = await transaction.getReceipt(this.client);

      console.log(`✅ Project submitted to HCS topic ${this.topicId}`);
      console.log(`📝 Transaction ID: ${transaction.transactionId.toString()}`);
      console.log(`⏰ Consensus timestamp: ${receipt.consensusTimestamp?.toString()}`);

      return transaction.transactionId.toString();
    } catch (error) {
      console.error('❌ Failed to submit to HCS:', error);
      throw error;
    }
  }

  /**
   * Update project status on HCS
   */
  async updateProjectStatusOnHCS(
    projectId: string,
    status: "open" | "assigned" | "completed",
    tasks: Task[],
    taskCount: number,
    reward: number
  ): Promise<string> {
    try {
      const message: ProjectMessage = {
        event: status === "assigned" ? "project_assigned" : "project_completed",
        projectId,
        taskCount,
        reward,
        tasks: tasks.map(t => ({
          taskId: t.taskId,
          ipfsHash: t.ipfsHash
        })),
        timestamp: new Date().toISOString()
      };

      const messageJson = JSON.stringify(message);
      const messageBuffer = Buffer.from(messageJson);

      const transaction = await new TopicMessageSubmitTransaction()
        .setTopicId(this.topicId)
        .setMessage(messageBuffer)
        .execute(this.client);

      const receipt = await transaction.getReceipt(this.client);

      console.log(`✅ Status update submitted to HCS`);
      console.log(`📝 Transaction ID: ${transaction.transactionId.toString()}`);

      return transaction.transactionId.toString();
    } catch (error) {
      console.error('❌ Failed to update status on HCS:', error);
      throw error;
    }
  }

  cleanup() {
    this.client.close();
  }
}
