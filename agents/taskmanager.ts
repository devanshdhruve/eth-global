import dotenv from 'dotenv';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { Client, PrivateKey } from '@hashgraph/sdk';
import { HederaLangchainToolkit, coreConsensusPlugin } from 'hedera-agent-kit';
import { ChatOpenAI } from '@langchain/openai';

dotenv.config();

export interface Project {
  projectId: string;
  taskCount: number;
  reward: number;
  status: "open" | "assigned" | "completed";
  createdAt: Date;
}

export interface ProjectMessage {
  event: "new_project" | "project_assigned" | "project_completed";
  projectId: string;
  taskCount: number;
  reward: number;
  timestamp: string;
}

export class TaskManagerAgent {
  private projects: Project[] = [];
  private agentExecutor!: AgentExecutor;
  private topicId: string;
  private client: Client;

  constructor(topicId?: string) {
    this.topicId = topicId || process.env.PROJECTS_TOPIC_ID || "";
    
    // Initialize Hedera client
    this.client = Client.forTestnet().setOperator(
      process.env.HEDERA_TESTNET_ACCOUNT_ID!,
      PrivateKey.fromStringECDSA(process.env.HEDERA_TESTNET_PRIVATE_KEY!)
    );
  }


  async initialize(): Promise<void> {
    try {
      // Initialize AI model
      const llm = new ChatOpenAI({ 
        model: 'gpt-4o-mini',
        temperature: 0.7
      });

      // Initialize Hedera Agent Toolkit with consensus plugin
      const hederaAgentToolkit = new HederaLangchainToolkit({
        client: this.client,
        configuration: {
          plugins: [coreConsensusPlugin] // Enables HCS operations
        },
      });


      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system', 
          'You are a task management assistant that can submit messages to Hedera Consensus Service (HCS) topics. ' +
          'When asked to create or update projects, you should submit the project information to the specified topic ID. ' +
          'Always confirm successful operations and provide transaction details when available.'
        ],
        ['placeholder', '{chat_history}'],
        ['human', '{input}'],
        ['placeholder', '{agent_scratchpad}'],
      ]);

      // Get tools from toolkit
      const tools = hederaAgentToolkit.getTools();

      // Create agent
      const agent = createToolCallingAgent({
        llm,
        tools,
        prompt,
      });

      // Create executor
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


  async createProject(
    projectId: string, 
    taskCount: number, 
    reward: number
  ): Promise<Project> {
    try {

      const project: Project = { 
        projectId, 
        taskCount, 
        reward, 
        status: "open",
        createdAt: new Date()
      };
      

      this.projects.push(project);

      // Prepare message for HCS
      const message: ProjectMessage = {
        event: "new_project",
        projectId,
        taskCount,
        reward,
        timestamp: new Date().toISOString()
      };

      const messageJson = JSON.stringify(message);

      // Use AI agent to submit message to HCS topic
      const response = await this.agentExecutor.invoke({
        input: `Submit a message to topic ${this.topicId} with the following content: ${messageJson}`
      });

      console.log(`\n✅ Project ${projectId} created and published to HCS`);
      console.log(`📊 Tasks: ${taskCount}, Reward: ${reward} HBAR`);
      console.log(`📝 Agent response:`, response.output);

      return project;
    } catch (error) {
      console.error(`❌ Failed to create project ${projectId}:`, error);
      throw error;
    }
  }


  async updateProjectStatus(
    projectId: string, 
    status: "open" | "assigned" | "completed"
  ): Promise<void> {
    const project = this.projects.find(p => p.projectId === projectId);
    
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    project.status = status;

    const message: ProjectMessage = {
      event: status === "assigned" ? "project_assigned" : "project_completed",
      projectId,
      taskCount: project.taskCount,
      reward: project.reward,
      timestamp: new Date().toISOString()
    };

    const response = await this.agentExecutor.invoke({
      input: `Submit a message to topic ${this.topicId} with content: ${JSON.stringify(message)}`
    });

    console.log(`✅ Project ${projectId} status updated to: ${status}`);
    console.log(`📝 Response:`, response.output);
  }

  /**
   * List projects by status
   */
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
      totalReward: this.projects.reduce((sum, p) => sum + p.reward, 0)
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
