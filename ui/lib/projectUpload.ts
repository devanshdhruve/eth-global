import { Client, PrivateKey, TopicMessageSubmitTransaction } from '@hashgraph/sdk';

export type TaskStatus = "pending" | "assigned" | "in_progress" | "submitted" | "verified" | "rejected";
export type ProjectStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface Task {
  taskId: number;
  ipfsHash: string;
  status: TaskStatus;
  assignedTo?: string; // Wallet address or account ID
  submittedAt?: string;
  verifiedAt?: string;
  raw?: any;
}

export interface ProjectOwner {
  accountId: string; // Hedera account ID (e.g., "0.0.12345")
  walletAddress?: string; // EVM wallet address if applicable
  name?: string; // Optional display name
  email?: string; // Optional contact email
}

export interface Project {
  projectId: string;
  projectName?: string; // Human-readable project name
  description?: string; // Project description
  owner: ProjectOwner; // ✅ Added owner information
  taskCount: number;
  reward: number;
  status: ProjectStatus;
  tasks: Task[];
  createdAt: Date;
  updatedAt?: Date;
  category?: string; // e.g., "Healthcare", "NLP", etc.
}

export interface ProjectMessage {
  event: "new_project" | "task_updated" | "project_status_changed";
  projectId: string;
  projectName?: string;
  description?: string;
  owner: ProjectOwner; // ✅ Include owner in HCS messages
  taskCount: number;
  reward: number;
  tasks: Array<{
    taskId: number;
    ipfsHash: string;
    status: TaskStatus;
    assignedTo?: string;
  }>;
  projectStatus: ProjectStatus;
  timestamp: string;
  category?: string;
  // Optional: Include specific task update info
  updatedTask?: {
    taskId: number;
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
    updatedBy?: string; // Who updated the task
  };
}

export interface TaskStatusStats {
  total: number;
  pending: number;
  assigned: number;
  in_progress: number;
  submitted: number;
  verified: number;
  rejected: number;
  completionRate: number;
}

/**
 * Lightweight server-side task manager with task-level status tracking
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
   * Calculate project status based on task statuses
   */
  calculateProjectStatus(tasks: Task[]): ProjectStatus {
    if (tasks.length === 0) return "open";

    const stats = this.getTaskStatusStats(tasks);

    // If all tasks are verified, project is completed
    if (stats.verified === stats.total) {
      return "completed";
    }

    // If any task is assigned or in progress, project is in progress
    if (stats.assigned > 0 || stats.in_progress > 0 || stats.submitted > 0) {
      return "in_progress";
    }

    // If all tasks are pending, project is open
    if (stats.pending === stats.total) {
      return "open";
    }

    // Mixed state or some verified - in progress
    return "in_progress";
  }

  /**
   * Get statistics about task statuses
   */
  getTaskStatusStats(tasks: Task[]): TaskStatusStats {
    const stats: TaskStatusStats = {
      total: tasks.length,
      pending: 0,
      assigned: 0,
      in_progress: 0,
      submitted: 0,
      verified: 0,
      rejected: 0,
      completionRate: 0,
    };

    tasks.forEach(task => {
      switch (task.status) {
        case "pending":
          stats.pending++;
          break;
        case "assigned":
          stats.assigned++;
          break;
        case "in_progress":
          stats.in_progress++;
          break;
        case "submitted":
          stats.submitted++;
          break;
        case "verified":
          stats.verified++;
          break;
        case "rejected":
          stats.rejected++;
          break;
      }
    });

    stats.completionRate = stats.total > 0 
      ? Math.round((stats.verified / stats.total) * 100) 
      : 0;

    return stats;
  }

  /**
   * Submit project to HCS with owner information
   */
  async submitProjectToHCS(project: Project): Promise<string> {
    try {
      // Ensure all tasks have a status (default to pending if not set)
      const tasksWithStatus = project.tasks.map(t => ({
        ...t,
        status: t.status || "pending" as TaskStatus
      }));

      // Calculate project status
      const projectStatus = this.calculateProjectStatus(tasksWithStatus);

      const message: ProjectMessage = {
        event: "new_project",
        projectId: project.projectId,
        projectName: project.projectName,
        description: project.description,
        owner: project.owner, // ✅ Include owner info
        taskCount: project.taskCount,
        reward: project.reward,
        projectStatus,
        category: project.category,
        tasks: tasksWithStatus.map(t => ({
          taskId: t.taskId,
          ipfsHash: t.ipfsHash,
          status: t.status,
          assignedTo: t.assignedTo,
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
      console.log(`👤 Owner: ${project.owner.accountId}`);
      console.log(`📝 Transaction ID: ${transaction.transactionId.toString()}`);
      console.log(`⏰ Consensus timestamp: ${receipt.consensusTimestamp?.toString()}`);
      console.log(`📊 Project Status: ${projectStatus}`);

      return transaction.transactionId.toString();
    } catch (error) {
      console.error('❌ Failed to submit to HCS:', error);
      throw error;
    }
  }

  /**
   * Update a single task's status and publish to HCS
   */
  async updateTaskStatus(
    project: Project,
    taskId: number,
    newStatus: TaskStatus,
    updatedBy?: string, // Who is updating (annotator or owner)
    assignedTo?: string
  ): Promise<string> {
    try {
      // Find and update the task
      const taskIndex = project.tasks.findIndex(t => t.taskId === taskId);
      if (taskIndex === -1) {
        throw new Error(`Task ${taskId} not found in project ${project.projectId}`);
      }

      const oldStatus = project.tasks[taskIndex].status;
      const updatedTasks = [...project.tasks];
      
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        status: newStatus,
        assignedTo: assignedTo || updatedTasks[taskIndex].assignedTo,
        ...(newStatus === "submitted" && { submittedAt: new Date().toISOString() }),
        ...(newStatus === "verified" && { verifiedAt: new Date().toISOString() }),
      };

      // Calculate new project status
      const projectStatus = this.calculateProjectStatus(updatedTasks);

      const message: ProjectMessage = {
        event: "task_updated",
        projectId: project.projectId,
        projectName: project.projectName,
        description: project.description,
        owner: project.owner, // ✅ Always include owner
        taskCount: project.taskCount,
        reward: project.reward,
        projectStatus,
        category: project.category,
        tasks: updatedTasks.map(t => ({
          taskId: t.taskId,
          ipfsHash: t.ipfsHash,
          status: t.status,
          assignedTo: t.assignedTo,
        })),
        updatedTask: {
          taskId,
          oldStatus,
          newStatus,
          updatedBy, // Track who made the update
        },
        timestamp: new Date().toISOString()
      };

      const messageJson = JSON.stringify(message);
      const messageBuffer = Buffer.from(messageJson);

      const transaction = await new TopicMessageSubmitTransaction()
        .setTopicId(this.topicId)
        .setMessage(messageBuffer)
        .execute(this.client);

      const receipt = await transaction.getReceipt(this.client);

      console.log(`✅ Task ${taskId} status updated: ${oldStatus} → ${newStatus}`);
      console.log(`👤 Updated by: ${updatedBy || 'system'}`);
      console.log(`📊 Project Status: ${projectStatus}`);
      console.log(`📝 Transaction ID: ${transaction.transactionId.toString()}`);

      return transaction.transactionId.toString();
    } catch (error) {
      console.error('❌ Failed to update task status:', error);
      throw error;
    }
  }

  /**
   * Assign a task to an annotator
   */
  async assignTask(
    project: Project,
    taskId: number,
    annotatorAddress: string
  ): Promise<string> {
    console.log(`📝 Assigning task ${taskId} to ${annotatorAddress}`);
    return this.updateTaskStatus(
      project,
      taskId,
      "assigned",
      annotatorAddress, // The annotator is doing the assignment
      annotatorAddress
    );
  }

  /**
   * Mark task as in progress
   */
  async startTask(
    project: Project,
    taskId: number,
    annotatorAddress: string
  ): Promise<string> {
    console.log(`🚀 Starting task ${taskId}`);
    return this.updateTaskStatus(
      project,
      taskId,
      "in_progress",
      annotatorAddress
    );
  }

  /**
   * Submit completed task
   */
  async submitTask(
    project: Project,
    taskId: number,
    annotatorAddress: string
  ): Promise<string> {
    console.log(`📤 Submitting task ${taskId}`);
    return this.updateTaskStatus(
      project,
      taskId,
      "submitted",
      annotatorAddress
    );
  }

  /**
   * Verify and approve a task (owner only)
   */
  async verifyTask(
    project: Project,
    taskId: number,
    verifiedBy?: string
  ): Promise<string> {
    console.log(`✅ Verifying task ${taskId}`);
    return this.updateTaskStatus(
      project,
      taskId,
      "verified",
      verifiedBy || project.owner.accountId // Default to owner
    );
  }

  /**
   * Reject a task (owner only)
   */
  async rejectTask(
    project: Project,
    taskId: number,
    rejectedBy?: string
  ): Promise<string> {
    console.log(`❌ Rejecting task ${taskId}`);
    return this.updateTaskStatus(
      project,
      taskId,
      "rejected",
      rejectedBy || project.owner.accountId // Default to owner
    );
  }

  /**
   * Check if user is the project owner
   */
  isProjectOwner(project: Project, userAccountId: string): boolean {
    return project.owner.accountId === userAccountId || 
           project.owner.walletAddress === userAccountId;
  }

  /**
   * Get all projects by owner
   */
  async getProjectsByOwner(projects: Project[], ownerAccountId: string): Project[] {
    return projects.filter(p => 
      p.owner.accountId === ownerAccountId || 
      p.owner.walletAddress === ownerAccountId
    );
  }

  /**
   * Get project completion percentage
   */
  getProjectCompletion(tasks: Task[]): number {
    return this.getTaskStatusStats(tasks).completionRate;
  }

  /**
   * Check if project is fully completed
   */
  isProjectComplete(tasks: Task[]): boolean {
    return this.calculateProjectStatus(tasks) === "completed";
  }

  /**
   * Get available (pending) tasks
   */
  getAvailableTasks(tasks: Task[]): Task[] {
    return tasks.filter(t => t.status === "pending");
  }

  /**
   * Get tasks assigned to a specific annotator
   */
  getAnnotatorTasks(tasks: Task[], annotatorAddress: string): Task[] {
    return tasks.filter(t => t.assignedTo === annotatorAddress);
  }

  cleanup() {
    this.client.close();
  }
}
