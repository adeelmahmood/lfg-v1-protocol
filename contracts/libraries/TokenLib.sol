//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../DataTypes.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

interface IERC20DetailedBytes is IERC20 {
    function name() external view returns (bytes32);

    function symbol() external view returns (bytes32);

    function decimals() external view returns (uint8);
}

interface IERC20Detailed is IERC20 {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);
}

library TokenLib {
    function parseInfo(DataTypes.DepositedToken memory depositedToken, ERC20 token) internal view {
        address tokenAddress = address(token);
        depositedToken.token = tokenAddress;
        // MKR_ADDRESS
        if (tokenAddress == 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2) {
            depositedToken.tokenSymbol = bytes32ToString(
                IERC20DetailedBytes(tokenAddress).symbol()
            );
            depositedToken.tokenName = bytes32ToString(IERC20DetailedBytes(tokenAddress).name());
            depositedToken.tokenDecimals = IERC20DetailedBytes(tokenAddress).decimals();
        } else {
            depositedToken.tokenSymbol = IERC20Detailed(tokenAddress).symbol();
            depositedToken.tokenName = IERC20Detailed(tokenAddress).name();
            depositedToken.tokenDecimals = IERC20Detailed(tokenAddress).decimals();
        }
    }

    function bytes32ToString(bytes32 _bytes32) public pure returns (string memory) {
        uint8 i = 0;
        while (i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }
}
