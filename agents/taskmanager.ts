import dotenv from 'dotenv';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { Client, PrivateKey } from '@hashgraph/sdk';
// @ts-ignore: moduleResolution for 'hedera-agent-kit' may require "node16"/"nodenext" in tsconfig; suppressing here.
// If you prefer a permanent fix, update tsconfig.json compilerOptions.moduleResolution to "node16" or "nodenext".
import { HederaLangchainToolkit, coreConsensusPlugin } from 'hedera-agent-kit';
import { ChatOpenAI } from '@langchain/openai';

// Load .env from repo root or current directory
dotenv.config();

// Task interface with IPFS hash
export interface Task {
  taskId: number;
  ipfsHash: string;
  raw?: any; // Original task data
}

export interface Project {
  projectId: string;
  taskCount: number;
  reward: number;
  // allow a failed state to represent assignment/screening failure
  status: "open" | "assigned" | "completed" | "failed";
  tasks: Task[]; // Array of tasks with IPFS hashes
  createdAt: Date;
  instruction: string;
}

export interface ProjectMessage {
  event: "new_project" | "project_assigned" | "project_completed" | "project_failed";
  projectId: string;
  taskCount: number;
  reward: number;
  tasks: Array<{
    taskId: number;
    ipfsHash: string;
  }>; // Include IPFS hashes in HCS message
  instruction?: string;
  timestamp: string;
}

export class TaskManagerAgent {
  private projects: Project[] = [];
  private agentExecutor!: AgentExecutor;
  private topicId: string;
  private client: Client;

  constructor(topicId?: string) {
    this.topicId = topicId || process.env.PROJECT_TOPICS_ID || "";
    
    const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY || process.env.HEDERA_TESTNET_OPERATOR_KEY;
    
    if (!operatorId || !operatorKey) {
      throw new Error("Missing HEDERA_TESTNET_ACCOUNT_ID or HEDERA_TESTNET_PRIVATE_KEY in environment variables");
    }
    
    this.client = Client.forTestnet().setOperator(
      operatorId,
      PrivateKey.fromStringECDSA(operatorKey)
    );
  }

  async initialize(): Promise<void> {
    try {
      const llm = new ChatOpenAI({ 
        model: 'gpt-4o-mini',
        temperature: 0.7
      });

      const hederaAgentToolkit = new HederaLangchainToolkit({
        client: this.client,
        configuration: {
          plugins: [coreConsensusPlugin]
        },
      });

      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system', 
          'You are a task management assistant that can submit messages to Hedera Consensus Service (HCS) topics. ' +
          'When asked to create or update projects, you should submit the project information including IPFS hashes to the specified topic ID. ' +
          'Always confirm successful operations and provide transaction details when available.'
        ],
        ['placeholder', '{chat_history}'],
        ['human', '{input}'],
        ['placeholder', '{agent_scratchpad}'],
      ]);

      const tools = hederaAgentToolkit.getTools();

      const agent = createToolCallingAgent({
        llm,
        tools,
        prompt,
      });

      this.agentExecutor = new AgentExecutor({
        agent,
        tools,
        verbose: true, 
      });

      console.log('✅ Task Manager Agent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize agent:', error);
      throw error;
    }
  }

  /**
   * Create a new project with IPFS task hashes
   */
  async createProject(
    projectId: string, 
    taskCount: number, 
    reward: number,
    tasks: Task[], // Accept tasks with IPFS hashes
    instruction: string
  ): Promise<Project> {
    try {
      // Validate task count matches
      if (tasks.length !== taskCount) {
        throw new Error(`Task count mismatch: expected ${taskCount}, got ${tasks.length}`);
      }

      const project: Project = { 
        projectId, 
        taskCount, 
        reward, 
        status: "open",
        tasks, // Store tasks with IPFS hashes
        createdAt: new Date(),
        instruction
      };
      
      this.projects.push(project);

      // Prepare message for HCS with IPFS hashes
      const message: ProjectMessage = {
        event: "new_project",
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

      // Use AI agent to submit message to HCS topic
      const response = await this.agentExecutor.invoke({
        input: `Submit a message to topic ${this.topicId} with the following content: ${messageJson}`
      });

      console.log(`\n✅ Project ${projectId} created and published to HCS`);
      console.log(`📊 Tasks: ${taskCount}, Reward: ${reward} HBAR`);
      console.log(`📦 IPFS Hashes: ${tasks.map(t => t.ipfsHash).join(', ')}`);
      console.log(`📝 Agent response:`, response.output);

      return project;
    } catch (error) {
      console.error(`❌ Failed to create project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update project status with IPFS hash reference
   */
  async updateProjectStatus(
    projectId: string, 
    status: "open" | "assigned" | "completed" | "failed"
  ): Promise<void> {
    const project = this.projects.find(p => p.projectId === projectId);
    
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    project.status = status;

    const message: ProjectMessage = {
      event: status === "assigned" ? "project_assigned" : status === "completed" ? "project_completed" : "project_failed",
      projectId,
      taskCount: project.taskCount,
      reward: project.reward,
      tasks: project.tasks.map(t => ({
        taskId: t.taskId,
        ipfsHash: t.ipfsHash
      })),
      instruction: project.instruction,
      timestamp: new Date().toISOString()
    };

    const response = await this.agentExecutor.invoke({
      input: `Submit a message to topic ${this.topicId} with content: ${JSON.stringify(message)}`
    });

    console.log(`✅ Project ${projectId} status updated to: ${status}`);
    console.log(`📝 Response:`, response.output);
  }

  /**
   * Get project with all task IPFS hashes
   */
  getProject(projectId: string): Project | undefined {
    return this.projects.find(p => p.projectId === projectId);
  }

  /**
   * Get all IPFS hashes for a project
   */
  getProjectTaskHashes(projectId: string): string[] {
    const project = this.getProject(projectId);
    return project ? project.tasks.map(t => t.ipfsHash) : [];
  }

  listProjects(status?: "open" | "assigned" | "completed"): Project[] {
    if (status) {
      return this.projects.filter(p => p.status === status);
    }
    return this.projects;
  }

  getStatistics() {
    return {
      total: this.projects.length,
      open: this.projects.filter(p => p.status === "open").length,
      assigned: this.projects.filter(p => p.status === "assigned").length,
      completed: this.projects.filter(p => p.status === "completed").length,
      totalReward: this.projects.reduce((sum, p) => sum + p.reward, 0),
      totalTasks: this.projects.reduce((sum, p) => sum + p.taskCount, 0)
    };
  }

  async createProjectsTopic(): Promise<string> {
    const response = await this.agentExecutor.invoke({
      input: "Create a new topic with memo 'Project Updates Topic' and return the topic ID"
    });

    console.log('✅ New topic created:', response.output);
    return response.output;
  }

  async cleanup(): Promise<void> {
    this.client.close();
    console.log('✅ Client connection closed');
  }
}
