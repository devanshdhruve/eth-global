import { ethers } from "ethers";
import { DelegationRequest, PaymentDelegation } from "@/types/payment";

export interface ClientDelegationConfig {
  maxPaymentPerTask: number;
  maxTotalSpending: number;
  timeLimit: string;
  qualityThreshold: number;
  allowedPaymentTypes: string[];
  projectId: string;
}

export class ClientDelegationManager {
  constructor() {
    // Provider will be created when needed
  }

  async createDelegation(config: ClientDelegationConfig): Promise<PaymentDelegation> {
    try {
      console.log("🔐 Creating client delegation...");

      // Get client's wallet address
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const clientWallet = accounts[0];

      if (!clientWallet) {
        throw new Error("No wallet connected");
      }

      console.log("👤 Client wallet:", clientWallet);

      // Create delegation rules
      const rules = {
        maxPaymentPerTask: config.maxPaymentPerTask,
        maxTotalSpending: config.maxTotalSpending,
        timeLimit: config.timeLimit,
        qualityThreshold: config.qualityThreshold,
        allowedPaymentTypes: config.allowedPaymentTypes,
        projectId: config.projectId
      };

      // Create message for signature
      const message = JSON.stringify({
        wallet: clientWallet,
        rules: rules,
        timestamp: Math.floor(Date.now() / 1000) // Use seconds instead of milliseconds
      });

      console.log("📝 Signing delegation message...");
      console.log("📄 Message:", message);

      // Get client signature using ethers v6
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const clientSignature = await signer.signMessage(message);

      console.log("✅ Client signature obtained");
      console.log("🔑 Signature:", clientSignature);

      // Create delegation request
      const delegationRequest: DelegationRequest = {
        clientWallet: clientWallet,
        rules: rules,
        clientSignature: clientSignature,
        signedMessage: message // Include the exact message that was signed
      };

      // Send to backend API
      const response = await fetch("/api/delegation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(delegationRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Delegation creation failed");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Delegation creation failed");
      }

      console.log("🎉 Delegation created successfully!");
      console.log("🔑 Delegation token:", result.delegation.token);

      return result.delegation;

    } catch (error: any) {
      console.error("❌ Delegation creation failed:", error);
      throw new Error(`Failed to create delegation: ${error.message}`);
    }
  }

  async validateDelegation(delegationToken: string): Promise<boolean> {
    try {
      // Check if delegation is still valid
      const response = await fetch(`/api/delegation/validate?token=${delegationToken}`);
      const result = await response.json();
      
      return result.valid;
    } catch (error) {
      console.error("Delegation validation failed:", error);
      return false;
    }
  }

  async revokeDelegation(delegationToken: string): Promise<boolean> {
    try {
      const response = await fetch("/api/delegation/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: delegationToken }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Delegation revocation failed:", error);
      return false;
    }
  }
}

// Helper function to create delegation
export const createClientDelegation = async (config: ClientDelegationConfig): Promise<PaymentDelegation> => {
  const manager = new ClientDelegationManager();
  return await manager.createDelegation(config);
};
