// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockReputation {
    mapping(address => uint256) public reputations;
    
    function getReputation(address user) external view returns (uint256) {
        return reputations[user];
    }
    
    function awardReputation(address user, uint256 amount) external {
        reputations[user] += amount;
    }
    
    function setReputation(address user, uint256 amount) external {
        reputations[user] = amount;
    }
}