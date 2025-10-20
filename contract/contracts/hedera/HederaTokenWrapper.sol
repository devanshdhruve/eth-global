// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HederaTokenWrapper
 * @dev Library that wraps Hedera Token Service precompile calls.
 *      Using a library (internal functions) ensures the HTS precompile sees
 *      the calling contract as msg.sender (needed for allowances / transferFrom).
 *
 *      Note: The HTS precompile address on Hedera EVM is at 0x167.
 */
library HederaTokenWrapper {
    address internal constant HTS_PRECOMPILE = address(0x167);

    // The Hedera precompile returns a int32 response code in the returned bytes,
    // where 22 is typically SUCCESS. We decode to int32 and compare.
    int32 internal constant HEDERA_SUCCESS = 22;

    /**
     * @notice Convert uint256 to int64 safely
     */
    function toInt64(uint256 value) internal pure returns (int64) {
        require(value <= uint256(uint64(type(int64).max)), "HederaTokenWrapper: overflow int64");
        int256 intermediate = int256(value);
        return int64(intermediate);
    }

    /**
     * @notice Associate an account/contract with a token
     * @dev Must be called by the account that is being associated (or by a privileged caller depending on your flow).
     */
    function associateToken(address account, address token) internal returns (bool) {
        bytes memory payload = abi.encodeWithSelector(
            bytes4(keccak256("associateToken(address,address)")),
            account,
            token
        );

        (bool ok, bytes memory out) = HTS_PRECOMPILE.call(payload);
        require(ok, "HederaTokenWrapper: associate call failed");
        int32 rc = abi.decode(out, (int32));
        return rc == HEDERA_SUCCESS;
    }

    /**
     * @notice Approve a spender to spend fungible tokens on behalf of the caller (owner).
     * @dev The owner must call this function (or the SDK equivalent) to create the allowance.
     *      NOTE: If called from a contract, that contract is the owner in the precompile context.
     */
    function approveToken(address token, address spender, int64 amount) internal returns (bool) {
        bytes memory payload = abi.encodeWithSelector(
            bytes4(keccak256("approve(address,address,int64)")),
            token,
            spender,
            amount
        );

        (bool ok, bytes memory out) = HTS_PRECOMPILE.call(payload);
        require(ok, "HederaTokenWrapper: approve call failed");
        int32 rc = abi.decode(out, (int32));
        return rc == HEDERA_SUCCESS;
    }

    /**
     * @notice Transfer tokens from `from` to `to` using the caller as the operator of the call (simple transfer).
     * @dev For moving tokens owned by the caller contract/account, caller can call this.
     */
    function transferToken(address token, address from, address to, int64 amount) internal returns (bool) {
        bytes memory payload = abi.encodeWithSelector(
            bytes4(keccak256("transferToken(address,address,address,int64)")),
            token,
            from,
            to,
            amount
        );

        (bool ok, bytes memory out) = HTS_PRECOMPILE.call(payload);
        require(ok, "HederaTokenWrapper: transfer call failed");
        int32 rc = abi.decode(out, (int32));
        return rc == HEDERA_SUCCESS;
    }

    /**
     * @notice Transfer tokens using an allowance (transferFrom-like).
     * @dev Caller must be the spender that was previously approved by `from` (the token owner).
     *      The `from` account must have approved the caller (spender) to transfer `amount`.
     */
    function transferFromToken(address token, address from, address to, int64 amount) internal returns (bool) {
        bytes memory payload = abi.encodeWithSelector(
            bytes4(keccak256("transferFrom(address,address,address,int64)")),
            token,
            from,
            to,
            amount
        );

        (bool ok, bytes memory out) = HTS_PRECOMPILE.call(payload);
        require(ok, "HederaTokenWrapper: transferFrom call failed");
        int32 rc = abi.decode(out, (int32));
        return rc == HEDERA_SUCCESS;
    }
}
