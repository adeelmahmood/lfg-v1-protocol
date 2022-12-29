//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DaiToken is ERC20("Dai Token", "DAI") {
    constructor() {}

    function mint(address _account, uint256 _amount) external {
        _mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount) external {
        _burn(_account, _amount);
    }
}
