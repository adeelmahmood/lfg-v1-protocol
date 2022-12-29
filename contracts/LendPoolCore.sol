//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./DataTypes.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./interfaces/aave/LendingPoolAddressesProvider.sol";
import "./interfaces/aave/LendingPool.sol";
import "./interfaces/aave/ProtocolDataProvider.sol";

contract LendPoolCore {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;

    address public aave;

    constructor(address _aave) {
        aave = _aave;
    }

    function deposit(address _token, uint256 _amount) external {
        LendingPoolAddressesProvider provider = LendingPoolAddressesProvider(aave);
        LendingPool pool = LendingPool(provider.getLendingPool());

        uint16 referral = 0;

        // approve and send to aave
        IERC20(_token).approve(address(pool), _amount);
        pool.deposit(_token, _amount, address(this), referral);
    }

    function getCurrentLiquidity()
        external
        view
        returns (
            uint256 totalCollateral,
            uint256 totalDebt,
            uint256 availableToBorrow,
            uint256 loanToValue
        )
    {
        LendingPoolAddressesProvider provider = LendingPoolAddressesProvider(aave);
        LendingPool pool = LendingPool(provider.getLendingPool());

        // get assets info from market pool
        (totalCollateral, totalDebt, availableToBorrow, , loanToValue, ) = pool.getUserAccountData(
            address(this)
        );
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

        ProtocolDataProvider dataProvider = ProtocolDataProvider(
            provider.getAddress(0x0100000000000000000000000000000000000000000000000000000000000000)
        );

        DataTypes.TokenMarketData memory tmd;
        tmd.token = _token;

        // get reserve data for this token
        (tmd.currentBalance, , , , , , , , ) = dataProvider.getUserReserveData(
            _token,
            address(this)
        );

        // get reserve info
        ReserveData memory reserveData = pool.getReserveData(_token);

        tmd.balanceWithDeriveToken = IaToken(reserveData.aTokenAddress).balanceOf(address(this));
        tmd.scaledBalance = IaToken(reserveData.aTokenAddress).scaledBalanceOf(address(this));

        // MKR_ADDRESS
        if (_token == 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2) {
            tmd.tokenSymbol = bytes32ToString(IERC20DetailedBytes(_token).symbol());
            tmd.tokenName = bytes32ToString(IERC20DetailedBytes(_token).name());
            tmd.tokenDecimals = IERC20DetailedBytes(_token).decimals();
        } else {
            tmd.tokenSymbol = IERC20Detailed(_token).symbol();
            tmd.tokenName = IERC20Detailed(_token).name();
            tmd.tokenDecimals = IERC20Detailed(_token).decimals();
        }

        // rates
        tmd.liquidityRate = reserveData.currentLiquidityRate;
        tmd.stableBorrowRate = reserveData.currentStableBorrowRate;
        tmd.variableBorrowRate = reserveData.currentVariableBorrowRate;

        return tmd;
    }

    function bytes32ToString(bytes32 _bytes32) public pure returns (string memory) {
        uint8 i = 0;
        while (i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }
}
