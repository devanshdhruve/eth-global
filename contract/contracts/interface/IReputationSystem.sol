// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReputationSystem {
    function getReputation(address user) external view returns (uint256);
    function awardReputation(address user, uint256 amount) external;
}