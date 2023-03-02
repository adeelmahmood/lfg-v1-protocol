//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "./ISupplyStrategy.sol";

import "../external/aave/IPoolAddressesProvider.sol";
import "../external/aave/IPool.sol";

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract UsdPriceSupplyStrategy is ISupplyStrategy {
    using SafeMath for uint256;

    address public aave;

    constructor(address _aave) {
        aave = _aave;
    }

    function votes(ERC20 _token, uint256 _amount) external view returns (uint256) {
        IPoolAddressesProvider provider = IPoolAddressesProvider(aave);
        IPriceOracleGetter priceOracle = IPriceOracleGetter(provider.getPriceOracle());

        uint256 amountInUsd = IPriceOracleGetter(priceOracle)
            .getAssetPrice(address(_token))
            .mul(_amount)
            .div(10 ** 8);

        return amountInUsd;
    }
}
