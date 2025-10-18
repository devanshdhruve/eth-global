import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("AnnotationMarketplaceHTS", function () {

    let marketplace: any;
    let mockReputation: any;
    let mockHTSToken: any;
    let owner: HardhatEthersSigner;
    let client: HardhatEthersSigner;
    let annotator1: HardhatEthersSigner;
    let annotator2: HardhatEthersSigner;
    
    const DATASET_URI = "ipfs://some-dataset-hash";
    const TASKS_TOTAL = 10;
    const TASK_REWARD = ethers.parseUnits("100", 8); // HTS uses 8 decimals
    const MIN_REPUTATION = 50;
    const REPUTATION_REWARD = 5;

    async function deployMarketplaceFixture() {
        [owner, client, annotator1, annotator2] = await ethers.getSigners();

        // Deploy Mock HTS Token (simulates HTS precompile behavior)
        const MockHTSTokenFactory = await ethers.getContractFactory("MockHTSToken");
        mockHTSToken = await MockHTSTokenFactory.deploy();
        await mockHTSToken.waitForDeployment();

        // Deploy Mock Reputation System
        const MockReputationFactory = await ethers.getContractFactory("MockReputation");
        mockReputation = await MockReputationFactory.deploy();
        await mockReputation.waitForDeployment();
        
        // Deploy Marketplace
        const MarketplaceFactory = await ethers.getContractFactory("AnnotationMarketplaceHTS");
        marketplace = await MarketplaceFactory.deploy(
            await mockHTSToken.getAddress(),
            await mockReputation.getAddress()
        );
        await marketplace.waitForDeployment();

        // Mint HTS tokens for the client
        const totalProjectCost = BigInt(TASKS_TOTAL) * BigInt(TASK_REWARD);
        await mockHTSToken.mint(client.address, totalProjectCost * 3n);
        
        // Mint small amount to marketplace for association
        await mockHTSToken.mint(await marketplace.getAddress(), 0);

        // Set up reputations
        await mockReputation.setReputation(annotator1.address, 100);
        await mockReputation.setReputation(annotator2.address, 40);

        return { marketplace, mockReputation, mockHTSToken, owner, client, annotator1, annotator2 };
    }

    beforeEach(async function () {
        const fixture = await loadFixture(deployMarketplaceFixture);
        marketplace = fixture.marketplace;
        mockReputation = fixture.mockReputation;
        mockHTSToken = fixture.mockHTSToken;
        owner = fixture.owner;
        client = fixture.client;
        annotator1 = fixture.annotator1;
        annotator2 = fixture.annotator2;
    });

    describe("Project Creation", function () {
        it("Should allow a client to create a new project", async function () {
            const deadline = (await time.latest()) + time.duration.days(7);
            
            await expect(marketplace.connect(client).createProject(
                DATASET_URI,
                TASKS_TOTAL,
                TASK_REWARD,
                deadline,
                MIN_REPUTATION,
                REPUTATION_REWARD
            )).to.emit(marketplace, "ProjectCreated")
              .withArgs(1, client.address, DATASET_URI, TASKS_TOTAL, TASK_REWARD);

            const project = await marketplace.projects(1);
            expect(project.client).to.equal(client.address);
            expect(project.state).to.equal(0);
        });

        it("Should fail if deadline is in the past", async function () {
            const pastDeadline = (await time.latest()) - 1;
            await expect(marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, TASK_REWARD, pastDeadline, MIN_REPUTATION, REPUTATION_REWARD
            )).to.be.revertedWith("Deadline must be in future");
        });

        it("Should fail if tasks total is zero", async function () {
            const deadline = (await time.latest()) + time.duration.days(7);
            await expect(marketplace.connect(client).createProject(
                DATASET_URI, 0, TASK_REWARD, deadline, MIN_REPUTATION, REPUTATION_REWARD
            )).to.be.revertedWith("Must have at least one task");
        });

        it("Should fail if task reward is zero", async function () {
            const deadline = (await time.latest()) + time.duration.days(7);
            await expect(marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, 0, deadline, MIN_REPUTATION, REPUTATION_REWARD
            )).to.be.revertedWith("Reward cannot be zero");
        });
    });

    describe("Funding and Workflow", function () {
        let projectId: number;
        
        beforeEach(async function() {
            const deadline = (await time.latest()) + time.duration.days(7);
            await marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, TASK_REWARD, deadline, MIN_REPUTATION, REPUTATION_REWARD
            );
            projectId = 1;
        });

        it("Should allow the client to deposit funds", async function () {
            const depositAmount = BigInt(TASKS_TOTAL) * BigInt(TASK_REWARD);
            
            await expect(marketplace.connect(client).depositFunds(projectId, depositAmount))
                .to.emit(marketplace, "ProjectFunded")
                .withArgs(projectId, depositAmount);

            const project = await marketplace.projects(projectId);
            expect(project.totalFunds).to.equal(depositAmount);
            expect(project.state).to.equal(1);
        });

        it("Should allow partial funding", async function () {
            const partialAmount = BigInt(5) * BigInt(TASK_REWARD);
            
            await marketplace.connect(client).depositFunds(projectId, partialAmount);

            const project = await marketplace.projects(projectId);
            expect(project.totalFunds).to.equal(partialAmount);
            expect(project.state).to.equal(0);
        });

        it("Should allow an annotator with enough reputation to submit work", async function () {
            const depositAmount = BigInt(TASKS_TOTAL) * BigInt(TASK_REWARD);
            await marketplace.connect(client).depositFunds(projectId, depositAmount);
            
            const submissionURI = "ipfs://submission-hash-1";
            await expect(marketplace.connect(annotator1).submitAnnotation(projectId, submissionURI))
                .to.emit(marketplace, "AnnotationSubmitted")
                .withArgs(projectId, annotator1.address, submissionURI);
                
            const project = await marketplace.projects(projectId);
            expect(project.state).to.equal(2);
            expect(project.fundsLocked).to.be.true;
        });

        it("Should prevent an annotator with insufficient reputation from submitting", async function () {
            const depositAmount = BigInt(TASKS_TOTAL) * BigInt(TASK_REWARD);
            await marketplace.connect(client).depositFunds(projectId, depositAmount);

            await expect(marketplace.connect(annotator2).submitAnnotation(projectId, "uri"))
                .to.be.revertedWith("Insufficient reputation");
        });

        it("Should prevent duplicate submissions", async function () {
            const depositAmount = BigInt(TASKS_TOTAL) * BigInt(TASK_REWARD);
            await marketplace.connect(client).depositFunds(projectId, depositAmount);
            
            await marketplace.connect(annotator1).submitAnnotation(projectId, "ipfs://sub1");
            
            await expect(
                marketplace.connect(annotator1).submitAnnotation(projectId, "ipfs://sub2")
            ).to.be.revertedWith("Already submitted");
        });

        it("Should allow the client to approve a submission and release funds", async function () {
            const depositAmount = BigInt(TASKS_TOTAL) * BigInt(TASK_REWARD);
            await marketplace.connect(client).depositFunds(projectId, depositAmount);
            await marketplace.connect(annotator1).submitAnnotation(projectId, "ipfs://submission-hash-1");
            
            const initialBalance = await mockHTSToken.balanceOf(annotator1.address);
            const initialReputation = await mockReputation.getReputation(annotator1.address);

            await expect(marketplace.connect(client).approveAnnotation(projectId, annotator1.address))
                .to.emit(marketplace, "FundsReleased")
                .withArgs(projectId, annotator1.address, TASK_REWARD);
            
            const finalBalance = await mockHTSToken.balanceOf(annotator1.address);
            expect(finalBalance).to.equal(initialBalance + BigInt(TASK_REWARD));
            
            const finalReputation = await mockReputation.getReputation(annotator1.address);
            expect(finalReputation).to.equal(initialReputation + BigInt(REPUTATION_REWARD));
            
            const project = await marketplace.projects(projectId);
            expect(project.tasksCompleted).to.equal(1);
            expect(project.releasedFunds).to.equal(TASK_REWARD);
        });

        it("Should transition project to Completed when all tasks are approved", async function() {
            const smallProjectTasks = 2;
            const smallProjectReward = ethers.parseUnits("10", 8);
            const deadline = (await time.latest()) + time.duration.days(1);

            await marketplace.connect(client).createProject(
                "uri", smallProjectTasks, smallProjectReward, deadline, 0, 1
            );
            const newProjectId = 2;

            const depositAmount = BigInt(smallProjectTasks) * BigInt(smallProjectReward);
            await marketplace.connect(client).depositFunds(newProjectId, depositAmount);

            await marketplace.connect(annotator1).submitAnnotation(newProjectId, "uri1");
            await marketplace.connect(client).approveAnnotation(newProjectId, annotator1.address);

            await mockReputation.setReputation(annotator2.address, 100);
            await marketplace.connect(annotator2).submitAnnotation(newProjectId, "uri2");
            
            await expect(marketplace.connect(client).approveAnnotation(newProjectId, annotator2.address))
                .to.emit(marketplace, "ProjectStateChanged")
                .withArgs(newProjectId, 3);

            const project = await marketplace.projects(newProjectId);
            expect(project.state).to.equal(3);
        });

        it("Should fail submission if insufficient escrow funds", async function () {
            await marketplace.connect(client).depositFunds(projectId, TASK_REWARD);

            await marketplace.connect(annotator1).submitAnnotation(projectId, "uri1");
            await marketplace.connect(client).approveAnnotation(projectId, annotator1.address);

            await mockReputation.setReputation(annotator2.address, 100);
            await expect(
                marketplace.connect(annotator2).submitAnnotation(projectId, "uri2")
            ).to.be.revertedWith("Insufficient escrow funds");
        });
    });

    describe("Emergency Refund", function() {
        it("Should allow client to refund remaining funds after deadline", async function() {
            const deadline = (await time.latest()) + time.duration.days(7);
            await marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, TASK_REWARD, deadline, MIN_REPUTATION, REPUTATION_REWARD
            );
            const projectId = 1;

            const depositAmount = BigInt(TASKS_TOTAL) * BigInt(TASK_REWARD);
            await marketplace.connect(client).depositFunds(projectId, depositAmount);
            
            await time.increaseTo(deadline + 1);

            const clientInitialBalance = await mockHTSToken.balanceOf(client.address);
            
            await expect(marketplace.connect(client).emergencyRefund(projectId))
                .to.emit(marketplace, "EmergencyRefund")
                .withArgs(projectId, client.address, depositAmount);

            const project = await marketplace.projects(projectId);
            expect(project.state).to.equal(4);

            const clientFinalBalance = await mockHTSToken.balanceOf(client.address);
            expect(clientFinalBalance).to.equal(clientInitialBalance + depositAmount);
        });

        it("Should refund partial funds after some payments released", async function() {
            const deadline = (await time.latest()) + time.duration.days(7);
            await marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, TASK_REWARD, deadline, MIN_REPUTATION, REPUTATION_REWARD
            );
            const projectId = 1;

            const depositAmount = BigInt(TASKS_TOTAL) * BigInt(TASK_REWARD);
            await marketplace.connect(client).depositFunds(projectId, depositAmount);
            
            await marketplace.connect(annotator1).submitAnnotation(projectId, "uri1");
            await marketplace.connect(client).approveAnnotation(projectId, annotator1.address);

            await time.increaseTo(deadline + 1);

            const expectedRefund = BigInt(TASKS_TOTAL - 1) * BigInt(TASK_REWARD);
            const availableFunds = await marketplace.getProjectAvailableFunds(projectId);
            expect(availableFunds).to.equal(expectedRefund);

            const clientInitialBalance = await mockHTSToken.balanceOf(client.address);
            await marketplace.connect(client).emergencyRefund(projectId);

            const clientFinalBalance = await mockHTSToken.balanceOf(client.address);
            expect(clientFinalBalance - clientInitialBalance).to.equal(expectedRefund);
        });

        it("Should fail if deadline has not been reached", async function() {
            const deadline = (await time.latest()) + time.duration.days(7);
            await marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, TASK_REWARD, deadline, MIN_REPUTATION, REPUTATION_REWARD
            );
            const projectId = 1;

            await expect(marketplace.connect(client).emergencyRefund(projectId))
                .to.be.revertedWith("Deadline not reached");
        });

        it("Should fail if project already completed", async function() {
            const deadline = (await time.latest()) + time.duration.days(7);
            await marketplace.connect(client).createProject(
                DATASET_URI, 1, TASK_REWARD, deadline, 0, REPUTATION_REWARD
            );
            const projectId = 1;

            await marketplace.connect(client).depositFunds(projectId, TASK_REWARD);
            await marketplace.connect(annotator1).submitAnnotation(projectId, "uri");
            await marketplace.connect(client).approveAnnotation(projectId, annotator1.address);

            await time.increaseTo(deadline + 1);

            await expect(marketplace.connect(client).emergencyRefund(projectId))
                .to.be.revertedWith("Project already completed");
        });

        it("Should fail if not called by client", async function() {
            const deadline = (await time.latest()) + time.duration.days(7);
            await marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, TASK_REWARD, deadline, MIN_REPUTATION, REPUTATION_REWARD
            );
            const projectId = 1;

            await time.increaseTo(deadline + 1);

            await expect(marketplace.connect(annotator1).emergencyRefund(projectId))
                .to.be.revertedWith("Only client can call");
        });
    });

    describe("View Functions", function() {
        it("Should return correct project details", async function() {
            const deadline = (await time.latest()) + time.duration.days(7);
            await marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, TASK_REWARD, deadline, MIN_REPUTATION, REPUTATION_REWARD
            );

            const details = await marketplace.getProjectDetails(1);
            expect(details.id).to.equal(1);
            expect(details.client).to.equal(client.address);
            expect(details.datasetURI).to.equal(DATASET_URI);
            expect(details.taskReward).to.equal(TASK_REWARD);
            expect(details.tasksTotal).to.equal(TASKS_TOTAL);
        });

        it("Should return correct available funds", async function() {
            const deadline = (await time.latest()) + time.duration.days(7);
            await marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, TASK_REWARD, deadline, MIN_REPUTATION, REPUTATION_REWARD
            );

            const depositAmount = BigInt(TASKS_TOTAL) * BigInt(TASK_REWARD);
            await marketplace.connect(client).depositFunds(1, depositAmount);

            const availableFunds = await marketplace.getProjectAvailableFunds(1);
            expect(availableFunds).to.equal(depositAmount);
        });

        it("Should return client's projects", async function() {
            const deadline = (await time.latest()) + time.duration.days(7);
            
            await marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, TASK_REWARD, deadline, MIN_REPUTATION, REPUTATION_REWARD
            );
            await marketplace.connect(client).createProject(
                DATASET_URI, TASKS_TOTAL, TASK_REWARD, deadline, MIN_REPUTATION, REPUTATION_REWARD
            );

            const projects = await marketplace.getClientProjects(client.address);
            expect(projects.length).to.equal(2);
            expect(projects[0]).to.equal(1);
            expect(projects[1]).to.equal(2);
        });
    });
});