//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract ProposalsTimeLock is TimelockController {
    constructor(
        uint256 minDelay, // minDelay is how long you have to wait before executing
        address[] memory proposers, // proposers is the list of addresses that can propose
        address[] memory executors, // executors is the list of addresses that can execute
        address admin //`admin`: optional account to be granted admin role; disable with zero address  /**
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
