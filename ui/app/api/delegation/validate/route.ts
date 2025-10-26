import { NextRequest, NextResponse } from "next/server";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { PaymentValidationRequest, PaymentValidationResponse } from "@/types/payment";

export const POST = async (req: NextRequest) => {
  try {
    const validationRequest: PaymentValidationRequest = await req.json();
    const { amount, recipient, projectId, taskId, qualityScore, delegationToken } = validationRequest;

    console.log("🔍 Validating payment request...");
    console.log("💰 Amount:", amount, "HBAR");
    console.log("👤 Recipient:", recipient);
    console.log("📋 Project:", projectId);
    console.log("🎯 Task:", taskId);
    console.log("⭐ Quality Score:", qualityScore);

    // Validate payment using Lit Protocol
    const validation = await validatePaymentWithLit(validationRequest);

    const response: PaymentValidationResponse = {
      approved: validation.approved,
      reason: validation.reason,
      validatedRules: validation.rules
    };

    console.log("✅ Payment validation result:", validation.approved ? "APPROVED" : "DENIED");
    if (!validation.approved) {
      console.log("❌ Reason:", validation.reason);
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error("❌ Payment validation failed:", error);
    return NextResponse.json({
      approved: false,
      reason: `Validation error: ${error.message}`
    }, { status: 500 });
  }
};

async function validatePaymentWithLit(request: PaymentValidationRequest): Promise<{
  approved: boolean;
  reason?: string;
  rules?: any;
}> {
  try {
    // For now, implement basic validation logic
    // In a real implementation, this would use Lit Protocol for validation
    
    // Mock rules for testing
    const mockRules = {
      maxPaymentPerTask: 50,
      maxTotalSpending: 1000,
      timeLimit: "30d",
      qualityThreshold: 0.7,
      allowedPaymentTypes: ["task-completion", "quality-bonus"],
      projectId: "test-project"
    };

    // Check amount limit
    if (request.amount > mockRules.maxPaymentPerTask) {
      return {
        approved: false,
        reason: `Payment amount ${request.amount} exceeds maximum per task limit of ${mockRules.maxPaymentPerTask}`,
        rules: mockRules
      };
    }

    // Check quality threshold
    if (request.qualityScore < mockRules.qualityThreshold) {
      return {
        approved: false,
        reason: `Quality score ${request.qualityScore} is below threshold of ${mockRules.qualityThreshold}`,
        rules: mockRules
      };
    }

    // Check project ID
    if (request.projectId !== mockRules.projectId) {
      return {
        approved: false,
        reason: `Project ID ${request.projectId} does not match delegation project ${mockRules.projectId}`,
        rules: mockRules
      };
    }

    // All checks passed
    return {
      approved: true,
      rules: mockRules
    };

  } catch (error: any) {
    console.error("Payment validation failed:", error);
    return {
      approved: false,
      reason: `Validation error: ${error.message}`
    };
  }
}

// GET endpoint for delegation validation
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: "Missing delegation token" }, { status: 400 });
    }

    // Validate delegation token
    const isValid = await validateDelegationToken(token);

    return NextResponse.json({ valid: isValid });

  } catch (error: any) {
    console.error("Delegation token validation failed:", error);
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
};

async function validateDelegationToken(token: string): Promise<boolean> {
  try {
    // For now, implement basic token validation
    // In a real implementation, this would use Lit Protocol for validation
    
    // Check if token starts with "delegation_" (our mock format)
    if (!token.startsWith("delegation_")) {
      return false;
    }

    // For testing purposes, consider all mock tokens as valid
    return true;

  } catch (error) {
    console.error("Delegation token validation failed:", error);
    return false;
  }
}
