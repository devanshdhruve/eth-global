// lib/projectUpload.ts - Updated with Delegation Token Support

import { Client, PrivateKey, TopicMessageSubmitTransaction } from '@hashgraph/sdk';

export type TaskStatus = "pending" | "assigned" | "in_progress" | "submitted" | "verified" | "rejected";
export type ProjectStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface Task {
  taskId: number;
  ipfsHash: string;
  status: TaskStatus;
  assignedTo?: string;
  submittedAt?: string;
  verifiedAt?: string;
  raw?: any;
}

export interface ProjectOwner {
  accountId: string;
  walletAddress?: string;
  name?: string;
  email?: string;
}

// 🆕 UPDATED: Added delegationToken field
export interface Project {
  projectId: string;
  projectName?: string;
  instruction?: string;
  owner: ProjectOwner;
  taskCount: number;
  reward: number;
  status: ProjectStatus;
  tasks: Task[];
  createdAt: Date;
  updatedAt?: Date;
  category?: string;
  delegationToken?: string; // 🆕 NEW: Payment delegation token
}

// 🆕 UPDATED: Added delegation fields to HCS messages
export interface ProjectMessage {
  event: "new_project" | "task_updated" | "project_status_changed";
  projectId: string;
  projectName?: string;
  instruction?: string;
  owner: ProjectOwner;
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
  
  // 🆕 NEW: Delegation fields
  delegationToken?: string;
  hasDelegation?: boolean;

  updatedTask?: {
    taskId: number;
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
    updatedBy?: string;
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

  calculateProjectStatus(tasks: Task[]): ProjectStatus {
    if (tasks.length === 0) return "open";

    const stats = this.getTaskStatusStats(tasks);

    if (stats.verified === stats.total) {
      return "completed";
    }

    if (stats.assigned > 0 || stats.in_progress > 0 || stats.submitted > 0) {
      return "in_progress";
    }

    if (stats.pending === stats.total) {
      return "open";
    }

    return "in_progress";
  }

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
   * 🆕 UPDATED: Submit project to HCS WITH delegation token
   */
  async submitProjectToHCS(project: Project): Promise<string> {
    try {
      const tasksWithStatus = project.tasks.map(t => ({
        ...t,
        status: t.status || "pending" as TaskStatus
      }));

      const projectStatus = this.calculateProjectStatus(tasksWithStatus);

      // 🆕 Create HCS message with delegation token
      const message: ProjectMessage = {
        event: "new_project",
        projectId: project.projectId,
        projectName: project.projectName,
        instruction: project.instruction,
        owner: project.owner,
        taskCount: project.taskCount,
        reward: project.reward,
        projectStatus,
        category: project.category,
        
        // 🆕 INCLUDE DELEGATION TOKEN
        delegationToken: project.delegationToken,
        hasDelegation: !!project.delegationToken,
        
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
      console.log(`🔐 Delegation: ${project.delegationToken ? 'YES' : 'NO'}`);
      console.log(`📝 Transaction ID: ${transaction.transactionId.toString()}`);
      console.log(`⏰ Consensus timestamp: ${receipt.consensusTimestamp?.toString()}`);
      console.log(`📊 Project Status: ${projectStatus}`);

      return transaction.transactionId.toString();
    } catch (error) {
      console.error('❌ Failed to submit to HCS:', error);
      throw error;
    }
  }

  async updateTaskStatus(
    project: Project,
    taskId: number,
    newStatus: TaskStatus,
    updatedBy?: string,
    assignedTo?: string
  ): Promise<string> {
    try {
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

      const projectStatus = this.calculateProjectStatus(updatedTasks);

      const message: ProjectMessage = {
        event: "task_updated",
        projectId: project.projectId,
        projectName: project.projectName,
        instruction: project.instruction,
        owner: project.owner,
        taskCount: project.taskCount,
        reward: project.reward,
        projectStatus,
        category: project.category,
        
        // 🆕 Include delegation in updates too
        delegationToken: project.delegationToken,
        hasDelegation: !!project.delegationToken,
        
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
          updatedBy,
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
      annotatorAddress,
      annotatorAddress
    );
  }

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
      verifiedBy || project.owner.accountId
    );
  }

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
      rejectedBy || project.owner.accountId
    );
  }

  isProjectOwner(project: Project, userAccountId: string): boolean {
    return project.owner.accountId === userAccountId || 
           project.owner.walletAddress === userAccountId;
  }

  async getProjectsByOwner(projects: Project[], ownerAccountId: string): Project[] {
    return projects.filter(p => 
      p.owner.accountId === ownerAccountId || 
      p.owner.walletAddress === ownerAccountId
    );
  }

  getProjectCompletion(tasks: Task[]): number {
    return this.getTaskStatusStats(tasks).completionRate;
  }

  isProjectComplete(tasks: Task[]): boolean {
    return this.calculateProjectStatus(tasks) === "completed";
  }

  getAvailableTasks(tasks: Task[]): Task[] {
    return tasks.filter(t => t.status === "pending");
  }

  getAnnotatorTasks(tasks: Task[], annotatorAddress: string): Task[] {
    return tasks.filter(t => t.assignedTo === annotatorAddress);
  }

  cleanup() {
    this.client.close();
  }
}

// 🆕 NEW: Utility function to retrieve project delegation from HCS
export async function getProjectDelegation(
  projectId: string,
  topicId: string
): Promise<string | null> {
  try {
    console.log(`🔍 Fetching delegation for project: ${projectId}`);
    
    // Query Hedera Mirror Node
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`Mirror node query failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.messages || data.messages.length === 0) {
      console.log('⚠️ No messages found in topic');
      return null;
    }
    
    // Find the project creation message
    for (const msg of data.messages.reverse()) { // Reverse to get latest first
      try {
        const messageData: ProjectMessage = JSON.parse(
          Buffer.from(msg.message, 'base64').toString('utf-8')
        );
        
        if (
          messageData.projectId === projectId &&
          messageData.event === "new_project" &&
          messageData.delegationToken
        ) {
          console.log(`✅ Found delegation token for project ${projectId}`);
          return messageData.delegationToken;
        }
      } catch (e) {
        // Skip invalid messages
        continue;
      }
    }
    
    console.log(`⚠️ No delegation found for project ${projectId}`);
    return null;
  } catch (error: any) {
    console.error('❌ Failed to fetch delegation from HCS:', error);
    throw error;
  }
}

// 🆕 NEW: Utility to get full project from HCS
export async function getProjectFromHCS(
  projectId: string,
  topicId: string
): Promise<Project | null> {
  try {
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`Mirror node query failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Find latest project message
    for (const msg of data.messages.reverse()) {
      try {
        const messageData: ProjectMessage = JSON.parse(
          Buffer.from(msg.message, 'base64').toString('utf-8')
        );
        
        if (messageData.projectId === projectId) {
          const project: Project = {
            projectId: messageData.projectId,
            projectName: messageData.projectName,
            instruction: messageData.instruction,
            owner: messageData.owner,
            taskCount: messageData.taskCount,
            reward: messageData.reward,
            status: messageData.projectStatus,
            category: messageData.category,
            delegationToken: messageData.delegationToken, // 🆕 Include delegation
            tasks: messageData.tasks.map(t => ({
              taskId: t.taskId,
              ipfsHash: t.ipfsHash,
              status: t.status,
              assignedTo: t.assignedTo,
            })),
            createdAt: new Date(messageData.timestamp),
          };
          
          return project;
        }
      } catch (e) {
        continue;
      }
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Failed to fetch project from HCS:', error);
    throw error;
  }
}