import { ethers } from "ethers";
import { 
  DelegationRequest, 
  PaymentDelegation,
  SignedMessageData,
  RevocationRequest,
  RevocationResponse
} from "@/types/payment";

export interface ClientDelegationConfig {
  maxPaymentPerTask: number;
  maxTotalSpending: number;
  timeLimit: string;
  qualityThreshold: number;
  allowedPaymentTypes: string[];
  projectId: string;
  allowedRecipients?: string[]; // Optional whitelist
}

export class ClientDelegationManager {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private walletAddress: string | null = null;

  constructor() {
    // Provider will be initialized when needed
  }

  /**
   * Initialize wallet connection
   */
  private async initializeWallet(): Promise<void> {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
    }

    // Request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No wallet accounts found");
    }

    this.walletAddress = accounts[0];
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();

    console.log("👤 Wallet connected:", this.walletAddress);
  }

  /**
   * Create a new payment delegation
   */
  async createDelegation(config: ClientDelegationConfig): Promise<PaymentDelegation> {
    try {
      console.log("🔐 Creating client delegation...");

      // Initialize wallet
      await this.initializeWallet();

      if (!this.walletAddress || !this.signer) {
        throw new Error("Wallet not initialized");
      }

      // Create delegation rules
      const rules = {
        maxPaymentPerTask: config.maxPaymentPerTask,
        maxTotalSpending: config.maxTotalSpending,
        timeLimit: config.timeLimit,
        qualityThreshold: config.qualityThreshold,
        allowedPaymentTypes: config.allowedPaymentTypes,
        projectId: config.projectId,
        ...(config.allowedRecipients && { allowedRecipients: config.allowedRecipients })
      };

      // Create structured message with timestamp for replay protection
      const messageData: SignedMessageData = {
        action: "create_delegation",
        wallet: this.walletAddress,
        timestamp: Date.now(), // Use milliseconds
        projectId: config.projectId,
        nonce: ethers.hexlify(ethers.randomBytes(16)) // Add nonce for extra security
      };

      const message = JSON.stringify(messageData);

      console.log("📝 Signing delegation message...");
      console.log("📄 Message data:", messageData);

      // Sign message
      const clientSignature = await this.signer.signMessage(message);

      console.log("✅ Client signature obtained");
      console.log("🔑 Signature:", clientSignature.substring(0, 20) + "...");

      // Create delegation request
      const delegationRequest: DelegationRequest = {
        clientWallet: this.walletAddress,
        rules: rules,
        clientSignature: clientSignature,
        signedMessage: message
      };

      // Send to backend API
      console.log("📡 Sending delegation request to API...");
      const response = await fetch("/api/delegation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(delegationRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: Delegation creation failed`);
      }

      const result = await response.json();

      if (!result.success || !result.delegation) {
        throw new Error(result.error || "Delegation creation failed");
      }

      console.log("🎉 Delegation created successfully!");
      console.log("🔑 Token:", result.delegation.token.substring(0, 30) + "...");
      console.log("⏰ Expires:", result.delegation.expiresAt);

      // Store delegation in localStorage for easy access
      this.storeDelegation(result.delegation);

      return result.delegation;

    } catch (error: any) {
      console.error("❌ Delegation creation failed:", error);
      
      // Provide user-friendly error messages
      if (error.code === 4001) {
        throw new Error("User rejected the signature request");
      } else if (error.message.includes("MetaMask")) {
        throw new Error(error.message);
      } else {
        throw new Error(`Failed to create delegation: ${error.message}`);
      }
    }
  }

  /**
   * Validate if a delegation token is still valid
   */
  async validateDelegation(delegationToken: string): Promise<{
    valid: boolean;
    decoded?: any;
    error?: string;
  }> {
    try {
      console.log("🔍 Validating delegation token...");

      const response = await fetch(
        `/api/delegation?token=${encodeURIComponent(delegationToken)}`
      );

      const result = await response.json();

      if (result.valid) {
        console.log("✅ Delegation is valid");
        console.log("📋 Rules:", result.decoded?.rules);
      } else {
        console.warn("❌ Delegation is invalid:", result.error);
      }

      return result;
    } catch (error: any) {
      console.error("❌ Delegation validation failed:", error);
      return {
        valid: false,
        error: error.message || "Validation request failed"
      };
    }
  }

  /**
   * Revoke an existing delegation
   */
  async revokeDelegation(delegationToken: string, reason?: string): Promise<RevocationResponse> {
    try {
      console.log("🚫 Revoking delegation...");

      // Initialize wallet if not already done
      if (!this.walletAddress || !this.signer) {
        await this.initializeWallet();
      }

      if (!this.walletAddress || !this.signer) {
        throw new Error("Wallet not initialized");
      }

      // Create revocation message
      const revocationMessage = `Revoke delegation: ${delegationToken}`;
      
      console.log("📝 Signing revocation...");
      const signature = await this.signer.signMessage(revocationMessage);

      // Create revocation request
      const revocationRequest: RevocationRequest = {
        token: delegationToken,
        wallet: this.walletAddress,
        signature: signature,
        reason: reason
      };

      // Send revocation to API
      const response = await fetch("/api/delegation", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(revocationRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: Revocation failed`);
      }

      const result: RevocationResponse = await response.json();

      if (result.success) {
        console.log("✅ Delegation revoked successfully");
        console.log("⛓️ HCS message ID:", result.hcsMessageId);
        
        // Remove from localStorage
        this.removeDelegation(delegationToken);
      } else {
        console.error("❌ Revocation failed:", result.error);
      }

      return result;
    } catch (error: any) {
      console.error("❌ Delegation revocation failed:", error);
      
      if (error.code === 4001) {
        throw new Error("User rejected the revocation signature");
      }
      
      return {
        success: false,
        error: error.message || "Revocation request failed"
      };
    }
  }

  /**
   * Get all stored delegations from localStorage
   */
  getStoredDelegations(): PaymentDelegation[] {
    try {
      const stored = localStorage.getItem("payment_delegations");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load stored delegations:", error);
      return [];
    }
  }

  /**
   * Store delegation in localStorage
   */
  private storeDelegation(delegation: PaymentDelegation): void {
    try {
      const delegations = this.getStoredDelegations();
      
      // Add new delegation
      delegations.push(delegation);
      
      // Keep only last 10 delegations
      const recentDelegations = delegations.slice(-10);
      
      localStorage.setItem("payment_delegations", JSON.stringify(recentDelegations));
      console.log("💾 Delegation stored locally");
    } catch (error) {
      console.warn("Failed to store delegation locally:", error);
    }
  }

  /**
   * Remove delegation from localStorage
   */
  private removeDelegation(token: string): void {
    try {
      const delegations = this.getStoredDelegations();
      const filtered = delegations.filter(d => d.token !== token);
      localStorage.setItem("payment_delegations", JSON.stringify(filtered));
      console.log("🗑️ Delegation removed from local storage");
    } catch (error) {
      console.warn("Failed to remove delegation from storage:", error);
    }
  }

  /**
   * Check if wallet is connected
   */
  async isWalletConnected(): Promise<boolean> {
    try {
      if (!window.ethereum) return false;
      
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      
      return accounts && accounts.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get connected wallet address
   */
  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  /**
   * Disconnect wallet (clear local state)
   */
  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.walletAddress = null;
    console.log("🔌 Wallet disconnected");
  }
}

// Singleton instance for convenience
let delegationManagerInstance: ClientDelegationManager | null = null;

/**
 * Get shared delegation manager instance
 */
export const getDelegationManager = (): ClientDelegationManager => {
  if (!delegationManagerInstance) {
    delegationManagerInstance = new ClientDelegationManager();
  }
  return delegationManagerInstance;
};

/**
 * Helper function to create delegation (convenience method)
 */
export const createClientDelegation = async (
  config: ClientDelegationConfig
): Promise<PaymentDelegation> => {
  const manager = getDelegationManager();
  return await manager.createDelegation(config);
};

/**
 * Helper function to validate delegation (convenience method)
 */
export const validateClientDelegation = async (
  token: string
): Promise<boolean> => {
  const manager = getDelegationManager();
  const result = await manager.validateDelegation(token);
  return result.valid;
};

/**
 * Helper function to revoke delegation (convenience method)
 */
export const revokeClientDelegation = async (
  token: string,
  reason?: string
): Promise<boolean> => {
  const manager = getDelegationManager();
  const result = await manager.revokeDelegation(token, reason);
  return result.success;
};