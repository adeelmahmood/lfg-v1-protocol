//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./DataTypes.sol";
import "./libraries/TokenLib.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./external/aave/IPoolAddressesProvider.sol";
import "./external/aave/IPool.sol";
import "./external/aave/IPoolDataProvider.sol";

import "./governance/GovTokenHandler.sol";

contract LendPoolCore is Ownable {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;
    using TokenLib for ERC20;

    address public aave;

    event FakeEventForDeployment(uint256 one);

    constructor(address _aave) {
        aave = _aave;
    }

    function validateBorrow(
        ERC20 _token,
        uint256 _amount,
        address /*_to*/
    ) external view onlyOwner {
        IPoolAddressesProvider provider = IPoolAddressesProvider(aave);
        IPriceOracleGetter priceOracle = IPriceOracleGetter(provider.getPriceOracle());

        uint256 amountInUsd = IPriceOracleGetter(priceOracle)
            .getAssetPrice(address(_token))
            .mul(_amount)
            .div(10 ** 8)
            .div(10 ** 18); //TODO for non 18 decimals the comparison with availableToBorrow doesnt work because its already div by 18

        (, , uint256 availableToBorrow, , ) = this.getCurrentLiquidity();

        require(amountInUsd < availableToBorrow, "borrow amount more than available to borrow");
    }

    function borrow(ERC20 _token, uint256 _amount, address _to) external onlyOwner {
        IPoolAddressesProvider provider = IPoolAddressesProvider(aave);
        IPool pool = IPool(provider.getPool());

        uint256 variableRate = 2;
        uint16 referral = 0;

        // request loan
        pool.borrow(address(_token), _amount, variableRate, referral, address(this));

        // transfer borrowed tokens to borrower
        _token.safeTransfer(_to, _amount);
    }

    function deposit(ERC20 _token, uint256 _amount) external onlyOwner {
        IPoolAddressesProvider provider = IPoolAddressesProvider(aave);
        IPool pool = IPool(provider.getPool());

        uint16 referral = 0;

        // approve and send to aave
        _token.approve(address(pool), _amount);
        pool.supply(address(_token), _amount, address(this), referral);
    }

    function withdraw(
        ERC20 _token,
        uint256 _amount,
        address _to
    ) external onlyOwner returns (uint256) {
        IPoolAddressesProvider provider = IPoolAddressesProvider(aave);
        IPool pool = IPool(provider.getPool());

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
        IPoolAddressesProvider provider = IPoolAddressesProvider(aave);
        IPool pool = IPool(provider.getPool());

        // get assets info from market pool
        (totalCollateral, totalDebt, availableToBorrow, , loanToValue, healthFactor) = pool
            .getUserAccountData(address(this));

        // convert from base currency to wei
        totalCollateral = totalCollateral.div(10 ** 8);
        totalDebt = totalDebt.div(10 ** 8);
        availableToBorrow = availableToBorrow.div(10 ** 8);
    }

    function getActiveTokensFromMarket() external view returns (address[] memory tokens) {
        IPoolAddressesProvider provider = IPoolAddressesProvider(aave);
        IPool pool = IPool(provider.getPool());

        return pool.getReservesList();
    }

    function getTokenMarketData(
        address _token
    ) external view returns (DataTypes.TokenMarketData memory) {
        // get aave lending pool and data provider
        IPoolAddressesProvider provider = IPoolAddressesProvider(aave);
        IPool pool = IPool(provider.getPool());

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
