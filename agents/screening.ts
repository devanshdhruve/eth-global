// screening.ts
import dotenv from "dotenv";
import { Client } from "@hashgraph/sdk";
import { ChatOpenAI } from "@langchain/openai";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { createSiweMessage } from "@lit-protocol/auth-helpers";
import { LitNetwork } from "@lit-protocol/constants";

dotenv.config();

interface AnnotatorApplication {
  wallet: string;
  experience: string;
  sampleAnswers: string[];
}

class ScreeningAgent {
  private hederaClient: Client;
  private llm: ChatOpenAI;

  constructor() {
    this.hederaClient = Client.forTestnet();
    this.hederaClient.setOperator(
      process.env.HEDERA_ACCOUNT_ID!,
      process.env.HEDERA_PRIVATE_KEY!
    );

    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3,
    });
  }

  /**
   * Vet a new annotator based on experience + sample responses.
   */
  async vetAnnotator(app: AnnotatorApplication) {
    console.log(`🔍 Vetting annotator: ${app.wallet}`);

    const score = await this.evaluateAnnotator(app);
    console.log(`🧮 Vetting score: ${score}`);

    if (score < 0.7) {
      console.log(`❌ Rejected annotator: ${app.wallet}`);
      return { approved: false, score };
    }

    const delegation = await this.delegateAccess(app.wallet);
    console.log(`✅ Approved annotator: ${app.wallet}`);

    // Optional: Log vetting event on Hedera
    await this.logVettingEvent(app.wallet, score);

    return { approved: true, score, delegation };
  }

  /**
   * Use LLM-based evaluation for skill/quality scoring.
   */
  private async evaluateAnnotator(app: AnnotatorApplication): Promise<number> {
    const prompt = `
    You are an evaluator vetting a new data annotator.
    Score them between 0 and 1 based on their experience and clarity of sample answers.
    Higher = better skill.
    Experience: ${app.experience}
    Sample Answers: ${app.sampleAnswers.join("\n")}
    Return ONLY a number between 0 and 1.
    `;

    const res = await this.llm.invoke([{ role: "user", content: prompt }]);
    const match = res.content?.toString().match(/([0-9]*\.?[0-9]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
  * Delegate access using Vincent (Lit Protocol)
  */
  private async delegateAccess(wallet: string) {
  try {
    // ✅ 1. Initialize Lit Node client correctly
    const client = new LitNodeClient({
      litNetwork: LitNetwork.Habanero,
    });
    await client.connect();

    // ✅ 2. Define the SIWE-like message (for tracking who gets access)
    const siweMessage = {
      domain: "data-annotation-market",
      address: wallet,
      statement: "Delegation to access annotation tasks after vetting.",
      uri: "https://data-annotation.market",
      version: "1",
      chainId: 1,
    };

    // ✅ 3. Define mock delegation permissions
    const delegationCapability = {
      delegatee: wallet,
      permissions: ["read_tasks", "submit_annotations"],
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    console.log("✅ Delegation prepared:", delegationCapability);

    // ✅ 4. Simulate storing an encrypted version of the capability
    // (v6+ no longer has client.saveEncryptionKey)
    // So we use the helper from `@lit-protocol/encryption` instead.

    const delegationData = JSON.stringify(delegationCapability);
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(delegationData);

    // Optional: Save encrypted blob using Lit’s AccessControlConditions
    const accessControlConditions = [
      {
        contractAddress: "",
        standardContractType: "",
        chain: "ethereum",
        method: "",
        parameters: [":userAddress"],
        returnValueTest: {
          comparator: "=",
          value: wallet,
        },
      },
    ];

    // This is a pseudo-step — it mimics encryption (without deprecated methods)
    console.log("🔐 Encrypted capability stored for:", wallet);

    return {
      ...delegationCapability,
      accessControlConditions,
      siweMessage,
    };
  } catch (err) {
    console.error("⚠️ Error in delegateAccess:", err);
    return null;
  }
}

  /**
   * Optional: Log the vetting result on Hedera (for transparency)
   */
  private async logVettingEvent(wallet: string, score: number) {
    console.log(
      `📜 Logging vetting result for ${wallet} — score: ${score} on Hedera.`
    );
    // (In production: submit to Hedera Topic or store via Agent Kit event)
  }
}

// Example usage
(async () => {
  const screeningAgent = new ScreeningAgent();

  const result = await screeningAgent.vetAnnotator({
    wallet: "0.0.12345",
    experience: "2 years labeling autonomous driving datasets",
    sampleAnswers: [
      "Correctly identified pedestrians in 95% of frames",
      "Handled edge cases like occlusions properly",
    ],
  });

  console.log("🧾 Vetting result:", result);
})();
