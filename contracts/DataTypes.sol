//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library DataTypes {
    struct PoolLiquidity {
        uint256 totalSupply;
        uint256 totalCollateral;
        uint256 totalDebt;
        uint256 availableToBorrow;
        uint256 loanToValue;
    }

    struct TokenMarketData {
        address token;
        string tokenSymbol;
        string tokenName;
        uint8 tokenDecimals;
        uint256 currentBalance;
        uint256 balanceWithDeriveToken;
        uint256 scaledBalance;
        uint256 liquidityRate;
        uint256 stableBorrowRate;
        uint256 variableBorrowRate;
    }

    struct DepositedToken {
        address token;
        string tokenSymbol;
        string tokenName;
        uint8 tokenDecimals;
    }
}
