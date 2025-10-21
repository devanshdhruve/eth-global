import { ethers } from "hardhat";
import { expect } from "chai";

describe("AnnotationMarketplaceHTS", function () {
  let token: any;
  let marketplace: any;
  let client: any;
  let annotator: any;
  let reviewer: any;

  const REWARD_PER_TASK = ethers.parseUnits("1", 8); // assuming 8 decimals
  const TOTAL_TASKS = 100;
  const ANNOTATOR_SHARE = 50;
  const REVIEWER_SHARE = 50;

  before(async function () {
    [client, annotator, reviewer] = await ethers.getSigners();

    // 1️⃣ Deploy MockHTS token
    const MockHTS = await ethers.getContractFactory("MockHTS");
    token = await MockHTS.deploy("Test HTS", "THTS", 8, ethers.parseUnits("1000000", 8));
    await token.waitForDeployment();
    console.log("✅ MockHTS deployed at:", await token.getAddress());

    // 2️⃣ Deploy AnnotationMarketplaceMock with mock token address
    const Marketplace = await ethers.getContractFactory("AnnotationMarketplaceMock");
    marketplace = await Marketplace.deploy(await token.getAddress());
    await marketplace.waitForDeployment();
    console.log("✅ Marketplace deployed at:", await marketplace.getAddress());

    // 3️⃣ Fund client with mock tokens
    await token.transfer(client.address, ethers.parseUnits("1000", 8));

    // Client approves marketplace to pull tokens
    await token.connect(client).approve(await marketplace.getAddress(), ethers.MaxUint256);
  });

  it("should create a project and deposit tokens into escrow", async function () {
    const totalDeposit = REWARD_PER_TASK * BigInt(TOTAL_TASKS);

    const tx = await marketplace
      .connect(client)
      .createProject(TOTAL_TASKS, REWARD_PER_TASK, ANNOTATOR_SHARE, REVIEWER_SHARE);
    await tx.wait();

    const project = await marketplace.getProject(0);
    expect(project.client).to.equal(client.address);
    expect(project.totalTasks).to.equal(TOTAL_TASKS);
    expect(project.rewardPerTask).to.equal(REWARD_PER_TASK);

    const escrowBalance = await token.balanceOf(await marketplace.getAddress());
    expect(escrowBalance).to.equal(totalDeposit);
    console.log("✅ Project created and escrow funded successfully!");
  });

  it("should auto-pay annotator after submitting tasks", async function () {
    const taskCount = 10;
    const expectedReward = (REWARD_PER_TASK * BigInt(taskCount) * BigInt(ANNOTATOR_SHARE)) / BigInt(100);

    const beforeBal = await token.balanceOf(annotator.address);
    await marketplace.connect(annotator).submitAnnotation(0, taskCount);
    const afterBal = await token.balanceOf(annotator.address);

    expect(afterBal - beforeBal).to.equal(expectedReward);
    console.log(`✅ Annotator auto-paid ${expectedReward.toString()} tokens`);
  });

  it("should auto-pay reviewer after reviewing tasks", async function () {
    const taskCount = 10;
    const expectedReward = (REWARD_PER_TASK * BigInt(taskCount) * BigInt(REVIEWER_SHARE)) / BigInt(100);

    const beforeBal = await token.balanceOf(reviewer.address);
    await marketplace.connect(reviewer).submitReview(0, taskCount);
    const afterBal = await token.balanceOf(reviewer.address);

    expect(afterBal - beforeBal).to.equal(expectedReward);
    console.log(`✅ Reviewer auto-paid ${expectedReward.toString()} tokens`);
  });

  it("should refund remaining escrow to client upon completion", async function () {
    const beforeBal = await token.balanceOf(client.address);
    await marketplace.connect(client).completeProject(0);
    const afterBal = await token.balanceOf(client.address);

    expect(afterBal).to.be.greaterThan(beforeBal);
    console.log("✅ Client refunded remaining escrow!");
  });
});
