// api/delegation/route.ts - Using Jose instead of jsonwebtoken

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { SignJWT, jwtVerify } from "jose"; // ✅ Use jose instead of jsonwebtoken
import { 
  Client, 
  TopicMessageSubmitTransaction,
  TopicId 
} from "@hashgraph/sdk";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitAbility, LitActionResource } from "@lit-protocol/auth-helpers";
import {
  DelegationRequest,
  DelegationResponse,
  PaymentDelegation,
} from "@/types/payment";

// Environment variables validation
const JWT_SECRET = process.env.JWT_SECRET;
const PROJECT_TOPICS_ID = process.env.PROJECT_TOPICS_ID;
const HEDERA_TESTNET_ACCOUNT_ID = process.env.HEDERA_TESTNET_ACCOUNT_ID;
const HEDERA_TESTNET_PRIVATE_KEY = process.env.HEDERA_TESTNET_PRIVATE_KEY;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Convert JWT_SECRET to Uint8Array for jose
const secret = new TextEncoder().encode(JWT_SECRET);

// In-memory cache for revoked tokens (synced from HCS)
let revokedTokensCache = new Set<string>();
let lastSyncTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute

// Hedera client setup
function getHederaClient(): Client {
  if (!HEDERA_TESTNET_ACCOUNT_ID || !HEDERA_TESTNET_PRIVATE_KEY) {
    throw new Error("Hedera credentials not configured");
  }
  
  const client = Client.forTestnet();
  client.setOperator(HEDERA_TESTNET_ACCOUNT_ID, HEDERA_TESTNET_PRIVATE_KEY);
  return client;
}

// ✅ Create Delegation (POST)
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

    // ✅ 1. Verify signature authenticity
    const recovered = ethers.verifyMessage(signedMessage, clientSignature);
    if (recovered.toLowerCase() !== clientWallet.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Signature verification failed" },
        { status: 401 }
      );
    }

    // ✅ 2. Validate signed message contains timestamp (prevent replay attacks)
    const messageData = parseSignedMessage(signedMessage);
    if (!messageData || Date.now() - messageData.timestamp > 300000) { // 5 min window
      return NextResponse.json(
        { success: false, error: "Invalid or expired signature" },
        { status: 401 }
      );
    }

    // ✅ 3. Create JWT delegation token using jose
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

    // ✅ 4. Create Lit delegation capability (DeCap)
    const litDelegation = await createLitDelegationCapability(clientWallet, rules);

    // ✅ 5. Return combined delegation
    const delegation: PaymentDelegation = {
      token,
      litDelegation,
      rules,
      clientWallet,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(exp * 1000).toISOString(),
      isActive: true,
    };

    console.log("✅ Delegation issued:", delegation.token.substring(0, 20) + "...");

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

// ✅ Validate Delegation (GET)
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
    // Sync revocation list from HCS if cache is stale
    await syncRevocationCache();

    // Check if token is revoked
    const tokenHash = hashToken(token);
    if (revokedTokensCache.has(tokenHash)) {
      return NextResponse.json(
        { valid: false, error: "Token revoked" }, 
        { status: 403 }
      );
    }

    // Verify JWT using jose
    const { payload } = await jwtVerify(token, secret);
    
    return NextResponse.json({ 
      valid: true, 
      decoded: {
        wallet: payload.wallet,
        rules: payload.rules,
        expiresAt: payload.exp ? new Date((payload.exp as number) * 1000).toISOString() : null
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: "Invalid or expired token" }, 
      { status: 401 }
    );
  }
};

// ✅ Revoke Delegation (PUT)
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

    // Verify the revocation signature
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

    // Update local cache
    revokedTokensCache.add(tokenHash);

    console.log("🚫 Token revoked:", tokenHash);

    return NextResponse.json({ 
      success: true, 
      message: "Delegation revoked and recorded on HCS" 
    });
  } catch (error: any) {
    console.error("❌ Revocation failed:", error);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
};

// 🔧 Submit revocation to Hedera Consensus Service
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
    type: "delegation-revocation"
  };

  const transaction = new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(PROJECT_TOPICS_ID))
    .setMessage(JSON.stringify(revocationRecord));

  const response = await transaction.execute(client);
  const receipt = await response.getReceipt(client);

  console.log("⛓️ Revocation recorded on HCS:", receipt.status.toString());
  
  client.close();
}

// 🔄 Sync revocation cache from HCS mirror node
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
            Buffer.from(msg.message, 'base64').toString('utf-8')
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

// 🔧 Create Lit Delegation Capability
async function createLitDelegationCapability(clientWallet: string, rules: any) {
  try {
    const litClient = new LitNodeClient({ 
      litNetwork: "datil-test",
      alertWhenUnauthorized: false 
    });
    await litClient.connect();
    console.log("⚡ Connected to Lit Protocol");

    const resource = new LitActionResource("*");
    const ability = LitAbility.AccessControlConditionDecryption;

    const litCapability = {
      type: "lit-capability",
      resource: resource.toString(),
      ability: ability.toString(),
      issuedBy: clientWallet,
      issuedAt: new Date().toISOString(),
      rules,
    };

    await litClient.disconnect();
    return litCapability;
  } catch (error: any) {
    console.error("⚠️ Lit capability creation failed:", error);
    return {
      type: "mock-lit-capability",
      issuedBy: clientWallet,
      issuedAt: new Date().toISOString(),
      rules,
    };
  }
}

// 🔐 Hash token for privacy (store hash, not raw token)
function hashToken(token: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(token));
}

// 🔐 Generate cryptographic nonce
function generateNonce(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

// 📝 Parse signed message (expecting JSON with timestamp)
function parseSignedMessage(message: string): { timestamp: number } | null {
  try {
    const data = JSON.parse(message);
    if (data.timestamp && typeof data.timestamp === 'number') {
      return data;
    }
  } catch (e) {
    // Not JSON
  }
  return null;
}

// ⏱ Parse time limits like "30d", "12h", etc.
function parseTimeLimit(limit: string): number {
  const match = limit.match(/(\d+)([dhms])/);
  if (!match) throw new Error(`Invalid time format: ${limit}`);

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "d": return value * 24 * 60 * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "m": return value * 60 * 1000;
    case "s": return value * 1000;
    default: throw new Error(`Invalid time unit: ${unit}`);
  }
}