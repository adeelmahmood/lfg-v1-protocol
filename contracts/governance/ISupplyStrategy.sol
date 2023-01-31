//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface ISupplyStrategy {
    function votes(ERC20 _token, uint256 _amount) external view returns (uint256);
}
