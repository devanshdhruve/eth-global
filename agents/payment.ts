import { TransferTransaction, Hbar } from "@hashgraph/sdk";
import { client } from "../hedera/hcs/topics";
import { VincentPaymentDelegate } from "../agents/vincent/vincent-payment-delegation";

export class PaymentAgentWithVincent {
  private vincentDelegate: VincentPaymentDelegate;
  private delegationAuthSig?: string;

  constructor(
    private topicIds: { [key: string]: string },
    vincentConfig: {
      litNetwork: "datil-dev" | "datil-test" | "datil";
      privateKey: string;
      hederaOperatorId: string;
    }
  ) {
    this.vincentDelegate = new VincentPaymentDelegate(vincentConfig);
  }

  /**
   * Initialize Vincent and set up delegation
   * Call this once at startup
   */
  async initializeVincentDelegation(agentEthAddress: string) {
    console.log("[PaymentAgent] Initializing Vincent delegation...");
    
    await this.vincentDelegate.initialize();
    
    // Create PKP for payment authority
    const pkp = await this.vincentDelegate.createPaymentPKP();
    console.log("[PaymentAgent] PKP created:", pkp.tokenId);
    
    // Delegate authority to this agent
    this.delegationAuthSig = await this.vincentDelegate.delegatePaymentAuthority(
      agentEthAddress,
      30 // 30 days expiration
    );
    
    console.log("[PaymentAgent] Delegation complete! Agent can now approve payments.");
  }

  /**
   * Pay annotator with Vincent approval
   * This replaces your original payAnnotator method
   */
  async payAnnotatorWithApproval(
    annotatorAccountId: string,
    amountHbar: number,
    taskId: string,
    screeningStatus: "pass" | "fail"
  ): Promise<boolean> {
    if (!this.delegationAuthSig) {
      throw new Error("Vincent delegation not initialized. Call initializeVincentDelegation() first.");
    }

    console.log(`[PaymentAgent] Requesting Vincent approval for payment...`);

    // Step 1: Request approval from Vincent
    const approval = await this.vincentDelegate.requestPaymentApproval(
      annotatorAccountId,
      taskId,
      amountHbar,
      screeningStatus,
      this.delegationAuthSig
    );

    // Step 2: Only execute payment if approved
    if (!approval.approved) {
      console.log(`[PaymentAgent] ❌ Payment denied: ${approval.reason}`);
      return false;
    }

    console.log(`[PaymentAgent] ✅ Payment approved by Vincent`);

    // Step 3: Execute the Hedera payment
    try {
      const tx = await new TransferTransaction()
        .addHbarTransfer(client.operatorAccountId!, Hbar.fromTinybars(-amountHbar * 100_000_000))
        .addHbarTransfer(annotatorAccountId, Hbar.fromTinybars(amountHbar * 100_000_000))
        .setTransactionMemo(`Task:${taskId} - Vincent Approved`)
        .execute(client);

      await tx.getReceipt(client);

      console.log(`[PaymentAgent] 💰 Paid ${amountHbar} HBAR to ${annotatorAccountId} for task ${taskId}`);
      return true;
    } catch (error) {
      console.error("[PaymentAgent] Payment execution failed:", error);
      return false;
    }
  }

  /**
   * Legacy method (without Vincent) - kept for backward compatibility
   */
  async payAnnotator(annotatorAccountId: string, amountHbar: number, taskId: string) {
    console.warn("[PaymentAgent] ⚠️ Using legacy payment without Vincent approval!");
    
    const tx = await new TransferTransaction()
      .addHbarTransfer(client.operatorAccountId!, Hbar.fromTinybars(-amountHbar * 100_000_000))
      .addHbarTransfer(annotatorAccountId, Hbar.fromTinybars(amountHbar * 100_000_000))
      .execute(client);

    await tx.getReceipt(client);
    console.log(`[PaymentAgent] Paid ${amountHbar} HBAR to ${annotatorAccountId} for task ${taskId}`);
  }

  async cleanup() {
    await this.vincentDelegate.disconnect();
  }
}