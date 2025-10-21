import { ethers } from "ethers";
import { createProjectTopic, submitEventMessage, subscribeToTopic } from "../../hedera/hederaService";
import * as crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config();

interface FeedbackData {
  projectId: string;
  taskId: string;
  annotator: string;
  reviewer: string;
  score: number; // 0-100
  comments: string;
  domain: string;
  timestamp: number;
}

interface ReputationScore {
  annotator: string;
  score: number; // 0-1000
  totalFeedback: number;
  averageScore: number;
  lastUpdate: number;
}

class ReputationAgent {
  private reputationContract: any;
  private hcsTopicId: string;
  private feedbackHistory: Map<string, FeedbackData[]> = new Map();
  private reputationScores: Map<string, ReputationScore> = new Map();

  constructor(contractAddress: string, hcsTopicId: string) {
    this.hcsTopicId = hcsTopicId;
    this.reputationContract = null; // Will be initialized in init()
  }

  async init() {
    // Initialize contract connection using ethers directly
    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.HEDERA_TESTNET_PRIVATE_KEY!, provider);
    
    // Load contract ABI (simplified - in production, load from artifacts)
    const contractABI = [
      "function anchorFeedback(address annotator, address reviewer, uint256 score, string hcsTopicId, bytes32 feedbackHash) external",
      "function updateReputation(address annotator, uint256 newScore, bytes32 merkleRoot) external",
      "function getReputation(address annotator) external view returns (uint256)"
    ];
    
    this.reputationContract = new ethers.Contract(
      process.env.REPUTATION_CONTRACT_ADDRESS!,
      contractABI,
      wallet
    );
    
    console.log("🤖 Reputation Agent initialized");
    console.log(`📋 Contract: ${await this.reputationContract.getAddress()}`);
    console.log(`📡 HCS Topic: ${this.hcsTopicId}`);
  }

  /**
   * Process feedback from HCS and update reputation
   */
  async processFeedback(feedback: FeedbackData) {
    console.log(`📝 Processing feedback for ${feedback.annotator} from ${feedback.reviewer}`);
    
    // Store feedback in memory
    if (!this.feedbackHistory.has(feedback.annotator)) {
      this.feedbackHistory.set(feedback.annotator, []);
    }
    this.feedbackHistory.get(feedback.annotator)!.push(feedback);
    
    // Calculate new reputation score
    const newScore = this.calculateReputationScore(feedback.annotator);
    
    // Create feedback hash for anchoring
    const feedbackHash = this.createFeedbackHash(feedback);
    
    // Anchor feedback to blockchain (for Blockscout visibility)
    await this.anchorFeedback(feedback, feedbackHash);
    
    // Update reputation score
    await this.updateReputation(feedback.annotator, newScore);
    
    console.log(`✅ Updated reputation for ${feedback.annotator}: ${newScore}/1000`);
  }

  /**
   * Calculate reputation score based on feedback history
   */
  private calculateReputationScore(annotator: string): number {
    const feedbacks = this.feedbackHistory.get(annotator) || [];
    if (feedbacks.length === 0) return 0;
    
    // Weighted average with time decay
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const feedback of feedbacks) {
      const age = Date.now() - feedback.timestamp;
      const weight = Math.max(0.1, 1 - (age / (365 * 24 * 60 * 60 * 1000))); // 1 year decay
      
      totalWeight += weight;
      weightedSum += feedback.score * weight;
    }
    
    const averageScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    // Convert to 0-1000 scale
    const reputationScore = Math.min(1000, Math.max(0, averageScore * 10));
    
    return Math.round(reputationScore);
  }

  /**
   * Create SHA-256 hash of feedback for anchoring
   */
  private createFeedbackHash(feedback: FeedbackData): string {
    const payload = JSON.stringify(feedback);
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Anchor feedback to blockchain for Blockscout visibility
   */
  private async anchorFeedback(feedback: FeedbackData, feedbackHash: string) {
    try {
      const tx = await this.reputationContract.anchorFeedback(
        feedback.annotator,
        feedback.reviewer,
        feedback.score,
        this.hcsTopicId,
        `0x${feedbackHash}`
      );
      
      await tx.wait();
      console.log(`🔗 Anchored feedback: ${tx.hash}`);
    } catch (error) {
      console.error("❌ Failed to anchor feedback:", error);
    }
  }

  /**
   * Update reputation score on blockchain
   */
  private async updateReputation(annotator: string, score: number) {
    try {
      // Create merkle root of all feedback (simplified)
      const feedbacks = this.feedbackHistory.get(annotator) || [];
      const merkleRoot = this.createMerkleRoot(feedbacks);
      
      const tx = await this.reputationContract.updateReputation(
        annotator,
        score,
        `0x${merkleRoot}`
      );
      
      await tx.wait();
      console.log(`📊 Updated reputation: ${tx.hash}`);
    } catch (error) {
      console.error("❌ Failed to update reputation:", error);
    }
  }

  /**
   * Create merkle root of feedback (simplified implementation)
   */
  private createMerkleRoot(feedbacks: FeedbackData[]): string {
    const hashes = feedbacks.map(f => 
      crypto.createHash('sha256').update(JSON.stringify(f)).digest('hex')
    );
    
    // Simple merkle root calculation
    let current = hashes;
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1] || current[i];
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        next.push(combined);
      }
      current = next;
    }
    
    return current[0] || '0';
  }

  /**
   * Start monitoring HCS for feedback
   */
  async startMonitoring() {
    console.log("🔍 Starting HCS monitoring...");
    
    // Subscribe to HCS topic for feedback
    subscribeToTopic(this.hcsTopicId);
    
    // Simulate receiving feedback (in real implementation, this would come from HCS)
    setInterval(() => {
      this.simulateFeedback();
    }, 30000); // Every 30 seconds
  }

  /**
   * Simulate feedback for testing
   */
  private simulateFeedback() {
    const annotators = [
      "0x1234567890123456789012345678901234567890",
      "0x2345678901234567890123456789012345678901",
      "0x3456789012345678901234567890123456789012"
    ];
    
    const reviewers = [
      "0x4567890123456789012345678901234567890123",
      "0x5678901234567890123456789012345678901234"
    ];
    
    const domains = ["image_classification", "text_annotation", "data_labeling"];
    
    const annotator = annotators[Math.floor(Math.random() * annotators.length)];
    const reviewer = reviewers[Math.floor(Math.random() * reviewers.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    const feedback: FeedbackData = {
      projectId: `project_${Date.now()}`,
      taskId: `task_${Math.random().toString(36).substr(2, 9)}`,
      annotator,
      reviewer,
      score: Math.floor(Math.random() * 40) + 60, // 60-100 range
      comments: `Good work on ${domain}`,
      domain,
      timestamp: Date.now()
    };
    
    this.processFeedback(feedback);
  }
}

// Main execution
async function main() {
  console.log("🚀 Starting Reputation Agent...");
  
  // Create HCS topic for feedback
  const topicId = await createProjectTopic();
  console.log(`📡 Created HCS topic: ${topicId}`);
  
  // Initialize agent
  const agent = new ReputationAgent(process.env.REPUTATION_CONTRACT_ADDRESS!, topicId);
  await agent.init();
  
  // Start monitoring
  await agent.startMonitoring();
  
  console.log("✅ Reputation Agent running...");
  console.log("Press Ctrl+C to stop");
}

main().catch((error) => {
  console.error("❌ Agent failed:", error);
  process.exit(1);
});
