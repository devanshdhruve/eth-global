import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { SignJWT, jwtVerify } from "jose";
import { Client, TopicMessageSubmitTransaction, TopicId, PrivateKey } from "@hashgraph/sdk";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitActionResource } from "@lit-protocol/auth-helpers";
import {
  DelegationRequest,
  DelegationResponse,
  PaymentDelegation,
} from "@/types/payment";

const JWT_SECRET = process.env.JWT_SECRET;
const PROJECT_TOPICS_ID = process.env.PROJECT_TOPICS_ID;
const HEDERA_TESTNET_ACCOUNT_ID = process.env.HEDERA_TESTNET_ACCOUNT_ID;
const HEDERA_TESTNET_PRIVATE_KEY = process.env.HEDERA_TESTNET_PRIVATE_KEY;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const secret = new TextEncoder().encode(JWT_SECRET);

let revokedTokensCache = new Set<string>();
let lastSyncTimestamp: number = 0;
const CACHE_TTL = 60000;

function getHederaClient(): Client {
  if (!HEDERA_TESTNET_ACCOUNT_ID || !HEDERA_TESTNET_PRIVATE_KEY) {
    throw new Error("Hedera credentials not configured");
  }

  const client = Client.forTestnet();
  client.setOperator(HEDERA_TESTNET_ACCOUNT_ID, PrivateKey.fromStringECDSA(HEDERA_TESTNET_PRIVATE_KEY));
  return client;
}

export const POST = async (req: NextRequest) => {
  try {
    const delegationRequest: DelegationRequest = await req.json();
    const { clientWallet, rules, clientSignature, signedMessage } =
      delegationRequest;

    if (!clientWallet || !clientSignature || !signedMessage || !rules) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("🔐 Creating delegation for:", clientWallet);

    // Verify signature
    const recovered = ethers.verifyMessage(signedMessage, clientSignature);
    if (recovered.toLowerCase() !== clientWallet.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Signature verification failed" },
        { status: 401 }
      );
    }

    // Verify message timestamp
    const messageData = parseSignedMessage(signedMessage);
    if (!messageData || Date.now() - messageData.timestamp > 300000) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired signature" },
        { status: 401 }
      );
    }

    // Create JWT token
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = parseTimeLimit(rules.timeLimit || "30d") / 1000;
    const exp = now + expiresIn;

    const token = await new SignJWT({
      wallet: clientWallet,
      rules,
      nonce: generateNonce(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(secret);

    // Create Lit Protocol delegation capability
    const litDelegation = await createLitDelegationCapability(
      clientWallet,
      rules
    );

    const delegation: PaymentDelegation = {
      token,
      litDelegation,
      rules,
      clientWallet,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(exp * 1000).toISOString(),
      isActive: true,
    };

    console.log("✅ Delegation issued:", delegation.token);
    console.log("   - Wallet:", clientWallet);
    console.log("   - Max per task:", rules.maxPaymentPerTask, "HBAR");
    console.log("   - Max total:", rules.maxTotalSpending, "HBAR");
    console.log("   - Expires:", delegation.expiresAt);

    const response: DelegationResponse = {
      success: true,
      delegation,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("❌ Delegation creation failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
};

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { valid: false, error: "Missing token" },
      { status: 400 }
    );
  }

  try {
    // Sync revocation cache from HCS
    await syncRevocationCache();

    // Check if token is revoked
    const tokenHash = hashToken(token);
    if (revokedTokensCache.has(tokenHash)) {
      return NextResponse.json(
        { valid: false, error: "Token revoked" },
        { status: 403 }
      );
    }

    // Verify JWT token
    const { payload } = await jwtVerify(token, secret);

    return NextResponse.json({
      valid: true,
      decoded: {
        wallet: payload.wallet,
        rules: payload.rules,
        expiresAt: payload.exp
          ? new Date((payload.exp as number) * 1000).toISOString()
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: "Invalid or expired token" },
      { status: 401 }
    );
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { token, wallet, signature } = body;

    if (!token || !wallet || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify revocation signature
    const message = `Revoke delegation: ${token}`;
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Invalid revocation signature" },
        { status: 401 }
      );
    }

    // Submit revocation to HCS
    const tokenHash = hashToken(token);
    await submitRevocationToHCS(tokenHash, wallet);

    // Add to in-memory cache
    revokedTokensCache.add(tokenHash);

    console.log("🚫 Token revoked:", tokenHash);

    return NextResponse.json({
      success: true,
      message: "Delegation revoked and recorded on HCS",
    });
  } catch (error: any) {
    console.error("❌ Revocation failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
};

async function submitRevocationToHCS(tokenHash: string, wallet: string) {
  if (!PROJECT_TOPICS_ID) {
    console.warn("⚠️ HCS not configured, revocation only in memory");
    return;
  }

  const client = getHederaClient();

  const revocationRecord = {
    token: tokenHash,
    revokedBy: wallet,
    revokedAt: new Date().toISOString(),
    type: "delegation-revocation",
  };

  const transaction = new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(PROJECT_TOPICS_ID))
    .setMessage(JSON.stringify(revocationRecord));

  const response = await transaction.execute(client);
  const receipt = await response.getReceipt(client);

  console.log("⛓️ Revocation recorded on HCS:", receipt.status.toString());

  client.close();
}

async function syncRevocationCache() {
  const now = Date.now();

  if (now - lastSyncTimestamp < CACHE_TTL) {
    return;
  }

  if (!PROJECT_TOPICS_ID) {
    return;
  }

  try {
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/topics/${PROJECT_TOPICS_ID}/messages?limit=100`
    );

    const data = await response.json();

    if (data.messages) {
      const newCache = new Set<string>();

      for (const msg of data.messages) {
        try {
          const messageData = JSON.parse(
            Buffer.from(msg.message, "base64").toString("utf-8")
          );

          if (messageData.type === "delegation-revocation") {
            newCache.add(messageData.token);
          }
        } catch (e) {
          console.error("Failed to parse HCS message:", e);
        }
      }

      revokedTokensCache = newCache;
      lastSyncTimestamp = now;
      console.log(`🔄 Synced ${newCache.size} revocations from HCS`);
    }
  } catch (error) {
    console.error("❌ Failed to sync from HCS:", error);
  }
}

async function createLitDelegationCapability(clientWallet: string, rules: any) {
  let litClient;
  try {
    litClient = new LitNodeClient({
      litNetwork: "datil-test",
      alertWhenUnauthorized: false,
    });
    await litClient.connect();
    console.log("⚡ Connected to Lit Protocol");

    const resource = new LitActionResource("*");
    const ability = "lit-action-execution";

    const litCapability = {
      type: "lit-capability",
      resource: resource.toString(),
      ability: ability,
      issuedBy: clientWallet,
      issuedAt: new Date().toISOString(),
      rules,
    };

    console.log("✅ Lit capability created successfully");
    return litCapability;
  } catch (error: any) {
    console.error("❌ Lit capability creation failed:", error);
    throw new Error("Failed to create Lit Protocol capability.");
  } finally {
    if (litClient && litClient.ready) {
      await litClient.disconnect();
    }
  }
}

function hashToken(token: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(token));
}

function generateNonce(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

function parseSignedMessage(message: string): { timestamp: number } | null {
  try {
    const data = JSON.parse(message);
    if (data.timestamp && typeof data.timestamp === "number") {
      return data;
    }
  } catch (e) {
    // Not JSON
  }
  return null;
}

function parseTimeLimit(limit: string): number {
  const match = limit.match(/(\d+)([dhms])/);
  if (!match) throw new Error(`Invalid time format: ${limit}`);

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    case "s":
      return value * 1000;
    default:
      throw new Error(`Invalid time unit: ${unit}`);
  }
}