// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

interface IPoolAddressesProvider {
    function getMarketId() external view returns (string memory);

    function getAddress(bytes32 id) external view returns (address);

    function getPool() external view returns (address);

    function getPriceOracle() external view returns (address);
}
