// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.9;
pragma abicoder v2;

interface LendingPoolAddressesProvider {
    function getLendingPool() external view returns (address);

    function getAddress(bytes32 id) external view returns (address);
}
