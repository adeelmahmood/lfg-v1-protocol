//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "./LendPoolCore.sol";
import "./governance/GovTokenHandler.sol";
import "./DataTypes.sol";
import "./libraries/TokenLib.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LendPool is Ownable, ReentrancyGuard {
    // TODO: use safe math for operations
    using SafeMath for uint256;
    using SafeERC20 for ERC20;
    using TokenLib for ERC20;

    LendPoolCore core;
    GovTokenHandler govTokenHandler;

    // token address => amount
    mapping(address => uint256) private tokenBalances;
    // user address => token address => amount
    mapping(address => mapping(address => uint256)) private userBalances;
    // deposited tokens array
    DataTypes.TokenMetadata[] public suppliedTokens;

    /* Events */
    event DepositMade(address indexed user, address indexed token, uint256 amount);
    event WithdrawlMade(address indexed user, address indexed token, uint256 amount);

    /* Errors */
    error LendingPool__InsufficientAmountForDeposit(address user, address token, uint256 balance);
    error LendingPool__WithdrawAmountMoreThanBalance();
    error LendingPool__WithdrawRequestedWithNoBalance();

    constructor(address _core, address _govTokenHandler) {
        core = LendPoolCore(_core);
        govTokenHandler = GovTokenHandler(_govTokenHandler);
    }

    receive() external payable {}

    function deposit(ERC20 _token, uint256 _amount) external nonReentrant {
        address _user = msg.sender;
        address _tokenAddress = address(_token);

        validateAndPrepareDeposit(_user, _token, _amount);

        updateStateForDeposit(_user, _token, _amount);

        // issue governance tokens equivalent to the deposited amount
        govTokenHandler.mint(_user, _token, _amount);

        // forward the tokens to core
        core.deposit(_token, _amount);

        // emit deposit event
        emit DepositMade(_user, _tokenAddress, _amount);
    }

    function validateAndPrepareDeposit(
        address _user,
        ERC20 _token,
        uint256 _amount
    ) internal returns (uint256) {
        address _tokenAddress = address(_token);

        // make sure user has sufficient balance to deposit
        uint256 balance = _token.balanceOf(_user);
        if (balance < _amount) {
            revert LendingPool__InsufficientAmountForDeposit(_user, _tokenAddress, balance);
        }

        // transfer given tokens to lending pool core as that will
        // do the transfer to underlying market pool
        _token.safeTransferFrom(_user, address(core), _amount);

        return balance;
    }

    function updateStateForDeposit(
        address _user,
        ERC20 _token,
        uint256 _amount
    ) internal returns (bool isFirstDeposit, uint256 newTokenBalance, uint256 newUserBalance) {
        address _tokenAddress = address(_token);

        // update balances
        tokenBalances[_tokenAddress] += _amount;
        userBalances[_user][_tokenAddress] += _amount;

        // if first deposit for this token, add to tokens array
        isFirstDeposit = addToTokens(_token);
        newTokenBalance = tokenBalances[_tokenAddress];
        newUserBalance = userBalances[_user][_tokenAddress];
    }

    function withdraw(ERC20 _token, uint256 _amount) external nonReentrant {
        address _user = msg.sender;
        address _tokenAddress = address(_token);

        uint256 balance = validateAndPrepareWithdraw(_user, _token, _amount);

        updateStateForWithdraw(_user, _token, _amount, balance);

        // burn the lend tokens
        govTokenHandler.burn(_user, _token, _amount == 0 ? balance : _amount);

        // forward the request to withdraw to core
        uint256 withdrawnAmount = core.withdraw(_token, _amount, _user);

        // emit withdraw event
        emit WithdrawlMade(_user, _tokenAddress, withdrawnAmount);
    }

    function validateAndPrepareWithdraw(
        address _user,
        ERC20 _token,
        uint256 _amount
    ) internal view returns (uint256) {
        address _tokenAddress = address(_token);

        // check user balance for given token
        // TODO: check GovToken balance as well, may be better to use require for both
        uint256 balance = userBalances[_user][_tokenAddress];
        if (balance == 0) {
            revert LendingPool__WithdrawRequestedWithNoBalance();
        }

        // enough balance to withdraw
        if (balance < _amount) {
            revert LendingPool__WithdrawAmountMoreThanBalance();
        }

        return balance;
    }

    function updateStateForWithdraw(
        address _user,
        ERC20 _token,
        uint256 _amount,
        uint256 balance
    ) internal returns (uint256 newTokenBalance, uint256 newUserBalance) {
        address _tokenAddress = address(_token);

        // update balances
        tokenBalances[_tokenAddress] -= _amount == 0 ? balance : _amount;
        userBalances[_user][_tokenAddress] -= _amount == 0 ? balance : _amount;
        // TODO: update supplied tokens and may be delete token if no balance left

        newTokenBalance = tokenBalances[_tokenAddress];
        newUserBalance = userBalances[_user][_tokenAddress];
    }

    function getLiquidity() external view returns (DataTypes.PoolLiquidity memory) {
        DataTypes.PoolLiquidity memory stats;

        // get pool stats from core
        (stats.totalCollateral, stats.totalDebt, stats.availableToBorrow, stats.loanToValue) = core
            .getCurrentLiquidity();

        return stats;
    }

    function getAvailableTokens(
        address _user
    ) external view returns (DataTypes.TokenMarketData[] memory tokensMarketData) {
        // get all active tokens in the underlying market
        address[] memory activeTokens = core.getActiveTokensFromMarket();

        // gather more info on each token
        DataTypes.TokenMarketData[] memory marketData = new DataTypes.TokenMarketData[](
            activeTokens.length
        );
        for (uint256 i; i < activeTokens.length; i++) {
            marketData[i] = core.getTokenMarketData(activeTokens[i]);

            // get current user wallet balance for this reserve
            uint256 walletBalance = ERC20(activeTokens[i]).balanceOf(_user);
            marketData[i].walletBalance = walletBalance;
        }

        return marketData;
    }

    // TODO: Should this be safe?
    function getDeposits(address _user) public view returns (DataTypes.TokenMetadata[] memory) {
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

    function addToTokens(ERC20 token) internal returns (bool isFirstDeposit) {
        for (uint256 i; i < suppliedTokens.length; i++) {
            if (suppliedTokens[i].token == address(token)) {
                return false;
            }
        }

        isFirstDeposit = true;
        // add deposited token info
        DataTypes.TokenMetadata memory tokenMD;
        // extract token metadata
        (tokenMD.name, tokenMD.symbol, tokenMD.decimals) = token.getMetadata();
        tokenMD.token = address(token);
        // add to tokens array
        suppliedTokens.push(tokenMD);
    }

    function userBalance(address _user, address _token) public view returns (uint256) {
        return userBalances[_user][_token];
    }

    function tokenBalance(address _token) public view returns (uint256) {
        return tokenBalances[_token];
    }

    function getChainId() internal view returns (uint) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }
}
