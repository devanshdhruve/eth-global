import { Client, AccountBalanceQuery, AccountId } from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function verifyAccount() {
    const accountId = process.env.HEDERA_TESTNET_ACCOUNT_ID!;
    const privateKey = process.env.HEDERA_TESTNET_PRIVATE_KEY!;

    if (!accountId || !privateKey) {
        console.error("❌ Missing HEDERA_TESTNET_ACCOUNT_ID or HEDERA_TESTNET_PRIVATE_KEY in .env");
        process.exit(1);
    }

    console.log("🔍 Verifying Hedera account...\n");
    console.log(`Account ID: ${accountId}`);

    try {
        const client = Client.forTestnet();
        client.setOperator(accountId, privateKey);

        // Check balance
        const balance = await new AccountBalanceQuery()
            .setAccountId(AccountId.fromString(accountId))
            .execute(client);

        console.log(`\n✅ Account verified!`);
        console.log(`💰 Balance: ${balance.hbars.toString()}`);
        
        if (balance.hbars.toTinybars().toNumber() < 10_00000000) { // Less than 10 HBAR
            console.warn("\n⚠️  Warning: Low balance! You need at least 10 HBAR for testing.");
            console.log("   Get more at: https://portal.hedera.com/");
        }

        client.close();
    } catch (error) {
        console.error("❌ Account verification failed:", error);
        process.exit(1);
    }
}

verifyAccount();