//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./DataTypes.sol";
import "./libraries/TokenLib.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./external/aave/LendingPoolAddressesProvider.sol";
import "./external/aave/LendingPool.sol";
import "./external/aave/ProtocolDataProvider.sol";

import "./governance/GovTokenHandler.sol";

contract LendPoolCore is Ownable {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;
    using TokenLib for ERC20;

    address public aave;

    constructor(address _aave) {
        aave = _aave;
    }

    function borrow(ERC20 _token, uint256 _amount, address _to) external onlyOwner {
        LendingPoolAddressesProvider provider = LendingPoolAddressesProvider(aave);
        LendingPool pool = LendingPool(provider.getLendingPool());

        uint256 variableRate = 2;
        uint16 referral = 0;

        // request loan
        pool.borrow(address(_token), _amount, variableRate, referral, address(this));

        // transfer borrowed tokens to borrower
        _token.safeTransfer(_to, _amount);
    }

    function deposit(ERC20 _token, uint256 _amount) external onlyOwner {
        LendingPoolAddressesProvider provider = LendingPoolAddressesProvider(aave);
        LendingPool pool = LendingPool(provider.getLendingPool());

        uint16 referral = 0;

        // approve and send to aave
        _token.approve(address(pool), _amount);
        pool.deposit(address(_token), _amount, address(this), referral);
    }

    function withdraw(
        ERC20 _token,
        uint256 _amount,
        address _to
    ) external onlyOwner returns (uint256) {
        LendingPoolAddressesProvider provider = LendingPoolAddressesProvider(aave);
        LendingPool pool = LendingPool(provider.getLendingPool());

        // complete withdrawl
        if (_amount == 0) {
            _amount = type(uint256).max;
        }

        // TODO: wrap pool calls in require
        // withdraw from pool and transfer to user
        uint256 withdrawnAmount = pool.withdraw(address(_token), _amount, address(this));

        // transfer withdraw tokens back to contract
        _token.safeTransfer(_to, withdrawnAmount);

        return withdrawnAmount;
    }

    function getCurrentLiquidity()
        external
        view
        returns (
            uint256 totalCollateral,
            uint256 totalDebt,
            uint256 availableToBorrow,
            uint256 loanToValue,
            uint256 healthFactor
        )
    {
        LendingPoolAddressesProvider provider = LendingPoolAddressesProvider(aave);
        LendingPool pool = LendingPool(provider.getLendingPool());

        // get assets info from market pool
        (totalCollateral, totalDebt, availableToBorrow, , loanToValue, healthFactor) = pool
            .getUserAccountData(address(this));
    }

    function getActiveTokensFromMarket() external view returns (address[] memory tokens) {
        LendingPoolAddressesProvider provider = LendingPoolAddressesProvider(aave);
        LendingPool pool = LendingPool(provider.getLendingPool());

        return pool.getReservesList();
    }

    function getTokenMarketData(
        address _token
    ) external view returns (DataTypes.TokenMarketData memory) {
        // get aave lending pool and data provider
        LendingPoolAddressesProvider provider = LendingPoolAddressesProvider(aave);
        LendingPool pool = LendingPool(provider.getLendingPool());

        DataTypes.TokenMarketData memory tmd;
        tmd.token = _token;

        // get reserve info
        ReserveData memory reserveData = pool.getReserveData(_token);

        tmd.currentBalance = IaToken(reserveData.aTokenAddress).balanceOf(address(this));
        tmd.scaledBalance = IaToken(reserveData.aTokenAddress).scaledBalanceOf(address(this));

        // extract token metadata
        (tmd.tokenName, tmd.tokenSymbol, tmd.tokenDecimals) = ERC20(_token).getMetadata();

        // rates
        tmd.liquidityIndex = reserveData.liquidityIndex;
        tmd.liquidityRate = reserveData.currentLiquidityRate;
        tmd.stableBorrowRate = reserveData.currentStableBorrowRate;
        tmd.variableBorrowRate = reserveData.currentVariableBorrowRate;

        return tmd;
    }
}
