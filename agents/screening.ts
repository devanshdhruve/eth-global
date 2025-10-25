import dotenv from "dotenv";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { Client, PrivateKey } from "@hashgraph/sdk";
import { HederaLangchainToolkit, coreConsensusPlugin } from "hedera-agent-kit";
import { ChatOpenAI } from "@langchain/openai";

dotenv.config({ path: "/Users/veerchheda/coding/ethonline/eth-global/hedera/.env" });

// ---------- INTERFACES ----------

export interface Annotator {
  walletAddress: string;
  name: string;
  score?: number;
  qualified?: boolean;
}

export interface ScreeningTest {
  projectId: string;
  testId: string;
  questions: string[];
  instruction: string;
  createdAt: Date;
}

export interface TestSubmission {
  annotator: Annotator;
  answers: string[];
  timestamp: string;
}

export interface ScreeningResult {
  projectId: string;
  qualifiedAnnotators: Annotator[];
  publishedAt: string;
}

// ---------- AGENT CLASS ----------

export class ScreeningAgent {
  private client: Client;
  private topicId: string;
  private agentExecutor!: AgentExecutor;
  private tests: ScreeningTest[] = [];

  constructor(topicId?: string) {
    this.topicId = topicId || process.env.SCREENING_TOPIC_ID || "";

    this.client = Client.forTestnet().setOperator(
      process.env.HEDERA_TESTNET_ACCOUNT_ID!,
      PrivateKey.fromStringECDSA(process.env.HEDERA_TESTNET_PRIVATE_KEY!)
    );
  }

  async initialize(): Promise<void> {
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.7,
    });

    const hederaToolkit = new HederaLangchainToolkit({
      client: this.client,
      configuration: {
        plugins: [coreConsensusPlugin],
      },
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `
        You are a screening agent that designs and evaluates tests for project annotators.
        - Based on the client's project instruction, create a test with 3–5 relevant questions.
        - Later, evaluate annotator answers and grade them from 0–100.
        - Only select annotators scoring above 70.
        `,
      ],
    ]);

    const agent = await createToolCallingAgent({
      llm,
      tools: hederaToolkit.getTools(),
      prompt,
    });

    this.agentExecutor = new AgentExecutor({
      agent,
      tools: hederaToolkit.getTools(),
    });

    console.log("✅ ScreeningAgent initialized");
  }

  // ---------- GENERATE TEST ----------
  async generateTest(projectId: string, instruction: string): Promise<ScreeningTest> {
    const response = await this.agentExecutor.invoke({
      input: `Create a screening test for project: "${instruction}"`,
    });

    const questions = this.extractQuestions(response.output);

    const test: ScreeningTest = {
      projectId,
      testId: `test_${Date.now()}`,
      instruction,
      questions,
      createdAt: new Date(),
    };

    this.tests.push(test);
    console.log("🧾 Screening test created for project:", projectId);
    return test;
  }

  // ---------- GRADE SUBMISSIONS ----------
  async gradeSubmissions(
    projectId: string,
    submissions: TestSubmission[]
  ): Promise<ScreeningResult> {
    const projectTest = this.tests.find((t) => t.projectId === projectId);
    if (!projectTest) throw new Error("Test not found for this project");

    const gradedAnnotators: Annotator[] = [];

    for (const submission of submissions) {
      const { annotator, answers } = submission;
      const response = await this.agentExecutor.invoke({
        input: `Grade this submission based on the project test.\n
        Questions: ${projectTest.questions}\n
        Answers: ${answers.join(", ")}\n
        Return a score (0-100) and a brief feedback.`,
      });

      const score = this.extractScore(response.output);
      gradedAnnotators.push({
        ...annotator,
        score,
        qualified: score >= 70,
      });
    }

    const qualified = gradedAnnotators.filter((a) => a.qualified);

    // publish to Hedera Consensus Service
    await this.agentExecutor.invoke({
      input: `Publish qualified annotators for project ${projectId} to Hedera Consensus Service: ${JSON.stringify(
        qualified
      )}`,
    });

    console.log("📜 Published screening results to Hedera");
    return {
      projectId,
      qualifiedAnnotators: qualified,
      publishedAt: new Date().toISOString(),
    };
  }

  // ---------- HELPERS ----------
  private extractQuestions(text: string): string[] {
    return text.split("\n").filter((q) => q.trim().length > 5);
  }

  private extractScore(text: string): number {
    const match = text.match(/(\d{1,3})/);
    return match ? Math.min(parseInt(match[1]), 100) : 0;
  }
}
