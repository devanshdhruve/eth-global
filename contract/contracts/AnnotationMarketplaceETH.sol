// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AnnotationMarketplaceETH
 * @notice Ethereum version for Blockscout visibility
 * @dev Same logic as Hedera version but uses ERC20 instead of HTS
 */
contract AnnotationMarketplaceETH is Ownable, ReentrancyGuard {
    IERC20 public token;
    uint256 public nextProjectId;

    struct Project {
        address client;
        uint256 totalTasks;
        uint256 rewardPerTask;
        uint256 annotatorShare;
        uint256 reviewerShare;
        uint256 escrowed;
        uint256 paidOut;
        bool completed;
    }

    mapping(uint256 => Project) public projects;
    mapping(uint256 => mapping(address => uint256)) public annotatorSubmitted;
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
        token = IERC20(_token);
    }

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
            escrowed: totalDeposit,
            paidOut: 0,
            completed: false
        });

        require(token.transferFrom(msg.sender, address(this), totalDeposit), "transferFrom failed");

        emit ProjectCreated(projectId, msg.sender, totalTasks, rewardPerTask, annotatorShare, reviewerShare, totalDeposit);
        return projectId;
    }

    function submitAnnotation(uint256 projectId, uint256 taskCount) external nonReentrant {
        require(taskCount > 0, "taskCount zero");
        Project storage p = projects[projectId];
        require(!p.completed, "project completed");

        uint256 reward = (taskCount * p.rewardPerTask * p.annotatorShare) / 100;
        require(p.paidOut + reward <= p.escrowed, "insufficient escrow");

        p.paidOut += reward;
        annotatorSubmitted[projectId][msg.sender] += taskCount;

        require(token.transfer(msg.sender, reward), "annotator payment failed");

        emit AnnotationSubmitted(projectId, msg.sender, taskCount, reward);
    }

    function submitReview(uint256 projectId, uint256 taskCount) external nonReentrant {
        require(taskCount > 0, "taskCount zero");
        Project storage p = projects[projectId];
        require(!p.completed, "project completed");

        uint256 reward = (taskCount * p.rewardPerTask * p.reviewerShare) / 100;
        require(p.paidOut + reward <= p.escrowed, "insufficient escrow");

        p.paidOut += reward;
        reviewerReviewed[projectId][msg.sender] += taskCount;

        require(token.transfer(msg.sender, reward), "reviewer payment failed");

        emit ReviewSubmitted(projectId, msg.sender, taskCount, reward);
    }

    function completeProject(uint256 projectId) external nonReentrant {
        Project storage p = projects[projectId];
        require(msg.sender == p.client, "only client");
        require(!p.completed, "already completed");

        uint256 remaining = p.escrowed - p.paidOut;
        if (remaining > 0) {
            p.paidOut += remaining;
            require(token.transfer(p.client, remaining), "refund failed");
        }

        p.completed = true;
        emit ProjectCompleted(projectId, remaining);
    }

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
