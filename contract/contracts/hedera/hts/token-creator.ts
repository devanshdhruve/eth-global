// token-creator.ts
import {
  Client,
  PrivateKey,
  AccountId,
  TokenCreateTransaction,
  TokenAssociateTransaction,
  AccountAllowanceApproveTransaction,
  TransferTransaction,
  TokenId,
  TokenType,
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

const operatorId = AccountId.fromString(process.env.HEDERA_TESTNET_ACCOUNT_ID!);
const operatorKey = PrivateKey.fromString(process.env.HEDERA_TESTNET_OPERATOR_KEY!);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

/**
 * Create a fungible token for the marketplace (e.g. ASI Token)
 */
export async function createFungibleToken(
  name = "ASI Token",
  symbol = "ASI",
  initialSupply = 1_000_000_00 // decimals = 2
) {
  const tx = await new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setTreasuryAccountId(operatorId)
    .setInitialSupply(initialSupply)
    .setDecimals(2)
    .setTokenType(TokenType.FungibleCommon) // ✅ correct enum usage
    .freezeWith(client)
    .sign(operatorKey);

  const resp = await tx.execute(client);
  const receipt = await resp.getReceipt(client);
  const tokenId = receipt.tokenId!;
  console.log(`✔️ Created token: ${tokenId.toString()}`);
  return tokenId.toString();
}

/**
 * Associate an account (or EVM address alias) with a token
 */
export async function associateToken(accountIdOrAlias: string, tokenIdStr: string) {
  const tx = await new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(accountIdOrAlias))
    .setTokenIds([TokenId.fromString(tokenIdStr)])
    .freezeWith(client)
    .sign(operatorKey);

  const resp = await tx.execute(client);
  const receipt = await resp.getReceipt(client);
  console.log(
    `✔️ Associated ${accountIdOrAlias} with token ${tokenIdStr}: ${receipt.status.toString()}`
  );
  return receipt.status.toString();
}

/**
 * Approve allowance for spender (e.g., marketplace escrow contract)
 */
export async function approveSpenderAllowance(
  ownerPrivateKeyWif: string,
  ownerAccountIdStr: string,
  spenderAccountIdStr: string,
  tokenIdStr: string,
  amount: number
) {
  const ownerId = AccountId.fromString(ownerAccountIdStr);
  const ownerKey = PrivateKey.fromString(ownerPrivateKeyWif);

  // ✅ The new SDK expects only 3 args
  const tx = await new AccountAllowanceApproveTransaction()
    .addTokenAllowance(TokenId.fromString(tokenIdStr), AccountId.fromString(spenderAccountIdStr), amount)
    .freezeWith(client)
    .sign(ownerKey);

  const resp = await tx.execute(client);
  const receipt = await resp.getReceipt(client);

  console.log(
    `✔️ ${ownerAccountIdStr} approved ${amount} ${tokenIdStr} to ${spenderAccountIdStr}: ${receipt.status.toString()}`
  );
  return receipt.status.toString();
}


/**
 * Helper: get the token solidity (EVM-compatible) address
 */
export function tokenIdToSolidityAddress(tokenIdStr: string) {
  return TokenId.fromString(tokenIdStr).toSolidityAddress();
}

/**
 * Transfer tokens from treasury (operator) to another account
 */
export async function transferFromTreasuryTo(accountIdStr: string, tokenIdStr: string, amount: number) {
  const tx = await new TransferTransaction()
    .addTokenTransfer(TokenId.fromString(tokenIdStr), operatorId, -amount)
    .addTokenTransfer(TokenId.fromString(tokenIdStr), AccountId.fromString(accountIdStr), amount)
    .freezeWith(client)
    .sign(operatorKey);

  const resp = await tx.execute(client);
  const receipt = await resp.getReceipt(client);
  console.log(`✔️ Transferred ${amount} ${tokenIdStr} to ${accountIdStr}: ${receipt.status.toString()}`);
  return receipt.status.toString();
}

// Example direct runner
if (require.main === module) {
  (async () => {
    const tokenId = await createFungibleToken("ASI Token", "ASI", 1_000_000_00);
    console.log("Token solidity address:", tokenIdToSolidityAddress(tokenId));
  })();
}
