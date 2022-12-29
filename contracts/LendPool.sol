//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "./LendPoolCore.sol";
import "./DataTypes.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LendPool is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    LendPoolCore core;

    // token address => amount
    mapping(address => uint256) public tokenBalances;
    // user address => token address => amount
    mapping(address => mapping(address => uint256)) public userBalances;

    /* Events */
    event DepositMade(address indexed user, address indexed token, uint256 amount);

    /* Errors */
    error LendingPool__InsufficientAmountForDeposit();

    constructor(address _core) {
        core = LendPoolCore(_core);
    }

    function deposit(ERC20 _token, uint256 _amount) external nonReentrant {
        // make sure user has sufficient balance to deposit
        if (_token.balanceOf(msg.sender) < _amount) {
            revert LendingPool__InsufficientAmountForDeposit();
        }

        // transfer given tokens to lending pool core as that will
        // do the transfer to underlying market pool
        _token.safeTransferFrom(msg.sender, address(core), _amount);

        // update balances
        tokenBalances[address(_token)] += _amount;
        userBalances[msg.sender][address(_token)] += _amount;
        
        // forward the tokens to core
        core.deposit(address(_token), _amount);

        // emit deposit event
        emit DepositMade(msg.sender, address(_token), _amount);
    }

    function getLiquidity() external view returns (DataTypes.PoolLiquidity memory) {
        DataTypes.PoolLiquidity memory stats;

        // get pool stats from core
        (stats.totalCollateral, stats.totalDebt, stats.availableToBorrow, stats.loanToValue) = core
            .getCurrentLiquidity();

        return stats;
    }

    function getAvailableTokens()
        external
        view
        returns (DataTypes.TokenMarketData[] memory tokensMarketData)
    {
        // get all active tokens in the underlying market
        address[] memory tokens = core.getActiveTokensFromMarket();

        // gather more info on each token
        DataTypes.TokenMarketData[] memory marketData = new DataTypes.TokenMarketData[](
            tokens.length
        );
        for (uint256 i; i < tokens.length; i++) {
            marketData[i] = core.getTokenMarketData(tokens[i]);
        }

        return marketData;
    }

    function userBalance(address _user, address _token) public view returns (uint256) {
        return userBalances[_user][_token];
    }

    function tokenBalance(address _token) public view returns (uint256) {
        return tokenBalances[_token];
    }
}
