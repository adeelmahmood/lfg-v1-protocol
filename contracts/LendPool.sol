//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "./LendPoolCore.sol";
import "./DataTypes.sol";
import "./libraries/TokenLib.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LendPool is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;
    using TokenLib for ERC20;

    LendPoolCore core;

    // token address => amount
    mapping(address => uint256) public tokenBalances;
    // user address => token address => amount
    mapping(address => mapping(address => uint256)) public userBalances;
    // deposited tokens array
    DataTypes.TokenMetadata[] public suppliedTokens;

    /* Events */
    event DepositMade(address indexed user, address indexed token, uint256 amount);

    /* Errors */
    error LendingPool__InsufficientAmountForDeposit();

    constructor(address _core) {
        core = LendPoolCore(_core);
    }

    modifier isOwner(address user) {
        require(user == msg.sender, "data can only be requested by owner");
        _;
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
        // if first deposit for this token, add to tokens array
        addToTokens(_token);

        // forward the tokens to core
        core.deposit(address(_token), _amount);

        // emit deposit event
        emit DepositMade(msg.sender, address(_token), _amount);
    }

    function addToTokens(ERC20 token) internal {
        for (uint256 i; i < suppliedTokens.length; i++) {
            if (suppliedTokens[i].token == address(token)) {
                return;
            }
        }

        // add deposited token info
        DataTypes.TokenMetadata memory tokenMD;
        // extract token metadata
        (tokenMD.name, tokenMD.symbol, tokenMD.decimals) = token.getMetadata();
        tokenMD.token = address(token);
        // add to tokens array
        suppliedTokens.push(tokenMD);
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
        address[] memory activeTokens = core.getActiveTokensFromMarket();

        // gather more info on each token
        DataTypes.TokenMarketData[] memory marketData = new DataTypes.TokenMarketData[](
            activeTokens.length
        );
        for (uint256 i; i < activeTokens.length; i++) {
            marketData[i] = core.getTokenMarketData(activeTokens[i]);
        }

        return marketData;
    }

    function getUserBalances(
        address _user
    ) public view isOwner(_user) returns (DataTypes.TokenMetadata[] memory) {
        uint256 count = 0;
        // find out count of user tokens
        for (uint256 i; i < suppliedTokens.length; i++) {
            if (userBalances[_user][suppliedTokens[i].token] > 0) {
                count++;
            }
        }

        DataTypes.TokenMetadata[] memory balances = new DataTypes.TokenMetadata[](count);
        uint256 index = 0;
        // get all deposited tokens
        for (uint256 i; i < suppliedTokens.length; i++) {
            uint256 _userBalance = userBalances[_user][suppliedTokens[i].token];
            if (_userBalance > 0) {
                DataTypes.TokenMetadata memory md = suppliedTokens[i];
                md.balance = _userBalance;
                // gather user supplied token info
                balances[index++] = md;

                // get token liquidity info from market
                DataTypes.TokenMarketData memory data = core.getTokenMarketData(md.token);
                md.totalBalance = data.currentBalance;
            }
        }

        return balances;
    }

    function userBalance(address _user, address _token) public view returns (uint256) {
        return userBalances[_user][_token];
    }

    function tokenBalance(address _token) public view returns (uint256) {
        return tokenBalances[_token];
    }
}
