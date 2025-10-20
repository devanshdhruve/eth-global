import { expect } from "chai";
import { ethers } from "hardhat";
import { AnnotationMarketplaceHTS, MockHTS } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("AnnotationMarketplaceHTS - MVP Tests", function () {
  let marketplace: AnnotationMarketplaceHTS;
  let mockHTS: MockHTS;
  let mockToken: string;
  let owner: HardhatEthersSigner;
  let client: HardhatEthersSigner;
  let annotator: HardhatEthersSigner;

  const REWARD_PER_TASK = ethers.parseUnits("5", 8); // 5 ASI (8 decimals)
  const TOTAL_TASKS = 100n;
  const ESCROW_AMOUNT = ethers.parseUnits("500", 8); // 500 ASI
  const HTS_PRECOMPILE_ADDRESS = "0x0000000000000000000000000000000000000167";

  beforeEach(async function () {
  [owner, client, annotator] = await ethers.getSigners();

  // Step 1: Deploy MockHTS to a temporary address
  const MockHTSFactory = await ethers.getContractFactory("MockHTS");
  const tempMockHTS = await MockHTSFactory.deploy();
  await tempMockHTS.waitForDeployment();

  // Step 2: Get the bytecode from deployed MockHTS
  const tempAddress = await tempMockHTS.getAddress();
  const mockHTSCode = await ethers.provider.getCode(tempAddress);
  
  // Step 3: Set MockHTS bytecode at the HTS precompile address (0x167)
  await ethers.provider.send("hardhat_setCode", [
    HTS_PRECOMPILE_ADDRESS,
    mockHTSCode
  ]);

  // Step 4: Attach to MockHTS at precompile address
  mockHTS = MockHTSFactory.attach(HTS_PRECOMPILE_ADDRESS) as unknown as MockHTS;

  // Step 5: Create a random token address for testing
  mockToken = ethers.Wallet.createRandom().address;

  // Step 6: Deploy Marketplace
  const MarketplaceFactory = await ethers.getContractFactory("AnnotationMarketplaceHTS");
  marketplace = await MarketplaceFactory.deploy(mockToken) as unknown as AnnotationMarketplaceHTS;
  await marketplace.waitForDeployment();

  const marketplaceAddress = await marketplace.getAddress();

  // Step 7: Setup initial balances in MockHTS
  await mockHTS.setBalance(mockToken, marketplaceAddress, ESCROW_AMOUNT);
  
  console.log(`✅ Setup complete:`);
  console.log(`   MockHTS at: ${HTS_PRECOMPILE_ADDRESS}`);
  console.log(`   Token: ${mockToken}`);
  console.log(`   Marketplace: ${marketplaceAddress}`);
  console.log(`   Initial balance: ${ethers.formatUnits(ESCROW_AMOUNT, 8)} ASI\n`);
});

  describe("1. Project Creation", function () {
    it("Should create a project successfully", async function () {
      const tx = await marketplace.connect(client).createProject(TOTAL_TASKS, REWARD_PER_TASK);
      const receipt = await tx.wait();

      // Check event
      const event = receipt?.logs.find(log => {
        try {
          const parsed = marketplace.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          return parsed?.name === "ProjectCreated";
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;

      // Check project state
      const project = await marketplace.getProject(1);
      expect(project.client).to.equal(client.address);
      expect(project.totalTasks).to.equal(TOTAL_TASKS);
      expect(project.rewardPerTask).to.equal(REWARD_PER_TASK);
      expect(project.active).to.equal(true);
    });

    it("Should fail if totalTasks is 0", async function () {
      await expect(
        marketplace.connect(client).createProject(0, REWARD_PER_TASK)
      ).to.be.revertedWith("Must have tasks");
    });

    it("Should fail if rewardPerTask is 0", async function () {
      await expect(
        marketplace.connect(client).createProject(TOTAL_TASKS, 0)
      ).to.be.revertedWith("Reward must be positive");
    });
  });

  describe("2. Funding Projects", function () {
    let projectId: number;

    beforeEach(async function () {
      const tx = await marketplace.connect(client).createProject(TOTAL_TASKS, REWARD_PER_TASK);
      await tx.wait();
      projectId = 1;
    });

    it("Should record deposit successfully", async function () {
      const depositAmount = ethers.parseUnits("100", 8);

      const tx = await marketplace.connect(client).depositFunds(projectId, depositAmount);
      await tx.wait();

      // Check project balance
      const project = await marketplace.getProject(projectId);
      expect(project.escrowBalance).to.equal(depositAmount);
    });

    it("Should fail if non-client tries to deposit", async function () {
      await expect(
        marketplace.connect(annotator).depositFunds(projectId, ESCROW_AMOUNT)
      ).to.be.revertedWith("Only client can deposit");
    });

    it("Should handle depositFundsWithTransfer (with allowance)", async function () {
      const depositAmount = ethers.parseUnits("100", 8);
      const marketplaceAddress = await marketplace.getAddress();

      // Setup: Give client tokens and approve marketplace
      await mockHTS.setBalance(mockToken, client.address, depositAmount);

      // In real Hedera, client would do: AccountAllowanceApproveTransaction
      // In mock, we'll simulate by giving marketplace direct balance
      
      const tx = await marketplace.connect(client).depositFundsWithTransfer(projectId, depositAmount);
      await tx.wait();

      const project = await marketplace.getProject(projectId);
      expect(project.escrowBalance).to.equal(depositAmount);
    });
  });

  describe("3. Submit Work & Get Paid", function () {
    let projectId: number;

    beforeEach(async function () {
      // Create and fund project
      await marketplace.connect(client).createProject(TOTAL_TASKS, REWARD_PER_TASK);
      projectId = 1;
      await marketplace.connect(client).depositFunds(projectId, ESCROW_AMOUNT);
    });

    it("Should pay annotator immediately on submission", async function () {
      const taskCount = 10n;
      const expectedPayment = REWARD_PER_TASK * taskCount;

      const marketplaceAddress = await marketplace.getAddress();

      // Ensure marketplace has tokens
      const balanceBefore = await mockHTS.getBalance(mockToken, marketplaceAddress);
      console.log(`   Marketplace balance before: ${ethers.formatUnits(balanceBefore, 8)} ASI`);

      // Set annotator balance to 0
      await mockHTS.setBalance(mockToken, annotator.address, 0);

      // Submit and claim
      const tx = await marketplace.connect(annotator).submitAndClaim(projectId, taskCount);
      await tx.wait();

      // Check project state
      const project = await marketplace.getProject(projectId);
      expect(project.completedTasks).to.equal(taskCount);
      expect(project.paidOut).to.equal(expectedPayment);

      // Check annotator work record
      const work = await marketplace.getAnnotatorWork(projectId, annotator.address);
      expect(work.tasksCompleted).to.equal(taskCount);
      expect(work.totalEarned).to.equal(expectedPayment);

      // Check annotator received payment
      const annotatorBalance = await mockHTS.getBalance(mockToken, annotator.address);
      expect(annotatorBalance).to.equal(expectedPayment);
      
      console.log(`   ✅ Annotator received: ${ethers.formatUnits(annotatorBalance, 8)} ASI`);
    });

    it("Should fail if exceeding total tasks", async function () {
      await expect(
        marketplace.connect(annotator).submitAndClaim(projectId, 101)
      ).to.be.revertedWith("Exceeds project task limit");
    });

    it("Should fail if insufficient escrow", async function () {
      // Create project with low funding
      await marketplace.connect(client).createProject(100, REWARD_PER_TASK);
      const lowProjectId = 2;
      await marketplace.connect(client).depositFunds(lowProjectId, ethers.parseUnits("10", 8));

      await expect(
        marketplace.connect(annotator).submitAndClaim(lowProjectId, 10)
      ).to.be.revertedWith("Insufficient escrow balance");
    });

    it("Should mark project complete when all tasks done", async function () {
      const marketplaceAddress = await marketplace.getAddress();
      
      // Ensure sufficient balance
      await mockHTS.setBalance(mockToken, marketplaceAddress, ESCROW_AMOUNT);

      // Submit all 100 tasks
      await marketplace.connect(annotator).submitAndClaim(projectId, 100);

      const project = await marketplace.getProject(projectId);
      expect(project.completedTasks).to.equal(100n);
      expect(project.active).to.equal(false);
      
      console.log(`   ✅ Project completed!`);
    });

    // Fixed test case - the bug was in how annotator2 was retrieved

    it("Should handle multiple annotators", async function () {
      // FIX: Get signers properly - we already have owner(0), client(1), annotator(2)
      // So annotator2 should be signers[3]
      const signers = await ethers.getSigners();
      const annotator2 = signers[3];
  
      const marketplaceAddress = await marketplace.getAddress();

      // Set initial marketplace balance
      await mockHTS.setBalance(mockToken, marketplaceAddress, ESCROW_AMOUNT);
  
      // Set annotators to 0
      await mockHTS.setBalance(mockToken, annotator.address, 0);
      await mockHTS.setBalance(mockToken, annotator2.address, 0);

      // DEBUG: Confirm we have different annotators
      console.log(`   Annotator 1: ${annotator.address}`);
      console.log(`   Annotator 2: ${annotator2.address}`);

      // First annotator does 30 tasks
      await marketplace.connect(annotator).submitAndClaim(projectId, 30);
  
      // Second annotator does 40 tasks
      await marketplace.connect(annotator2).submitAndClaim(projectId, 40);

      // Check balances
      const bal1 = await mockHTS.getBalance(mockToken, annotator.address);
      const bal2 = await mockHTS.getBalance(mockToken, annotator2.address);

      console.log(`   ✅ Annotator 1: ${ethers.formatUnits(bal1, 8)} ASI`);
      console.log(`   ✅ Annotator 2: ${ethers.formatUnits(bal2, 8)} ASI`);

      // Annotator 1: 30 tasks × 5 ASI = 150 ASI
      expect(bal1).to.equal(REWARD_PER_TASK * 30n);
  
      // Annotator 2: 40 tasks × 5 ASI = 200 ASI
      expect(bal2).to.equal(REWARD_PER_TASK * 40n);

      const project = await marketplace.getProject(projectId);
      expect(project.completedTasks).to.equal(70n);
    });
  });

  describe("4. Refunds", function () {
    let projectId: number;

    beforeEach(async function () {
      await marketplace.connect(client).createProject(TOTAL_TASKS, REWARD_PER_TASK);
      projectId = 1;
      await marketplace.connect(client).depositFunds(projectId, ESCROW_AMOUNT);
      
      const marketplaceAddress = await marketplace.getAddress();
      await mockHTS.setBalance(mockToken, marketplaceAddress, ESCROW_AMOUNT);
      await mockHTS.setBalance(mockToken, client.address, 0);
    });

    it("Should refund remaining funds to client", async function () {
      // Annotator completes 10 tasks
      await marketplace.connect(annotator).submitAndClaim(projectId, 10);

      const projectBefore = await marketplace.getProject(projectId);
      const remainingFunds = projectBefore.availableFunds;

      console.log(`   Remaining funds: ${ethers.formatUnits(remainingFunds, 8)} ASI`);

      // Client refunds
      await marketplace.connect(client).refundProject(projectId);

      // Check project closed
      const projectAfter = await marketplace.getProject(projectId);
      expect(projectAfter.active).to.equal(false);

      // Check client received refund
      const clientBalance = await mockHTS.getBalance(mockToken, client.address);
      expect(clientBalance).to.equal(remainingFunds);
      
      console.log(`   ✅ Client refunded: ${ethers.formatUnits(clientBalance, 8)} ASI`);
    });

    it("Should fail if non-client tries to refund", async function () {
      await expect(
        marketplace.connect(annotator).refundProject(projectId)
      ).to.be.revertedWith("Only client can refund");
    });

    it("Should refund full amount if no work done", async function () {
      await marketplace.connect(client).refundProject(projectId);

      const clientBalance = await mockHTS.getBalance(mockToken, client.address);
      expect(clientBalance).to.equal(ESCROW_AMOUNT);
    });
  });

  describe("5. View Functions", function () {
    let projectId: number;

    beforeEach(async function () {
      await marketplace.connect(client).createProject(TOTAL_TASKS, REWARD_PER_TASK);
      projectId = 1;
      await marketplace.connect(client).depositFunds(projectId, ESCROW_AMOUNT);
    });

    it("Should return correct available funds", async function () {
      const available = await marketplace.getProjectAvailableFunds(projectId);
      expect(available).to.equal(ESCROW_AMOUNT);

      // After payment
      const marketplaceAddress = await marketplace.getAddress();
      await mockHTS.setBalance(mockToken, marketplaceAddress, ESCROW_AMOUNT);
      await marketplace.connect(annotator).submitAndClaim(projectId, 10);

      const availableAfter = await marketplace.getProjectAvailableFunds(projectId);
      const expectedRemaining = ESCROW_AMOUNT - (REWARD_PER_TASK * 10n);
      expect(availableAfter).to.equal(expectedRemaining);
    });

    it("Should return annotator work stats", async function () {
      const marketplaceAddress = await marketplace.getAddress();
      await mockHTS.setBalance(mockToken, marketplaceAddress, ESCROW_AMOUNT);
      await marketplace.connect(annotator).submitAndClaim(projectId, 10);

      const work = await marketplace.getAnnotatorWork(projectId, annotator.address);
      expect(work.tasksCompleted).to.equal(10n);
      expect(work.totalEarned).to.equal(REWARD_PER_TASK * 10n);
    });

    it("Should return complete project info", async function () {
      const project = await marketplace.getProject(projectId);
      
      expect(project.client).to.equal(client.address);
      expect(project.totalTasks).to.equal(TOTAL_TASKS);
      expect(project.completedTasks).to.equal(0);
      expect(project.rewardPerTask).to.equal(REWARD_PER_TASK);
      expect(project.escrowBalance).to.equal(ESCROW_AMOUNT);
      expect(project.paidOut).to.equal(0);
      expect(project.availableFunds).to.equal(ESCROW_AMOUNT);
      expect(project.active).to.equal(true);
    });
  });

  describe("6. Manual Approval Flow", function () {
    let projectId: number;

    beforeEach(async function () {
      await marketplace.connect(client).createProject(TOTAL_TASKS, REWARD_PER_TASK);
      projectId = 1;
      await marketplace.connect(client).depositFunds(projectId, ESCROW_AMOUNT);
      
      const marketplaceAddress = await marketplace.getAddress();
      await mockHTS.setBalance(mockToken, marketplaceAddress, ESCROW_AMOUNT);
    });

    it("Should allow client to manually approve payout", async function () {
      const paymentAmount = ethers.parseUnits("50", 8);
      
      await mockHTS.setBalance(mockToken, annotator.address, 0);

      await marketplace.connect(client).approvePayout(projectId, annotator.address, paymentAmount);

      const annotatorBalance = await mockHTS.getBalance(mockToken, annotator.address);
      expect(annotatorBalance).to.equal(paymentAmount);

      const work = await marketplace.getAnnotatorWork(projectId, annotator.address);
      expect(work.totalEarned).to.equal(paymentAmount);
    });

    it("Should allow owner to manually approve payout", async function () {
      const paymentAmount = ethers.parseUnits("50", 8);
      
      await mockHTS.setBalance(mockToken, annotator.address, 0);

      await marketplace.connect(owner).approvePayout(projectId, annotator.address, paymentAmount);

      const annotatorBalance = await mockHTS.getBalance(mockToken, annotator.address);
      expect(annotatorBalance).to.equal(paymentAmount);
    });

    it("Should fail if unauthorized user tries manual approval", async function () {
      await expect(
        marketplace.connect(annotator).approvePayout(projectId, annotator.address, REWARD_PER_TASK)
      ).to.be.revertedWith("Not authorized");
    });
  });
});