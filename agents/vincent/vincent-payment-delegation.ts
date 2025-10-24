import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitAbility, LitActionResource } from "@lit-protocol/auth-helpers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import * as ethers from "ethers";

export interface VincentConfig {
  litNetwork: "datil-dev" | "datil-test" | "datil";
  privateKey: string; // Task creator's Ethereum private key
  hederaOperatorId: string; // Hedera account that will receive delegation
}

export class VincentPaymentDelegate {
  private litNodeClient: LitNodeClient;
  private wallet: ethers.Wallet;
  private contractClient: LitContracts;
  public pkpTokenId?: string;
  public pkpPublicKey?: string;

  constructor(private config: VincentConfig) {
    this.litNodeClient = new LitNodeClient({
      litNetwork: config.litNetwork,
      debug: false,
    });
    
    this.wallet = new ethers.Wallet(
      config.privateKey,
      new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com")
    );

    this.contractClient = new LitContracts({
      signer: this.wallet,
      network: config.litNetwork,
    });
  }

  async initialize() {
    await this.litNodeClient.connect();
    console.log("[Vincent] Connected to Lit Network");
  }

  /**
   * Step 1: Task creator mints a PKP (Programmable Key Pair) 
   * This PKP will have authority to approve payments
   */
  async createPaymentPKP(): Promise<{ tokenId: string; publicKey: string }> {
    console.log("[Vincent] Minting PKP for payment delegation...");
    
    const mintInfo = await this.contractClient.pkpNftContractUtils.write.mint();
    
    this.pkpTokenId = mintInfo.pkp.tokenId;
    this.pkpPublicKey = mintInfo.pkp.publicKey;

    console.log("[Vincent] PKP Created:");
    console.log("  Token ID:", this.pkpTokenId);
    console.log("  Public Key:", this.pkpPublicKey);

    return { tokenId: this.pkpTokenId, publicKey: this.pkpPublicKey };
  }

  /**
   * Step 2: Define the payment approval logic as a Lit Action
   * This action will check if the annotation is verified before approving payment
   */
  private getPaymentApprovalAction(): string {
    return `
      (async () => {
        // Payment approval logic
        const { annotatorId, taskId, amount, screeningStatus } = JSON.parse(actionParams);

        // Only approve if annotator passed screening
        if (screeningStatus !== "pass") {
          return Lit.Actions.setResponse({
            response: JSON.stringify({
              approved: false,
              reason: "Annotator did not pass screening"
            })
          });
        }

        // Verify amount is reasonable (e.g., max 100 HBAR per task)
        if (amount > 100) {
          return Lit.Actions.setResponse({
            response: JSON.stringify({
              approved: false,
              reason: "Amount exceeds maximum allowed"
            })
          });
        }

        // All checks passed - approve payment
        Lit.Actions.setResponse({
          response: JSON.stringify({
            approved: true,
            annotatorId,
            taskId,
            amount,
            timestamp: Date.now()
          })
        });
      })();
    `;
  }

  /**
   * Step 3: Delegate payment approval capability to the PaymentAgent
   * Creates a delegation signature that allows the agent to execute payments
   */
  async delegatePaymentAuthority(
    agentAddress: string,
    expirationDays: number = 30
  ): Promise<string> {
    if (!this.pkpTokenId) {
      throw new Error("PKP not created. Call createPaymentPKP() first.");
    }

    console.log("[Vincent] Creating delegation for PaymentAgent...");

    const capacityTokenId = await this.contractClient.mintCapacityCreditsNFT({
      requestsPerKilosecond: 10,
      daysUntilUTCMidnightExpiration: expirationDays,
    });

    console.log("[Vincent] Capacity NFT minted:", capacityTokenId);

    // Create delegation signature
    const { capacityDelegationAuthSig } = 
      await this.litNodeClient.createCapacityDelegationAuthSig({
        uses: "1000", // Number of times agent can request payment approval
        dAppOwnerWallet: this.wallet,
        capacityTokenId: capacityTokenId.toString(),
        delegateeAddresses: [agentAddress],
      });

    console.log("[Vincent] Delegation signature created for agent:", agentAddress);
    
    return JSON.stringify(capacityDelegationAuthSig);
  }

  /**
   * Step 4: PaymentAgent uses this to get approval before executing payment
   */
  async requestPaymentApproval(
    annotatorId: string,
    taskId: string,
    amount: number,
    screeningStatus: "pass" | "fail",
    capacityDelegationAuthSig: string
  ): Promise<{ approved: boolean; reason?: string }> {
    if (!this.pkpPublicKey) {
      throw new Error("PKP not initialized");
    }

    console.log(`[Vincent] Requesting payment approval for ${annotatorId}...`);

    const response = await this.litNodeClient.executeJs({
      code: this.getPaymentApprovalAction(),
      jsParams: {
        actionParams: JSON.stringify({
          annotatorId,
          taskId,
          amount,
          screeningStatus,
        }),
      },
      authSig: JSON.parse(capacityDelegationAuthSig),
      sessionSigs: await this.getSessionSigs(),
    });

    const result = JSON.parse(response.response as string);
    
    console.log("[Vincent] Payment approval result:", result);
    
    return result;
  }

  /**
   * Helper: Get session signatures for Lit Actions
   */
  private async getSessionSigs() {
    if (!this.pkpPublicKey) {
      throw new Error("PKP not initialized");
    }

    const sessionSigs = await this.litNodeClient.getSessionSigs({
      chain: "ethereum",
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
      resourceAbilityRequests: [
        {
          resource: new LitActionResource("*"),
          ability: LitAbility.LitActionExecution,
        },
      ],
      authNeededCallback: async ({ resourceAbilityRequests, expiration, uri }) => {
        const toSign = await this.litNodeClient.generateAuthSig({
          uri: uri!,
          expiration: expiration!,
          resources: resourceAbilityRequests!,
          walletAddress: this.wallet.address,
        });

        return toSign;
      },
    });

    return sessionSigs;
  }

  async disconnect() {
    await this.litNodeClient.disconnect();
    console.log("[Vincent] Disconnected from Lit Network");
  }
}