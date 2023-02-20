//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "./ISupplyStrategy.sol";

import "../external/aave/LendingPoolAddressesProvider.sol";
import "../external/aave/LendingPool.sol";

contract EthPriceSupplyStrategy is ISupplyStrategy {
    address public aave;

    constructor(address _aave) {
        aave = _aave;
    }

    function votes(ERC20 _token, uint256 _amount) external view returns (uint256) {
        LendingPoolAddressesProvider provider = LendingPoolAddressesProvider(aave);
        IPriceOracleGetter priceOracle = IPriceOracleGetter(provider.getPriceOracle());

        //   uint256 amountInETH =
        //   IPriceOracleGetter(oracle).getAssetPrice(vars.asset).mul(vars.amount).div(
        //     10**reserve.configuration.getDecimals()
        //   );

        uint256 price = priceOracle.getAssetPrice(address(_token));
        uint256 calcVotes = (price * _amount) / 10 ** 18;

        return calcVotes;
    }
}
