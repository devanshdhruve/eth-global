export interface PaymentDelegationRules {
  maxPaymentPerTask: number;        // Maximum HBAR per task
  maxTotalSpending: number;        // Maximum total HBAR for project
  timeLimit: string;               // Delegation duration (e.g., "30d", "7d")
  qualityThreshold: number;         // Minimum quality score (0-1)
  allowedPaymentTypes: string[];    // Types of payments allowed
  projectId: string;               // Project this delegation is for
}

export interface PaymentDelegation {
  token: string;                   // Delegation token from Lit Protocol
  rules: PaymentDelegationRules;   // Payment rules and limits
  clientWallet: string;            // Client's MetaMask wallet address
  createdAt: string;               // Creation timestamp
  expiresAt: string;              // Expiration timestamp
  isActive: boolean;              // Whether delegation is active
}

export interface DelegationRequest {
  clientWallet: string;            // Client's MetaMask wallet address
  rules: PaymentDelegationRules;   // Payment rules and limits
  clientSignature: string;         // Client's signature for delegation creation
  signedMessage?: string;          // The exact message that was signed
}

export interface DelegationResponse {
  success: boolean;
  delegation?: PaymentDelegation;
  error?: string;
}

export interface PaymentValidationRequest {
  amount: number;                  // Payment amount in HBAR
  recipient: string;               // Annotator's wallet address
  projectId: string;              // Project ID
  taskId: number;                 // Task ID
  qualityScore: number;           // Task quality score
  delegationToken: string;        // Client's delegation token
}

export interface PaymentValidationResponse {
  approved: boolean;
  reason?: string;
  validatedRules?: PaymentDelegationRules;
}
