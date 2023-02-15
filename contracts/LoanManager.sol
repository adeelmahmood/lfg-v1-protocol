//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LoanManager is Ownable {
    function issueLoan(address _to, address _asset, uint256 _amount) external view onlyOwner {
        console.log("Issuing big loan to %s for asset %s for amount %s", _to, _asset, _amount);
    }
}
