// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReputationSystem
 * @notice Lightweight reputation system with HCS anchoring for Blockscout visibility
 * @dev Stores minimal data on-chain, detailed feedback on HCS
 */
contract ReputationSystem is Ownable {
    
    // ═══════════════════════════════════════════════════════════
    // EVENTS (for Blockscout visibility)
    // ═══════════════════════════════════════════════════════════
    
    event FeedbackAnchored(
        address indexed annotator,
        address indexed reviewer,
        uint256 score,
        string hcsTopicId,
        bytes32 feedbackHash
    );
    
    // Additional event for Blockscout visibility
    event FeedbackSubmitted(
        address indexed annotator,
        address indexed reviewer,
        uint256 score,
        string domain,
        uint256 timestamp
    );
    
    event ReputationUpdated(
        address indexed annotator,
        uint256 newScore,
        bytes32 merkleRoot
    );
    
    event BatchReputationUpdate(
        address[] annotators,
        uint256[] scores,
        bytes32 merkleRoot
    );
    
    // ═══════════════════════════════════════════════════════════
    // MINIMAL STORAGE (gas efficient)
    // ═══════════════════════════════════════════════════════════
    
    // Latest reputation score per annotator (0-1000)
    mapping(address => uint256) public reputationScores;
    
    // Domain-specific scores (optional)
    mapping(address => mapping(string => uint256)) public domainScores;
    
    // Trusted agent that can update reputation
    address public reputationAgent;
    
    // ═══════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════
    
    constructor() Ownable(msg.sender) {
        reputationAgent = msg.sender;
    }
    
    // ═══════════════════════════════════════════════════════════
    // ANCHORING FUNCTIONS (for HCS transparency)
    // ═══════════════════════════════════════════════════════════
    
    /**
     * @notice Anchor feedback from HCS to blockchain for Blockscout visibility
     * @param annotator The annotator being reviewed
     * @param reviewer The reviewer providing feedback
     * @param score The score given (0-100)
     * @param hcsTopicId The HCS topic ID where detailed feedback is stored
     * @param feedbackHash SHA-256 hash of the full feedback payload
     */
    function anchorFeedback(
        address annotator,
        address reviewer,
        uint256 score,
        string calldata hcsTopicId,
        bytes32 feedbackHash
    ) external onlyOwner {
        require(annotator != address(0), "Invalid annotator");
        require(reviewer != address(0), "Invalid reviewer");
        require(score <= 100, "Score must be <= 100");
        
        emit FeedbackAnchored(annotator, reviewer, score, hcsTopicId, feedbackHash);
    }
    
    /**
     * @notice Submit feedback with blockchain visibility
     * @param annotator The annotator being reviewed
     * @param reviewer The reviewer providing feedback
     * @param score The score given (0-100)
     * @param domain The domain/type of work
     */
    function submitFeedback(
        address annotator,
        address reviewer,
        uint256 score,
        string calldata domain
    ) external {
        require(annotator != address(0), "Invalid annotator");
        require(reviewer != address(0), "Invalid reviewer");
        require(score <= 100, "Score must be <= 100");
        
        emit FeedbackSubmitted(annotator, reviewer, score, domain, block.timestamp);
    }
    
    /**
     * @notice Update reputation score (called by agent after processing HCS feedback)
     * @param annotator The annotator whose reputation is being updated
     * @param newScore The new reputation score (0-1000)
     * @param merkleRoot Merkle root of all feedback for this annotator
     */
    function updateReputation(
        address annotator,
        uint256 newScore,
        bytes32 merkleRoot
    ) external {
        require(msg.sender == reputationAgent, "Only reputation agent");
        require(annotator != address(0), "Invalid annotator");
        require(newScore <= 1000, "Score must be <= 1000");
        
        reputationScores[annotator] = newScore;
        emit ReputationUpdated(annotator, newScore, merkleRoot);
    }
    
    /**
     * @notice Batch update multiple reputation scores
     * @param annotators Array of annotator addresses
     * @param scores Array of new scores
     * @param merkleRoot Merkle root of all feedback
     */
    function batchUpdateReputation(
        address[] calldata annotators,
        uint256[] calldata scores,
        bytes32 merkleRoot
    ) external {
        require(msg.sender == reputationAgent, "Only reputation agent");
        require(annotators.length == scores.length, "Array length mismatch");
        
        for (uint256 i = 0; i < annotators.length; i++) {
            require(annotators[i] != address(0), "Invalid annotator");
            require(scores[i] <= 1000, "Score must be <= 1000");
            reputationScores[annotators[i]] = scores[i];
        }
        
        emit BatchReputationUpdate(annotators, scores, merkleRoot);
    }
    
    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    /**
     * @notice Get reputation score for an annotator
     */
    function getReputation(address annotator) external view returns (uint256) {
        return reputationScores[annotator];
    }
    
    /**
     * @notice Get domain-specific score
     */
    function getDomainScore(address annotator, string calldata domain) external view returns (uint256) {
        return domainScores[annotator][domain];
    }
    
    /**
     * @notice Check if annotator meets minimum reputation
     */
    function meetsMinimum(address annotator, uint256 minimum) external view returns (bool) {
        return reputationScores[annotator] >= minimum;
    }
    
    // ═══════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    /**
     * @notice Set the reputation agent address
     */
    function setReputationAgent(address _agent) external onlyOwner {
        require(_agent != address(0), "Invalid agent");
        reputationAgent = _agent;
    }
    
    /**
     * @notice Emergency function to set reputation (admin only)
     */
    function setReputation(address annotator, uint256 score) external onlyOwner {
        require(annotator != address(0), "Invalid annotator");
        require(score <= 1000, "Score must be <= 1000");
        reputationScores[annotator] = score;
    }
}
