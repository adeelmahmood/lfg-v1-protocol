//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./GovToken.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./ISupplyStrategy.sol";

contract GovTokenHandler {
    GovToken govToken;
    ISupplyStrategy supplyStrategy;

    event GovTokensMinted(address user, address token, uint256 depositedAmount, uint256 votes);
    event GovTokensBurned(address user, address token, uint256 withdrawAmount, uint256 votes);

    constructor(address _govToken, address _supplyStrategy) {
        govToken = GovToken(_govToken);
        supplyStrategy = ISupplyStrategy(_supplyStrategy);
    }

    function mint(address _user, ERC20 _token, uint256 _amount) public {
        uint256 votes = supplyStrategy.votes(_token, _amount);

        // mint governance tokens based on deposited amount
        // and the current suppler handler strategy
        govToken.mint(_user, votes);

        emit GovTokensMinted(_user, address(_token), _amount, votes);
    }

    function burn(address _user, ERC20 _token, uint256 _amount) external {
        uint256 votes = supplyStrategy.votes(_token, _amount);

        require(govToken.balanceOf(_user) >= votes, "Not enough gov tokens to burn");

        // mint governance tokens based on withdrawl amount
        // and the current suppler handler strategy
        govToken.burnFrom(_user, votes);

        emit GovTokensBurned(_user, address(_token), _amount, votes);
    }
}
