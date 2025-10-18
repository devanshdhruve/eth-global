import { Client, TokenInfoQuery, TokenId, PrivateKey, AccountId } from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function verifyToken() {
    const tokenId = process.env.ASI_TOKEN_ID;
    
    if (!tokenId) {
        console.error("❌ ASI_TOKEN_ID not found in .env");
        console.log("Run: npx ts-node contracts/hedera/hts/token-creator.ts");
        process.exit(1);
    }

    console.log(`🔍 Verifying token ${tokenId}...\n`);

    // Parse private key properly
    let privateKeyString = process.env.HEDERA_TESTNET_PRIVATE_KEY!.trim();
    
    // Remove 0x prefix if present
    if (privateKeyString.startsWith('0x') || privateKeyString.startsWith('0X')) {
        privateKeyString = privateKeyString.substring(2);
    }
    
    // Parse the key based on format
    let privateKey: PrivateKey;
    if (privateKeyString.length === 64) {
        // Raw ECDSA key
        privateKey = PrivateKey.fromStringECDSA(privateKeyString);
    } else if (privateKeyString.startsWith('302e')) {
        // ED25519 DER
        privateKey = PrivateKey.fromStringED25519(privateKeyString);
    } else {
        // Try generic
        privateKey = PrivateKey.fromString(privateKeyString);
    }
    
    const accountId = AccountId.fromString(process.env.HEDERA_TESTNET_ACCOUNT_ID!);
    const client = Client.forTestnet().setOperator(accountId, privateKey);

    try {
        const tokenInfo = await new TokenInfoQuery()
            .setTokenId(TokenId.fromString(tokenId))
            .execute(client);

        console.log("✅ Token verified successfully!\n");
        console.log(`📋 Token Details:`);
        console.log(`   Token ID: ${tokenId}`);
        console.log(`   Name: ${tokenInfo.name}`);
        console.log(`   Symbol: ${tokenInfo.symbol}`);
        console.log(`   Decimals: ${tokenInfo.decimals}`);
        console.log(`   Total Supply: ${tokenInfo.totalSupply.toString()} (${Number(tokenInfo.totalSupply) / 10**tokenInfo.decimals} ASI)`);
        console.log(`   Treasury: ${tokenInfo.treasuryAccountId?.toString()}`);
        // console.log(`   Supply Type: ${tokenInfo.supplyType.toString()}`);
        
        // Check for keys properly
        if (tokenInfo.adminKey) {
            console.log(`   Admin Key: ✅ ${tokenInfo.adminKey.toString().substring(0, 40)}...`);
        } else {
            console.log(`   Admin Key: ❌ Not set`);
        }
        
        if (tokenInfo.supplyKey) {
            console.log(`   Supply Key: ✅ ${tokenInfo.supplyKey.toString().substring(0, 40)}...`);
        } else {
            console.log(`   Supply Key: ❌ Not set`);
        }
        
        if (tokenInfo.freezeKey) {
            console.log(`   Freeze Key: ✅ Set`);
        }
        
        if (tokenInfo.wipeKey) {
            console.log(`   Wipe Key: ✅ Set`);
        }

        client.close();
    } catch (error) {
        console.error("❌ Token verification failed:", error);
        client.close();
        process.exit(1);
    }
}

verifyToken();