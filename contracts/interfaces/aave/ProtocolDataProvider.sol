// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "./LendingPoolAddressesProvider.sol";

interface ProtocolDataProvider {
    function getUserReserveData(
        address asset,
        address user
    )
        external
        view
        returns (
            uint256 currentATokenBalance,
            uint256 currentStableDebt,
            uint256 currentVariableDebt,
            uint256 principalStableDebt,
            uint256 scaledVariableDebt,
            uint256 stableBorrowRate,
            uint256 liquidityRate,
            uint40 stableRateLastUpdated,
            bool usageAsCollateralEnabled
        );
}
