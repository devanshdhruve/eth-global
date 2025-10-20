// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../hedera/HederaTokenWrapper.sol";

/**
 * @title AnnotationMarketplaceHTS
 * @notice Multi-role annotation marketplace using Hedera HTS with escrowed auto-payments.
 *
 * Flow:
 * - Client creates a project and deposits tokens into escrow (HTS on-chain transferFrom).
 * - Annotators submit completed tasks and receive their share automatically.
 * - Reviewers review tasks and receive their share automatically.
 * - Client can complete the project to refund any remaining escrow.
 */
contract AnnotationMarketplaceHTS is Ownable, ReentrancyGuard {
    using HederaTokenWrapper for *;

    address public token; // HTS token EVM address
    uint256 public nextProjectId;

    struct Project {
        address client;
        uint256 totalTasks;
        uint256 rewardPerTask;    // total reward per task
        uint256 annotatorShare;   // % (e.g. 50 = 50%)
        uint256 reviewerShare;    // % (must sum to 100 with annotatorShare)
        uint256 escrowed;
        uint256 paidOut;
        bool completed;
    }

    mapping(uint256 => Project) public projects;

    // annotator => submitted tasks
    mapping(uint256 => mapping(address => uint256)) public annotatorSubmitted;
    // reviewer => reviewed tasks
    mapping(uint256 => mapping(address => uint256)) public reviewerReviewed;

    event ProjectCreated(
        uint256 indexed projectId,
        address indexed client,
        uint256 totalTasks,
        uint256 rewardPerTask,
        uint256 annotatorShare,
        uint256 reviewerShare,
        uint256 deposit
    );

    event AnnotationSubmitted(uint256 indexed projectId, address indexed annotator, uint256 taskCount, uint256 reward);
    event ReviewSubmitted(uint256 indexed projectId, address indexed reviewer, uint256 taskCount, uint256 reward);
    event ProjectCompleted(uint256 indexed projectId, uint256 refunded);

    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "invalid token");
        token = _token;
    }

    /**
     * @notice Create a new annotation project with given reward distribution
     */
    function createProject(
        uint256 totalTasks,
        uint256 rewardPerTask,
        uint256 annotatorShare,
        uint256 reviewerShare
    ) external nonReentrant returns (uint256) {
        require(totalTasks > 0, "invalid tasks");
        require(rewardPerTask > 0, "invalid reward");
        require(annotatorShare + reviewerShare == 100, "shares must total 100");

        uint256 totalDeposit = totalTasks * rewardPerTask;
        uint256 projectId = nextProjectId++;

        projects[projectId] = Project({
            client: msg.sender,
            totalTasks: totalTasks,
            rewardPerTask: rewardPerTask,
            annotatorShare: annotatorShare,
            reviewerShare: reviewerShare,
            escrowed: 0,
            paidOut: 0,
            completed: false
        });

        // transferFrom client -> contract
        int64 amt = HederaTokenWrapper.toInt64(totalDeposit);
        bool ok = HederaTokenWrapper.transferFromToken(token, msg.sender, address(this), amt);
        require(ok, "HTS transferFrom failed");

        projects[projectId].escrowed = totalDeposit;

        emit ProjectCreated(projectId, msg.sender, totalTasks, rewardPerTask, annotatorShare, reviewerShare, totalDeposit);
        return projectId;
    }

    /**
     * @notice Annotator submits completed work and receives their token share automatically.
     */
    function submitAnnotation(uint256 projectId, uint256 taskCount) external nonReentrant {
        require(taskCount > 0, "taskCount zero");
        Project storage p = projects[projectId];
        require(!p.completed, "project completed");

        uint256 reward = (taskCount * p.rewardPerTask * p.annotatorShare) / 100;
        uint256 available = p.escrowed - p.paidOut;
        require(reward <= available, "insufficient escrow");

        p.paidOut += reward;
        annotatorSubmitted[projectId][msg.sender] += taskCount;

        int64 amt = HederaTokenWrapper.toInt64(reward);
        bool ok = HederaTokenWrapper.transferToken(token, address(this), msg.sender, amt);
        require(ok, "HTS annotator payment failed");

        emit AnnotationSubmitted(projectId, msg.sender, taskCount, reward);
    }

    /**
     * @notice Reviewer reviews work and receives their token share automatically.
     */
    function submitReview(uint256 projectId, uint256 taskCount) external nonReentrant {
        require(taskCount > 0, "taskCount zero");
        Project storage p = projects[projectId];
        require(!p.completed, "project completed");

        uint256 reward = (taskCount * p.rewardPerTask * p.reviewerShare) / 100;
        uint256 available = p.escrowed - p.paidOut;
        require(reward <= available, "insufficient escrow");

        p.paidOut += reward;
        reviewerReviewed[projectId][msg.sender] += taskCount;

        int64 amt = HederaTokenWrapper.toInt64(reward);
        bool ok = HederaTokenWrapper.transferToken(token, address(this), msg.sender, amt);
        require(ok, "HTS reviewer payment failed");

        emit ReviewSubmitted(projectId, msg.sender, taskCount, reward);
    }

    /**
     * @notice Mark project as completed and refund remaining escrow to client
     */
    function completeProject(uint256 projectId) external nonReentrant {
        Project storage p = projects[projectId];
        require(msg.sender == p.client, "only client");
        require(!p.completed, "already completed");

        uint256 remaining = p.escrowed - p.paidOut;
        if (remaining > 0) {
            p.paidOut += remaining;

            int64 amt = HederaTokenWrapper.toInt64(remaining);
            bool ok = HederaTokenWrapper.transferToken(token, address(this), p.client, amt);
            require(ok, "refund failed");
        }

        p.completed = true;
        emit ProjectCompleted(projectId, remaining);
    }

    /* ========== VIEW HELPERS ========== */

    function getProject(uint256 projectId)
        external
        view
        returns (
            address client,
            uint256 totalTasks,
            uint256 rewardPerTask,
            uint256 annotatorShare,
            uint256 reviewerShare,
            uint256 escrowed,
            uint256 paidOut,
            bool completed
        )
    {
        Project storage p = projects[projectId];
        return (p.client, p.totalTasks, p.rewardPerTask, p.annotatorShare, p.reviewerShare, p.escrowed, p.paidOut, p.completed);
    }

    function getAnnotatorProgress(uint256 projectId, address annotator) external view returns (uint256) {
        return annotatorSubmitted[projectId][annotator];
    }

    function getReviewerProgress(uint256 projectId, address reviewer) external view returns (uint256) {
        return reviewerReviewed[projectId][reviewer];
    }
}
