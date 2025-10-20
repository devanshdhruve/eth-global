// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../hedera/HederaTokenWrapper.sol";

/**
 * @title AnnotationMarketplaceHTS
 * @notice Escrow-based annotation marketplace using Hedera HTS on-chain transfers.
 *
 * Flow (escrow model):
 * 1) Client uses Hedera SDK to approve marketplace contract as a spender for `depositAmount`.
 * 2) Client calls createProject(totalTasks, rewardPerTask, depositAmount).
 *    The contract pulls depositAmount tokens from client → contract (escrow).
 * 3) Annotator submits work.
 * 4) Client reviews → releasePayment(projectId, annotator, taskCount).
 * 5) When project ends, remaining escrow refunded to client via completeProject().
 */
contract AnnotationMarketplaceHTS is Ownable, ReentrancyGuard {
    using HederaTokenWrapper for *;

    // HTS fungible token used for payments
    address public token;
    uint256 public nextProjectId;

    // ------------------------------------------------------------------------
    // STRUCTS
    // ------------------------------------------------------------------------

    struct Project {
        address client;         // project owner (payer)
        uint256 totalTasks;     // number of annotation tasks
        uint256 rewardPerTask;  // per-task reward (smallest token units)
        uint256 paidOut;        // total paid so far
        bool completed;         // project marked complete
    }

    struct EscrowInfo {
        uint256 totalDeposited; // total tokens deposited
        uint256 balance;        // current tokens held in escrow
        bool active;            // true when escrow is funded
    }

    // ------------------------------------------------------------------------
    // STATE
    // ------------------------------------------------------------------------

    mapping(uint256 => Project) public projects;
    mapping(uint256 => EscrowInfo) public escrows;
    mapping(uint256 => mapping(address => uint256)) public submittedTasks;

    // ------------------------------------------------------------------------
    // EVENTS
    // ------------------------------------------------------------------------

    event ProjectCreated(uint256 indexed projectId, address indexed client, uint256 totalTasks, uint256 rewardPerTask, uint256 deposit);
    event WorkSubmitted(uint256 indexed projectId, address indexed annotator, uint256 taskCount);
    event PaymentReleased(uint256 indexed projectId, address indexed annotator, uint256 amount);
    event ProjectCompleted(uint256 indexed projectId, uint256 refunded);

    // ------------------------------------------------------------------------
    // CONSTRUCTOR
    // ------------------------------------------------------------------------

    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "invalid token");
        token = _token;
    }

    // ------------------------------------------------------------------------
    // 1️⃣ PROJECT CREATION + ESCROW FUNDING
    // ------------------------------------------------------------------------

    function createProject(uint256 totalTasks, uint256 rewardPerTask, uint256 depositAmount)
        external
        nonReentrant
        returns (uint256)
    {
        require(totalTasks > 0, "invalid totalTasks");
        require(rewardPerTask > 0, "invalid reward");
        require(depositAmount == totalTasks * rewardPerTask, "deposit mismatch");

        uint256 projectId = nextProjectId++;
        projects[projectId] = Project({
            client: msg.sender,
            totalTasks: totalTasks,
            rewardPerTask: rewardPerTask,
            paidOut: 0,
            completed: false
        });

        // Transfer tokens from client → contract (escrow)
        int64 amt = HederaTokenWrapper.toInt64(depositAmount);
        bool ok = HederaTokenWrapper.transferFromToken(token, msg.sender, address(this), amt);
        require(ok, "HTS transferFrom failed");

        escrows[projectId] = EscrowInfo({
            totalDeposited: depositAmount,
            balance: depositAmount,
            active: true
        });

        emit ProjectCreated(projectId, msg.sender, totalTasks, rewardPerTask, depositAmount);
        return projectId;
    }

    // ------------------------------------------------------------------------
    // 2️⃣ WORK SUBMISSION
    // ------------------------------------------------------------------------

    function submitWork(uint256 projectId, uint256 taskCount) external nonReentrant {
        require(taskCount > 0, "taskCount zero");
        Project storage p = projects[projectId];
        require(p.client != address(0), "project not found");
        require(!p.completed, "project completed");
        require(escrows[projectId].active, "escrow inactive");

        submittedTasks[projectId][msg.sender] += taskCount;
        emit WorkSubmitted(projectId, msg.sender, taskCount);
    }

    // ------------------------------------------------------------------------
    // 3️⃣ ESCROW RELEASE TO ANNOTATOR
    // ------------------------------------------------------------------------

    function releasePayment(uint256 projectId, address annotator, uint256 taskCount)
        external
        nonReentrant
    {
        require(taskCount > 0, "taskCount zero");
        Project storage p = projects[projectId];
        EscrowInfo storage e = escrows[projectId];

        require(p.client != address(0), "project not found");
        require(!p.completed, "project completed");
        require(msg.sender == p.client, "only client can release");
        require(e.active && e.balance > 0, "escrow empty or inactive");

        uint256 amount = taskCount * p.rewardPerTask;
        require(amount <= e.balance, "insufficient escrow");
        require(submittedTasks[projectId][annotator] >= taskCount, "insufficient submitted tasks");

        // accounting
        submittedTasks[projectId][annotator] -= taskCount;
        e.balance -= amount;
        p.paidOut += amount;

        // transfer tokens contract → annotator
        int64 amt = HederaTokenWrapper.toInt64(amount);
        bool ok = HederaTokenWrapper.transferToken(token, address(this), annotator, amt);
        require(ok, "HTS transfer failed");

        emit PaymentReleased(projectId, annotator, amount);
    }

    // ------------------------------------------------------------------------
    // 4️⃣ COMPLETE PROJECT + REFUND REMAINING ESCROW
    // ------------------------------------------------------------------------

    function completeProject(uint256 projectId) external nonReentrant {
        Project storage p = projects[projectId];
        EscrowInfo storage e = escrows[projectId];

        require(p.client != address(0), "project not found");
        require(!p.completed, "already completed");
        require(msg.sender == p.client, "only client");

        uint256 remaining = e.balance;

        if (remaining > 0) {
            e.balance = 0;
            int64 amt = HederaTokenWrapper.toInt64(remaining);
            bool ok = HederaTokenWrapper.transferToken(token, address(this), p.client, amt);
            require(ok, "HTS refund failed");
        }

        p.completed = true;
        e.active = false;

        emit ProjectCompleted(projectId, remaining);
    }

    // ------------------------------------------------------------------------
    // VIEW HELPERS
    // ------------------------------------------------------------------------

    function getProject(uint256 projectId)
        external
        view
        returns (
            address client,
            uint256 totalTasks,
            uint256 rewardPerTask,
            uint256 paidOut,
            bool completed,
            uint256 totalDeposited,
            uint256 balance
        )
    {
        Project storage p = projects[projectId];
        EscrowInfo storage e = escrows[projectId];
        require(p.client != address(0), "project not found");
        return (
            p.client,
            p.totalTasks,
            p.rewardPerTask,
            p.paidOut,
            p.completed,
            e.totalDeposited,
            e.balance
        );
    }

    function getSubmitted(uint256 projectId, address annotator) external view returns (uint256) {
        return submittedTasks[projectId][annotator];
    }
}
