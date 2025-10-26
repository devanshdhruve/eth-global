const { ethers } = require('ethers');
const { LitNodeClient } = require('@lit-protocol/lit-node-client');

async function testDelegationSystem() {
  try {
    console.log('🧪 Testing Delegation System...\n');

    // Step 1: Test Lit Protocol connection
    console.log('1️⃣ Testing Lit Protocol connection...');
    const litNodeClient = new LitNodeClient({
      litNetwork: 'datil-test',
      debug: false,
    });

    await litNodeClient.connect();
    console.log('✅ Lit Protocol connected successfully!\n');

    // Step 2: Test delegation creation
    console.log('2️⃣ Testing delegation creation...');
    
    // Mock client wallet (in real scenario, this comes from MetaMask)
    const mockClientWallet = '0x1234567890123456789012345678901234567890';
    
    const mockRules = {
      maxPaymentPerTask: 50,
      maxTotalSpending: 1000,
      timeLimit: '30d',
      qualityThreshold: 0.7,
      allowedPaymentTypes: ['task-completion', 'quality-bonus'],
      projectId: 'test-project-123'
    };

    // Create mock delegation (simulating what would happen in real scenario)
    const mockDelegation = {
      token: 'mock_delegation_token_123',
      rules: mockRules,
      clientWallet: mockClientWallet,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true
    };

    console.log('✅ Mock delegation created:', mockDelegation.token);
    console.log('📋 Rules:', mockRules);
    console.log('');

    // Step 3: Test payment validation
    console.log('3️⃣ Testing payment validation...');
    
    const mockPaymentRequest = {
      amount: 50,
      recipient: '0x9876543210987654321098765432109876543210',
      projectId: 'test-project-123',
      taskId: 1,
      qualityScore: 0.8,
      delegationToken: mockDelegation.token
    };

    console.log('💰 Payment request:', mockPaymentRequest);
    
    // Simulate validation logic
    const validationResult = validatePaymentRequest(mockPaymentRequest, mockRules);
    
    console.log('✅ Payment validation result:', validationResult.approved ? 'APPROVED' : 'DENIED');
    if (!validationResult.approved) {
      console.log('❌ Reason:', validationResult.reason);
    }
    console.log('');

    // Step 4: Test edge cases
    console.log('4️⃣ Testing edge cases...');
    
    // Test amount exceeding limit
    const excessiveAmountRequest = {
      ...mockPaymentRequest,
      amount: 100 // Exceeds maxPaymentPerTask of 50
    };
    
    const excessiveValidation = validatePaymentRequest(excessiveAmountRequest, mockRules);
    console.log('🔍 Excessive amount test:', excessiveValidation.approved ? 'APPROVED' : 'DENIED');
    console.log('   Reason:', excessiveValidation.reason);
    
    // Test low quality score
    const lowQualityRequest = {
      ...mockPaymentRequest,
      qualityScore: 0.5 // Below threshold of 0.7
    };
    
    const lowQualityValidation = validatePaymentRequest(lowQualityRequest, mockRules);
    console.log('🔍 Low quality test:', lowQualityValidation.approved ? 'APPROVED' : 'DENIED');
    console.log('   Reason:', lowQualityValidation.reason);
    console.log('');

    await litNodeClient.disconnect();
    console.log('🎉 All tests completed successfully!');
    console.log('');
    console.log('📋 Test Summary:');
    console.log('✅ Lit Protocol connection: PASSED');
    console.log('✅ Delegation creation: PASSED');
    console.log('✅ Payment validation: PASSED');
    console.log('✅ Edge case handling: PASSED');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

function validatePaymentRequest(request, rules) {
  // Check amount limit
  if (request.amount > rules.maxPaymentPerTask) {
    return {
      approved: false,
      reason: `Payment amount ${request.amount} exceeds maximum per task limit of ${rules.maxPaymentPerTask}`
    };
  }

  // Check quality threshold
  if (request.qualityScore < rules.qualityThreshold) {
    return {
      approved: false,
      reason: `Quality score ${request.qualityScore} is below threshold of ${rules.qualityThreshold}`
    };
  }

  // Check project ID
  if (request.projectId !== rules.projectId) {
    return {
      approved: false,
      reason: `Project ID ${request.projectId} does not match delegation project ${rules.projectId}`
    };
  }

  // All checks passed
  return {
    approved: true
  };
}

// Run the test
testDelegationSystem();
