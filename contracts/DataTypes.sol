//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library DataTypes {
    struct PoolLiquidity {
        uint256 totalCollateral;
        uint256 totalDebt;
        uint256 availableToBorrow;
        uint256 loanToValue;
    }

    struct TokenMarketData {
        address token;
        string tokenSymbol;
        string tokenName;
        uint256 tokenDecimals;
        uint256 currentBalance;
        uint256 scaledBalance;
        uint256 liquidityRate;
        uint256 liquidityIndex;
        uint256 stableBorrowRate;
        uint256 variableBorrowRate;
    }

    struct TokenMetadata {
        address token;
        string symbol;
        string name;
        uint256 decimals;
        uint256 balance;
        uint256 totalBalance;
    }
}
