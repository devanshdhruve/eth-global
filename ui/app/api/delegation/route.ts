import { NextRequest, NextResponse } from "next/server";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitAbility, LitActionResource } from "@lit-protocol/auth-helpers";
import { ethers } from "ethers";
import { DelegationRequest, DelegationResponse, PaymentDelegation } from "@/types/payment";

export const POST = async (req: NextRequest) => {
  try {
    const delegationRequest: DelegationRequest = await req.json();
    const { clientWallet, rules, clientSignature, signedMessage } = delegationRequest;

    console.log("🔐 Creating payment delegation for client:", clientWallet);
    console.log("📋 Delegation rules:", rules);

    // Validate client signature
    const isValidSignature = await validateClientSignature(
      clientWallet,
      clientSignature,
      signedMessage || "" // Use the signed message if provided
    );

    if (!isValidSignature) {
      return NextResponse.json({
        success: false,
        error: "Invalid client signature"
      }, { status: 400 });
    }

    // Create delegation using Lit Protocol
    const delegation = await createLitDelegation(clientWallet, rules);

    const response: DelegationResponse = {
      success: true,
      delegation: delegation
    };

    console.log("✅ Delegation created successfully:", delegation.token);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error("❌ Delegation creation failed:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};

async function validateClientSignature(
  clientWallet: string,
  signature: string,
  signedMessage: string
): Promise<boolean> {
  try {
    console.log("🔍 Validating client signature...");
    console.log("👤 Client wallet:", clientWallet);
    console.log("📝 Signature:", signature.substring(0, 20) + "...");
    console.log("📄 Signed message:", signedMessage);

    try {
      const recoveredAddress = ethers.verifyMessage(signedMessage, signature);
      console.log("🔍 Recovered address:", recoveredAddress);
      console.log("👤 Expected address:", clientWallet);
      
      const isValid = recoveredAddress.toLowerCase() === clientWallet.toLowerCase();
      console.log("✅ Signature valid:", isValid);
      
      return isValid;
    } catch (verifyError) {
      console.error("❌ Signature verification failed:", verifyError);
      return false;
    }

  } catch (error) {
    console.error("❌ Signature validation error:", error);
    return false;
  }
}

async function createLitDelegation(
  clientWallet: string,
  rules: any
): Promise<PaymentDelegation> {
  try {
    // For now, create a mock delegation since we need to implement the actual Lit Protocol integration
    // In a real implementation, this would use Lit Protocol to create the delegation
    
    const delegationToken = `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + parseTimeLimit(rules.timeLimit)).toISOString();

    const delegation: PaymentDelegation = {
      token: delegationToken,
      rules: rules,
      clientWallet: clientWallet,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt,
      isActive: true
    };

    console.log("✅ Mock delegation created:", delegationToken);
    return delegation;

  } catch (error) {
    console.error("Lit Protocol delegation creation failed:", error);
    throw new Error(`Failed to create delegation: ${error.message}`);
  }
}

function calculateExpiration(timeLimit: string): string {
  const expirationTime = new Date(Date.now() + parseTimeLimit(timeLimit));
  return expirationTime.toISOString();
}

function parseTimeLimit(timeLimit: string): number {
  const match = timeLimit.match(/(\d+)([dhms])/);
  if (!match) {
    throw new Error(`Invalid time limit format: ${timeLimit}`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000; // days to milliseconds
    case 'h': return value * 60 * 60 * 1000;      // hours to milliseconds
    case 'm': return value * 60 * 1000;           // minutes to milliseconds
    case 's': return value * 1000;                // seconds to milliseconds
    default: throw new Error(`Invalid time unit: ${unit}`);
  }
}
