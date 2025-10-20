# Hedera HTS Integration Guide

Complete guide to deploying and using AnnotationMarketplaceHTS on Hedera Testnet.

## 📋 Prerequisites

1. **Hedera Testnet Account**
   - Create account at: https://portal.hedera.com
   - Fund with testnet HBAR from faucet: https://portal.hedera.com/faucet

2. **Environment Setup**
   ```bash
   # .env file
   HEDERA_TESTNET_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
   HEDERA_TESTNET_PRIVATE_KEY=302e020100300506032b657004220420YOUR_KEY
   ```

3. **Dependencies**
   ```bash
   npm install @hashgraph/sdk @openzeppelin/contracts hardhat ethers
   ```

## 🚀 Deployment Steps

### Step 1: Create ASI Token (HTS)

```bash
npx ts-node scripts/token-creator.ts
```

This creates:
- Token with 1M supply, 8 decimals
- Saves `ASI_TOKEN_ID` to .env
- Shows EVM address for contract deployment

**Output:**
```
✅ Token created: 0.0.123456
📝 EVM Address: 0x0000000000000000000000000000000000007b00
```

### Step 2: Deploy Marketplace Contract

```bash
npx hardhat run scripts/deploy-marketplace.ts --network hedera-testnet
```

This will:
- Deploy `AnnotationMarketplaceHTS` with ASI token address
- Convert contract address to Hedera account ID
- Save deployment addresses to .env

**Important:** Note the marketplace Hedera account ID (e.g., `0.0.789012`)

### Step 3: Associate Token with Marketplace

The marketplace contract needs to be associated with the ASI token to receive/send it.

**Option A: Using Hedera SDK (Recommended)**

```typescript
import { TokenAssociateTransaction, AccountId } from "@hashgraph/sdk";

const marketplaceId = AccountId.fromString("0.0.789012");
const tokenId = "0.0.123456";

// Note: This requires the marketplace contract's admin key
// For contracts deployed via Hardhat, you typically need to set this during deployment
const associateTx = await new TokenAssociateTransaction()
  .setAccountId(marketplaceId)
  .setTokenIds([tokenId])
  .freezeWith(client);

// Sign with contract admin key (if available)
const signedTx = await associateTx.sign(contractAdminKey);
await signedTx.execute(client);
```

**Option B: Auto-association (Recommended for Production)**

Deploy contracts with `maxAutoAssociations` set:
```solidity
// In deployment, set contract to auto-associate tokens
// This requires modifying the contract creation parameters
```

### Step 4: Fund Marketplace (Optional - for testing)

```bash
# Transfer tokens to marketplace via Hedera SDK
npx ts-node scripts/fund-marketplace.ts
```

## 💡 Usage Examples

### Client Workflow

#### 1. Create Project

```typescript
import { ethers } from "hardhat";

const marketplace = await ethers.getContractAt(
  "AnnotationMarketplaceHTS",
  process.env.MARKETPLACE_ADDRESS!
);

// Create project: 100 tasks, 5 ASI per task
const rewardPerTask = ethers.parseUnits("5", 8);
const tx = await marketplace.createProject(100, rewardPerTask);
const receipt = await tx.wait();

// Get project ID from event
const projectId = 1; // Or parse from ProjectCreated event
```

#### 2. Fund Project (Two Methods)

**Method A: Manual Transfer + Record**

```typescript
import { HTSTokenManager } from "./token-creator";

const tokenManager = new HTSTokenManager();

// Step 1: Transfer tokens via Hedera SDK
await tokenManager.transferToken(
  "0.0.123456", // ASI token ID
  "0.0.YOUR_CLIENT_ID",
  "0.0.MARKETPLACE_ID",
  50000000000 // 500 ASI with 8 decimals
);

// Step 2: Record in contract
const amount = ethers.parseUnits("500", 8);
await marketplace.depositFunds(projectId, amount);
```

**Method B: Allowance-based Transfer**

```typescript
// Step 1: Approve allowance via Hedera SDK
await tokenManager.approveAllowance(
  "0.0.123456",
  "0.0.MARKETPLACE_ID",
  50000000000
);

// Step 2: Contract pulls funds
const amount = ethers.parseUnits("500", 8);
await marketplace.depositFundsWithTransfer(projectId, amount);
```

### Annotator Workflow

#### Submit Work and Get Paid

```typescript
// Annotator completes 10 tasks
const taskCount = 10;
const tx = await marketplace.connect(annotatorSigner).submitAndClaim(projectId, taskCount);
await tx.wait();

// Payment is AUTOMATIC - no manual approval needed!
// Annotator receives: 10 tasks × 5 ASI = 50 ASI
```

#### Check Earnings

```typescript
const work = await marketplace.getAnnotatorWork(projectId, annotatorAddress);
console.log(`Tasks Completed: ${work.tasksCompleted}`);
console.log(`Total Earned: ${ethers.formatUnits(work.totalEarned, 8)} ASI`);
```

## 🔍 Key Differences from ERC-20

### 1. Token Addresses

**ERC-20:**
```javascript
const tokenAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
```

**HTS:**
```javascript
// Hedera format
const tokenId = "0.0.123456";

// EVM format (for contracts)
const tokenEvmAddress = "0x0000000000000000000000000000000000007b00";
```

### 2. Token Association

**ERC-20:** No association needed, anyone can receive tokens.

**HTS:** Accounts must be associated with token before receiving:
```typescript
await new TokenAssociateTransaction()
  .setAccountId(recipientId)
  .setTokenIds([tokenId])
  .execute(client);
```

### 3. Transfers

**Inside Solidity (using HederaTokenWrapper):**
```solidity
// Transfers work similarly to ERC-20
HederaTokenWrapper.htsTransfer(token, recipient, amount);
```

**Outside contract (via SDK):**
```typescript
// Must use Hedera SDK, not ethers
await new TransferTransaction()
  .addTokenTransfer(tokenId, senderId, -amount)
  .addTokenTransfer(tokenId, recipientId, amount)
  .execute(client);
```

### 4. Allowances

**ERC-20:** `token.approve(spender, amount)`

**HTS:** Use Hedera SDK
```typescript
await new AccountAllowanceApproveTransaction()
  .approveTokenAllowance(tokenId, ownerId, spenderId, amount)
  .execute(client);
```

## 🧪 Testing

### Local Testing (with MockHTS)

```bash
npx hardhat test test/AnnotationMarketplace.test.ts
```

Tests use `MockHTS.sol` at address `0x167` to simulate HTS precompile.

### Testnet Testing

1. Deploy to Hedera Testnet
2. Use `scripts/interact-marketplace.ts` for real transactions
3. Monitor on HashScan: https://hashscan.io/testnet

## 🛠️ Troubleshooting

### "Transfer failed" error

**Cause:** Marketplace not associated with token

**Fix:** Associate marketplace contract with ASI token (Step 3)

### "Insufficient balance" error

**Cause:** Marketplace doesn't have enough tokens

**Fix:** 
- Check marketplace token balance
- Client must fund project first via `depositFunds()` or `depositFundsWithTransfer()`

### "Token not found" error

**Cause:** Using wrong token address format

**Fix:** 
- In Solidity: Use EVM format (0x000...00007b00)
- In SDK: Use Hedera format (0.0.123456)

### Contract not receiving tokens

**Cause:** Contract not associated or no auto-association enabled

**Fix:**
- Associate via SDK (Step 3)
- Or deploy with auto-association enabled

## 📚 Resources

- **Hedera Docs:** https://docs.hedera.com
- **HTS Guide:** https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service
- **Smart Contracts:** https://docs.hedera.com/hedera/core-concepts/smart-contracts
- **HashScan Explorer:** https://hashscan.io/testnet
- **Portal & Faucet:** https://portal.hedera.com

## 🔐 Security Notes

1. **Private Keys:** Never commit private keys to git
2. **Admin Keys:** Store contract admin keys securely for token association
3. **Allowances:** Only approve what's needed, revoke after use
4. **Testing:** Always test on testnet first
5. **Audits:** Get smart contracts audited before mainnet deployment

## 📞 Support

- **Hedera Discord:** https://hedera.com/discord
- **GitHub Issues:** [Your repo]
- **Documentation:** [Your docs]

---

**Next Steps:**
1. Deploy token and marketplace
2. Test with small amounts
3. Build your frontend
4. Integrate with your annotation pipeline
5. Go to mainnet! 🚀