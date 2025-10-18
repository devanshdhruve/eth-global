// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockHTSToken {
    string public name = "Mock ASI Token";
    string public symbol = "ASI";
    uint8 public decimals = 8;
    
    mapping(address => uint256) private _balances;
    
    int32 constant SUCCESS = 22;
    
    event Transfer(address indexed from, address indexed to, int64 value);
    
    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    // Simulate HTS transferToken precompile
    function transferToken(
        address token,
        address from,
        address to,
        int64 amount
    ) external returns (int32) {
        require(token == address(this), "Invalid token");
        uint256 value = uint256(uint64(amount));
        require(_balances[from] >= value, "Insufficient balance");
        
        _balances[from] -= value;
        _balances[to] += value;
        
        emit Transfer(from, to, amount);
        return SUCCESS;
    }
    
    // Simulate HTS transferFrom precompile
    function transferFrom(
        address token,
        address from,
        address to,
        int64 amount
    ) external returns (int32) {
        require(token == address(this), "Invalid token");
        uint256 value = uint256(uint64(amount));
        require(_balances[from] >= value, "Insufficient balance");
        
        _balances[from] -= value;
        _balances[to] += value;
        
        emit Transfer(from, to, amount);
        return SUCCESS;
    }
}