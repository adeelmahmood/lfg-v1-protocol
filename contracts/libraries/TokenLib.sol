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
    function getMetadata(
        ERC20 token
    ) internal view returns (string memory name, string memory symbol, uint256 decimals) {
        address _token = address(token);

        // MKR_ADDRESS
        if (_token == 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2) {
            symbol = bytes32ToString(IERC20DetailedBytes(_token).symbol());
            name = bytes32ToString(IERC20DetailedBytes(_token).name());
            decimals = IERC20DetailedBytes(_token).decimals();
        } else {
            symbol = IERC20Detailed(_token).symbol();
            name = IERC20Detailed(_token).name();
            decimals = IERC20Detailed(_token).decimals();
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
