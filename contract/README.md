Sure — here’s the full **`README.md`** file you can copy directly into your project root (`contract/README.md`):

---

````markdown
# 🧠 Annotation Marketplace on Hedera (HTS Integration)

This project implements a decentralized **Annotation Marketplace** inspired by platforms like Scale AI — built on the **Hedera Smart Contract Service (HSCS)** and using **Hedera Token Service (HTS)** tokens for payments.

Annotators and reviewers earn tokens automatically from escrowed project funds after completing their respective tasks.  
Clients deposit tokens upfront, and the system manages reward distribution transparently via smart contracts.

---

## 🚀 Project Overview

### Components
1. **`AnnotationMarketplaceHTS.sol`** – main contract managing projects, payments, and escrow.  
2. **`HederaTokenWrapper.sol`** – HTS token helper library for transfers.  
3. **`MockHTS.sol`** – ERC20-like mock token used for local Hardhat testing.  
4. **`token-creator.ts`** – creates real HTS fungible tokens on the Hedera testnet.  
5. **`scripts/deploy.ts`** – deploys marketplace contract to Hedera.  
6. **`test/AnnotationMarketplace.test.ts`** – end-to-end unit tests for contract logic.

---

## 🧩 Smart Contract Summary

### `AnnotationMarketplaceHTS.sol`
Handles:
- Project creation and escrow management  
- Automatic reward distribution to annotators and reviewers  
- Refund of remaining escrow upon project completion  

| Function | Purpose |
|-----------|----------|
| `createProject()` | Client creates project and deposits HTS tokens |
| `submitAnnotation()` | Annotator submits completed tasks, receives payment |
| `submitReview()` | Reviewer reviews tasks, receives payment |
| `completeProject()` | Refunds unused escrow to client |
| `getProject()` | View project details |
| `getAnnotatorProgress()` / `getReviewerProgress()` | Progress tracking |

---

### `HederaTokenWrapper.sol`
Utility wrapper for Hedera Token Service precompiles.

Functions used internally:
- `transferToken(token, from, to, amount)`
- `transferFromToken(token, from, to, amount)`
- `approveToken(token, spender, amount)`

---

### `MockHTS.sol`
A mock ERC20 token that simulates HTS behavior for **local Hardhat testing**.  
Used to test contract logic without real Hedera interaction.

---

## ⚙️ Setup Instructions

### 1️⃣ Prerequisites
- Node.js ≥ 18  
- Yarn or npm  
- Hardhat  
- TypeScript  
- Hedera testnet account  

---

### 2️⃣ Clone & Install
```bash
git clone <your_repo_url>
cd contract
npm install
````

---

### 3️⃣ Environment Variables

Create `.env` file in project root:

```env
# Hedera Credentials
OPERATOR_ID=0.0.xxxxx
OPERATOR_KEY=302e020100300506032b6xxxxxxxxxxxxxxx   # DER format (for token-creator.ts)
PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890  # HEX for deploy
MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com/api/v1

# HTS Token Address (after running token-creator.ts)
ASI_TOKEN_ADDRESS=0x00000000000000000000000000000000006c47e8
```

---

### 4️⃣ Compile Contracts

```bash
npx hardhat compile
```

---

## 🪙 Create Token on Hedera Testnet

Creates a real **HTS Fungible Token** on the Hedera testnet.

```bash
npx ts-node contracts/hedera/hts/token-creator.ts
```

Output example:

```
✅ Token created successfully!
Token ID: 0.0.xxxxxxx
EVM Address: 0x0000000000000000000000000000000000123456
```

Save that **EVM address** to `.env` as `ASI_TOKEN_ADDRESS`.

---

## 📜 Deploy Contract (Hedera Testnet)

Deploy `AnnotationMarketplaceHTS` with your token address.

```bash
npx hardhat run scripts/deploy.ts --network hedera-testnet
```

Example output:

```
🚀 Deploying AnnotationMarketplaceHTS with token: 0x00000000000000000000000000000000006c4dfb
✅ Deployed AnnotationMarketplaceHTS at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

---

## 🧪 Local Testing (Hardhat + MockHTS)

For local testing, we use `MockHTS` tokens.

Run:

```bash
npx hardhat test
```

Expected output:

```
✅ MockHTS deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ Marketplace deployed at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✅ Project created and escrow funded successfully!
✅ Annotator auto-paid 500000000 tokens
✅ Reviewer auto-paid 500000000 tokens
✅ Client refunded remaining escrow!
```

All tests should pass ✅

---

## 🧠 Next Steps (Coming Soon)

* Reputation System for annotators and reviewers
* Arbitration & dispute resolution
* Multi-token support
* Frontend integration (Next.js + Hedera SDK)

---

## 🛠️ Commands Reference

| Purpose                  | Command                                                      |
| ------------------------ | ------------------------------------------------------------ |
| Compile contracts        | `npx hardhat compile`                                        |
| Run tests                | `npx hardhat test`                                           |
| Create HTS token         | `npx ts-node contracts/hedera/hts/token-creator.ts`          |
| Deploy to Hedera testnet | `npx hardhat run scripts/deploy.ts --network hedera-testnet` |
| Clean build              | `npx hardhat clean`                                          |
| Start console            | `npx hardhat console`                                        |

---

## 👨‍💻 Author

**Your Name**
Built for ETHGlobal x Hedera — Annotation Marketplace Project.

---

```

---

Would you like me to **add GitHub badges (e.g., Solidity, Hardhat, Hedera SDK)** and polish it visually for public upload?
```
