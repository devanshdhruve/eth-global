import { Client, AccountBalanceQuery, PrivateKey, AccountId, AccountInfoQuery } from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function testCredentials() {
  console.log("🔍 Testing Hedera Credentials...\n");
  
  try {
    // Load credentials
    const accountIdString = process.env.HEDERA_TESTNET_ACCOUNT_ID!;
    let privateKeyString = process.env.HEDERA_TESTNET_PRIVATE_KEY!.trim();
    
    console.log(`Account ID from .env: ${accountIdString}`);
    console.log(`Private Key length: ${privateKeyString.length} characters`);
    console.log(`Private Key prefix: ${privateKeyString.substring(0, 10)}...`);
    
    // Remove 0x prefix if present
    if (privateKeyString.startsWith('0x') || privateKeyString.startsWith('0X')) {
      privateKeyString = privateKeyString.substring(2);
      console.log("🔧 Removed 0x prefix from private key");
      console.log(`New length: ${privateKeyString.length} characters`);
    }
    console.log();
    
    // Parse account ID
    const accountId = AccountId.fromString(accountIdString);
    console.log(`✅ Account ID parsed: ${accountId.toString()}`);
    
    // Parse private key
    let privateKey: PrivateKey;
    try {
      if (privateKeyString.startsWith('302e') || privateKeyString.startsWith('3030')) {
        privateKey = PrivateKey.fromStringED25519(privateKeyString);
        console.log("✅ Private Key parsed as ED25519 (DER format)");
      } else if (privateKeyString.length === 64) {
        privateKey = PrivateKey.fromStringED25519(privateKeyString);
        console.log("✅ Private Key parsed as ED25519 (raw format)");
      } else {
        privateKey = PrivateKey.fromStringECDSA(privateKeyString);
        console.log("✅ Private Key parsed as ECDSA");
      }
    } catch (e) {
      privateKey = PrivateKey.fromString(privateKeyString);
      console.log("✅ Private Key parsed (generic fallback)");
    }
    
    // Get public key from private key
    const publicKey = privateKey.publicKey;
    console.log(`📋 Public Key derived: ${publicKey.toString()}`);
    console.log();
    
    // Create client
    const client = Client.forTestnet().setOperator(accountId, privateKey);
    console.log("✅ Client created for testnet\n");
    
    // Test 1: Query balance (doesn't require signature)
    console.log("🧪 Test 1: Querying account balance...");
    try {
      const balance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(client);
      
      console.log(`✅ Balance query successful!`);
      console.log(`   HBAR: ${balance.hbars.toString()}`);
      console.log();
    } catch (error) {
      console.error("❌ Balance query failed:", error);
      client.close();
      return;
    }
    
    // Test 2: Query account info to verify the key
    console.log("🧪 Test 2: Querying account info...");
    try {
      const accountInfo = await new AccountInfoQuery()
        .setAccountId(accountId)
        .execute(client);
      
      console.log(`✅ Account info retrieved!`);
      console.log(`   Account: ${accountInfo.accountId.toString()}`);
      console.log(`   Key on account: ${accountInfo.key.toString()}`);
      console.log(`   Your derived key: ${publicKey.toString()}`);
      console.log();
      
      // Compare keys
      if (accountInfo.key.toString() === publicKey.toString()) {
        console.log("✅✅✅ KEYS MATCH! Your credentials are correct!");
      } else {
        console.log("❌❌❌ KEYS DON'T MATCH!");
        console.log("The private key in your .env does NOT match the account.");
        console.log("\n🔧 Solutions:");
        console.log("1. Get the correct private key for account " + accountId.toString());
        console.log("2. Or get a new testnet account from https://portal.hedera.com/");
      }
      
    } catch (error) {
      console.error("❌ Account info query failed:", error);
    }
    
    client.close();
    console.log("\n✅ Test complete!");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
}

testCredentials();