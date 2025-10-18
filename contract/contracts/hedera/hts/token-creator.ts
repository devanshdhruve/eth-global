import {
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  PrivateKey,
  AccountId,
  TokenAssociateTransaction,
  TransferTransaction,
  AccountBalanceQuery,
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

export class HTSTokenManager {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;

  constructor() {
    // Validate environment variables
    if (!process.env.HEDERA_TESTNET_ACCOUNT_ID) {
      throw new Error("HEDERA_TESTNET_ACCOUNT_ID is not set in .env");
    }
    if (!process.env.HEDERA_TESTNET_PRIVATE_KEY) {
      throw new Error("HEDERA_TESTNET_PRIVATE_KEY is not set in .env");
    }

    this.operatorId = AccountId.fromString(process.env.HEDERA_TESTNET_ACCOUNT_ID);
    
    // Parse private key
    let privateKeyString = process.env.HEDERA_TESTNET_PRIVATE_KEY.trim();
    
    console.log(`🔑 Private Key Info:`);
    console.log(`   Length: ${privateKeyString.length} characters`);
    console.log(`   Preview: ${privateKeyString.substring(0, 20)}...`);
    
    // Remove 0x prefix if present
    if (privateKeyString.startsWith('0x') || privateKeyString.startsWith('0X')) {
      privateKeyString = privateKeyString.substring(2);
      console.log(`   Removed 0x prefix, new length: ${privateKeyString.length}`);
    }
    
    // Try to parse the key
    try {
      // Check key length and format
      if (privateKeyString.length === 64) {
        // Raw 32-byte ECDSA key
        console.log(`   Detected: 64-char raw ECDSA key`);
        this.operatorKey = PrivateKey.fromStringECDSA(privateKeyString);
        console.log("✅ Loaded ECDSA private key (raw format)\n");
      } else if (privateKeyString.startsWith('302e020100300506032b6570')) {
        // ED25519 DER format
        console.log(`   Detected: ED25519 DER format`);
        this.operatorKey = PrivateKey.fromStringED25519(privateKeyString);
        console.log("✅ Loaded ED25519 private key (DER format)\n");
      } else if (privateKeyString.startsWith('3030020100300706052b8104000a') || 
                 privateKeyString.startsWith('302d300706052b8104000a')) {
        // ECDSA DER format
        console.log(`   Detected: ECDSA DER format`);
        this.operatorKey = PrivateKey.fromStringDer(privateKeyString);
        console.log("✅ Loaded ECDSA private key (DER format)\n");
      } else {
        // Try generic parsing
        console.log(`   Trying generic key parsing...`);
        this.operatorKey = PrivateKey.fromString(privateKeyString);
        console.log("✅ Loaded private key (generic method)\n");
      }
    } catch (e: any) {
      console.error("\n❌ Failed to parse private key!");
      console.error(`   Error: ${e.message}`);
      console.error(`\n💡 Troubleshooting:`);
      console.error(`   1. Check that you copied the COMPLETE private key`);
      console.error(`   2. Use the HEX Encoded Private Key (64 characters, no 0x prefix)`);
      console.error(`   3. Make sure there are no spaces or line breaks`);
      console.error(`   4. The key in your .env should look like:`);
      console.error(`      HEDERA_TESTNET_PRIVATE_KEY=280a2930e46c4e67c63e5af4780ccda1c3091d785...`);
      throw new Error(`Failed to parse private key. Please check your .env file.`);
    }
    
    this.client = Client.forTestnet().setOperator(this.operatorId, this.operatorKey);
    console.log(`🔧 Client configured for account: ${this.operatorId.toString()}\n`);
  }

  async createASIToken() {
    try {
      console.log("🪙 Creating ASI Token on Hedera Token Service...\n");

      const tokenCreateTx = new TokenCreateTransaction()
        .setTokenName("ASI Token")
        .setTokenSymbol("ASI")
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(8)
        .setInitialSupply(1_000_000_00000000)
        .setTreasuryAccountId(this.operatorId)
        .setSupplyType(TokenSupplyType.Infinite)
        .setAdminKey(this.operatorKey.publicKey)
        .setSupplyKey(this.operatorKey.publicKey)
        .setFreezeKey(this.operatorKey.publicKey)
        .setWipeKey(this.operatorKey.publicKey);

      // Freeze and sign in one step
      const tokenCreateSign = await tokenCreateTx
        .freezeWith(this.client)
        .sign(this.operatorKey);

      const tokenCreateSubmit = await tokenCreateSign.execute(this.client);
      const tokenCreateRx = await tokenCreateSubmit.getReceipt(this.client);
      const tokenId = tokenCreateRx.tokenId;

      console.log("✅ ASI Token Created Successfully!");
      console.log(`📋 Token ID: ${tokenId}`);
      console.log(`💰 Initial Supply: 1,000,000 ASI`);
      console.log(`🏦 Treasury: ${this.operatorId}\n`);

      // Update .env file
      this.updateEnvFile("ASI_TOKEN_ID", tokenId!.toString());

      // Check balance
      await this.checkBalance(this.operatorId, tokenId!.toString());

      return tokenId!.toString();
    } catch (error) {
      console.error("❌ Error creating token:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      throw error;
    }
  }

  async associateToken(accountId: string, tokenId: string) {
    try {
      console.log(`🔗 Associating token ${tokenId} with account ${accountId}...`);

      const associateTx = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(accountId))
        .setTokenIds([tokenId])
        .freezeWith(this.client);

      const associateSign = await associateTx.sign(this.operatorKey);
      const associateSubmit = await associateSign.execute(this.client);
      const associateRx = await associateSubmit.getReceipt(this.client);

      console.log(`✅ Token associated! Status: ${associateRx.status.toString()}\n`);
      return associateRx;
    } catch (error) {
      console.error("❌ Error associating token:", error);
      throw error;
    }
  }

  async transferTokens(toAccountId: string, tokenId: string, amount: number) {
    try {
      console.log(`💸 Transferring ${amount} tokens to ${toAccountId}...`);

      const transferTx = await new TransferTransaction()
        .addTokenTransfer(tokenId, this.operatorId, -amount)
        .addTokenTransfer(tokenId, AccountId.fromString(toAccountId), amount)
        .freezeWith(this.client);

      const transferSign = await transferTx.sign(this.operatorKey);
      const transferSubmit = await transferSign.execute(this.client);
      const transferRx = await transferSubmit.getReceipt(this.client);

      console.log(`✅ Transfer complete! Status: ${transferRx.status.toString()}\n`);
      return transferRx;
    } catch (error) {
      console.error("❌ Error transferring tokens:", error);
      throw error;
    }
  }

  async checkBalance(accountId: AccountId | string, tokenId: string) {
    try {
      const accountIdObj = typeof accountId === 'string' 
        ? AccountId.fromString(accountId) 
        : accountId;

      const balanceQuery = new AccountBalanceQuery()
        .setAccountId(accountIdObj);

      const balance = await balanceQuery.execute(this.client);
      const tokenBalance = balance.tokens?.get(tokenId);

      console.log(`💰 Balance for ${accountIdObj.toString()}:`);
      console.log(`   HBAR: ${balance.hbars.toString()}`);
      console.log(`   ASI: ${tokenBalance ? tokenBalance.toString() : '0'}\n`);

      return tokenBalance;
    } catch (error) {
      console.error("❌ Error checking balance:", error);
      throw error;
    }
  }

  private updateEnvFile(key: string, value: string) {
    const envPath = ".env";
    let envContent = fs.readFileSync(envPath, "utf8");

    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`📝 Updated .env with ${key}=${value}`);
  }

  close() {
    this.client.close();
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    const manager = new HTSTokenManager();
    try {
      await manager.createASIToken();
    } finally {
      manager.close();
    }
  })();
}