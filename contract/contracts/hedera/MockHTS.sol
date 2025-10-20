// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockHTS
 * @notice Mock HTS precompile for local testing
 * @dev Deploys at 0x167 to simulate Hedera Token Service
 */
contract MockHTS {
    
    int32 constant SUCCESS = 22;
    
    // Track balances for testing
    mapping(address => mapping(address => int64)) public balances; // token => account => balance
    
    event MockTransfer(address token, address from, address to, int64 amount);
    
    /**
     * @notice Mock transferToken function
     * @dev Simulates HTS transferToken precompile
     */
    function transferToken(
        address token,
        address from,
        address to,
        int64 amount
    ) external returns (int32) {
        require(amount > 0, "Amount must be positive");
        require(balances[token][from] >= amount, "Insufficient balance");
        
        balances[token][from] -= amount;
        balances[token][to] += amount;
        
        emit MockTransfer(token, from, to, amount);
        return SUCCESS;
    }
    
    /**
     * @notice Mock balanceOf function
     */
    function balanceOf(
        address token,
        address account
    ) external view returns (int32, int64) {
        return (SUCCESS, balances[token][account]);
    }
    
    /**
     * @notice Set balance for testing (test helper)
     */
    function setBalance(address token, address account, int64 amount) external {
        balances[token][account] = amount;
    }
    
    /**
     * @notice Get balance for testing (test helper)
     */
    function getBalance(address token, address account) external view returns (int64) {
        return balances[token][account];
    }
}