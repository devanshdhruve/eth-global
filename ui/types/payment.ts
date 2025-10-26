// Payment delegation rules defining spending limits and constraints
export interface PaymentDelegationRules {
  maxPaymentPerTask: number;        // Maximum HBAR per task
  maxTotalSpending: number;         // Maximum total HBAR for project
  timeLimit: string;                // Delegation duration (e.g., "30d", "7d")
  qualityThreshold: number;         // Minimum quality score (0-1)
  allowedPaymentTypes: string[];    // Types of payments allowed
  projectId: string;                // Project this delegation is for
  allowedRecipients?: string[];     // Optional: Whitelist of recipient addresses
}

// Lit Protocol capability object
export interface LitDelegationCapability {
  type: string;                     // "lit-capability" or "mock-lit-capability"
  resource?: string;                // Lit resource identifier
  ability?: string;                 // Lit ability (e.g., decryption)
  issuedBy: string;                 // Wallet that issued the capability
  issuedAt: string;                 // ISO timestamp
  rules: PaymentDelegationRules;    // Associated rules
}

// Complete payment delegation object
export interface PaymentDelegation {
  token: string;                    // JWT delegation token
  litDelegation: LitDelegationCapability; // Lit Protocol capability
  rules: PaymentDelegationRules;    // Payment rules and limits
  clientWallet: string;             // Client's MetaMask wallet address
  createdAt: string;                // Creation timestamp (ISO)
  expiresAt: string;                // Expiration timestamp (ISO)
  isActive: boolean;                // Whether delegation is active
}

// Request to create a new delegation
export interface DelegationRequest {
  clientWallet: string;             // Client's MetaMask wallet address
  rules: PaymentDelegationRules;    // Payment rules and limits
  clientSignature: string;          // Client's signature for delegation creation
  signedMessage: string;            // The exact message that was signed (must include timestamp JSON)
}

// Response from delegation creation
export interface DelegationResponse {
  success: boolean;
  delegation?: PaymentDelegation;
  error?: string;
}

// Request to validate if a payment is allowed under delegation rules
export interface PaymentValidationRequest {
  amount: number;                   // Payment amount in HBAR
  recipient: string;                // Annotator's wallet address
  projectId: string;                // Project ID
  taskId: string;                   // Task ID (changed to string for flexibility)
  qualityScore: number;             // Task quality score (0-1)
  delegationToken: string;          // Client's delegation token
  paymentType: string;              // Type of payment (must match allowedPaymentTypes)
}

// Response from payment validation
export interface PaymentValidationResponse {
  approved: boolean;
  reason?: string;
  validatedRules?: PaymentDelegationRules;
  remainingBudget?: number;         // How much budget remains
}

// Revocation record stored on HCS
export interface RevocationRecord {
  token: string;                    // Hashed token (keccak256)
  revokedBy: string;                // Wallet address that revoked
  revokedAt: string;                // ISO timestamp
  type: "delegation-revocation";    // Message type identifier
  reason?: string;                  // Optional revocation reason
}

// Request to revoke a delegation
export interface RevocationRequest {
  token: string;                    // Token to revoke
  wallet: string;                   // Wallet address of token owner
  signature: string;                // Signature proving ownership
  reason?: string;                  // Optional reason for revocation
}

// Response from revocation
export interface RevocationResponse {
  success: boolean;
  message?: string;
  error?: string;
  hcsMessageId?: string;            // HCS message sequence number
}

// Decoded JWT payload structure
export interface DelegationJWTPayload {
  wallet: string;                   // Client wallet address
  rules: PaymentDelegationRules;    // Delegation rules
  iat: number;                      // Issued at (Unix timestamp)
  exp: number;                      // Expires at (Unix timestamp)
  nonce: string;                    // Unique nonce to prevent reuse
}

// Signed message format (must be JSON for security)
export interface SignedMessageData {
  action: "create_delegation";      // Action type
  wallet: string;                   // Wallet creating delegation
  timestamp: number;                // Unix timestamp (for replay prevention)
  projectId: string;                // Project being delegated
  nonce?: string;                   // Optional additional nonce
}

// Validation context (internal use for tracking spending)
export interface ValidationContext {
  totalSpent: number;               // Total HBAR spent so far
  paymentsCount: number;            // Number of payments made
  lastPaymentAt: string;            // ISO timestamp of last payment
  taskPayments: Record<string, number>; // Map of taskId -> amount spent
}