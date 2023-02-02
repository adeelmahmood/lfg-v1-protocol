//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProposalManager is Ownable {
    struct Proposal {
        uint256 id;
        string description;
    }

    Proposal[] public proposals;

    function addProposal(uint256 id, string memory description) external onlyOwner {
        Proposal memory p = Proposal(id, description);
        proposals.push(p);
        console.log("Proposal added %s : %s", id, description);
    }
}
