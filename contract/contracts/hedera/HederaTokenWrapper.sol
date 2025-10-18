// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title HederaTokenWrapper
 * @notice Simplified wrapper for HTS token operations
 * @dev Interacts with HTS precompile at 0x167
 */
contract HederaTokenWrapper {
    
    address constant HTS_PRECOMPILE = address(0x167);
    int32 constant SUCCESS = 22;

    // Events
    event HTSTransfer(address indexed token, address indexed from, address indexed to, int64 amount);
    event HTSError(int32 responseCode);

    /**
     * @notice Transfer tokens from this contract to recipient
     * @param token HTS token address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function htsTransfer(
        address token,
        address to,
        int64 amount
    ) internal returns (bool) {
        require(token != address(0), "Invalid token");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");

        (bool success, bytes memory result) = HTS_PRECOMPILE.call(
            abi.encodeWithSignature(
                "transferToken(address,address,address,int64)",
                token,
                address(this),
                to,
                amount
            )
        );

        (int32 responseCode) = success && result.length > 0 
            ? abi.decode(result, (int32))
            : int32(-1);

        if (responseCode != SUCCESS) {
            emit HTSError(responseCode);
            return false;
        }

        emit HTSTransfer(token, address(this), to, amount);
        return true;
    }

    /**
     * @notice Transfer tokens from sender to this contract (requires approval)
     * @param token HTS token address
     * @param from Sender address
     * @param to Recipient address (typically address(this))
     * @param amount Amount to transfer
     */
    function htsTransferFrom(
        address token,
        address from,
        address to,
        int64 amount
    ) internal returns (bool) {
        require(token != address(0), "Invalid token");
        require(from != address(0), "Invalid sender");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");

        (bool success, bytes memory result) = HTS_PRECOMPILE.call(
            abi.encodeWithSignature(
                "transferFrom(address,address,address,int64)",
                token,
                from,
                to,
                amount
            )
        );

        (int32 responseCode) = success && result.length > 0
            ? abi.decode(result, (int32))
            : int32(-1);

        if (responseCode != SUCCESS) {
            emit HTSError(responseCode);
            return false;
        }

        emit HTSTransfer(token, from, to, amount);
        return true;
    }

    /**
     * @notice Helper: Convert uint256 to int64 safely
     */
    function toInt64(uint256 value) internal pure returns (int64) {
        require(value <= uint64(type(int64).max), "Value too large");
        return int64(uint64(value));
    }

    /**
     * @notice Helper: Convert Hedera token ID to EVM address
     * @dev For token 0.0.12345: tokenIdToAddress(0, 0, 12345)
     */
    function tokenIdToAddress(
        uint32 shard,
        uint64 realm,
        uint64 num
    ) internal pure returns (address) {
        return address(uint160(uint256(shard) << 128 | uint256(realm) << 64 | uint256(num)));
    }
}