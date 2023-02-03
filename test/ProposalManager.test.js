const { expect, assert } = require("chai");
const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../hardhat-helper-config");
const { moveBlocks } = require("../utils/move-blocks");

const {
    BN, // Big Number support
    constants, // Common constants, like the zero address and largest integers
    expectEvent, // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
    balance,
    time,
} = require("@openzeppelin/test-helpers");
const { parseUnits, formatUnits } = require("ethers/lib/utils");

const ercAbi = [
    // Read-Only Functions
    "function balanceOf(address owner) view returns (uint256)",
    // Authenticated Functions
    "function transfer(address to, uint amount) returns (bool)",
    "function deposit() public payable",
    "function approve(address spender, uint256 amount) returns (bool)",
];

describe("ProposalManager Unit Tests", function () {
    let manager, managerContract;
    let governor, governorContract;
    let tokenHandler, tokenHandlerContract;
    let token, tokenContract;

    const chainId = network.config.chainId;

    const mintGovTokens = async (user) => {
        // mint governance token for deployer
        const WETH = new ethers.Contract(networkConfig[chainId].contracts.WETH, ercAbi, user);
        const amount = hre.ethers.utils.parseEther("2");
        await tokenHandler.mint(user.address, WETH.address, amount);
    };

    const delegate = async (delegateTo) => {
        // delegate gov tokens
        const delegateTx = await token.delegate(delegateTo.address);
        await delegateTx.wait(1);
    };

    beforeEach(async function () {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        user = accounts[1];
        await deployments.fixture("all");

        managerContract = await ethers.getContract("ProposalManager");
        manager = managerContract.connect(deployer);

        governorContract = await ethers.getContract("ProposalsGovernor");
        governor = governorContract.connect(deployer);

        tokenHandlerContract = await ethers.getContract("GovTokenHandler");
        tokenHandler = tokenHandlerContract.connect(deployer);

        tokenContract = await ethers.getContract("GovToken");
        token = tokenContract.connect(deployer);

        mintGovTokens(deployer);
        delegate(deployer);
    });

    describe("all tests", function () {
        it("can only be run through governance", async function () {
            await expect(manager.addProposal(1, "test")).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("proposes, votes, queues, and then executes", async function () {
            const governance = networkConfig[chainId].governance;

            const functionName = "addProposal";
            const id = 1;
            const desc = "test";
            const PROPOSAL_DESCRIPTION = `Proposal ${id}`;

            let balance = await token.balanceOf(deployer.address);
            console.log(`[start] gov tokens supply = ${balance / 10 ** 18}`);

            const encodedFunctionCall = manager.interface.encodeFunctionData(functionName, [
                id,
                desc,
            ]);

            // propose
            const proposeTx = await governor.propose(
                [manager.address],
                [0],
                [encodedFunctionCall],
                PROPOSAL_DESCRIPTION
            );
            const proposeReciept = await proposeTx.wait(1);

            const proposalId = proposeReciept.events[0].args.proposalId;
            let proposalState = await governor.state(proposalId);
            console.log(`[create] Proposal id: ${proposalId} in state ${proposalState}`);
            expect(proposalState).to.eq(0);
            await moveBlocks(governance.VOTING_DELAY + 1);

            // vote
            const voteTx = await governor.castVoteWithReason(proposalId, 1, "i like this proposal");
            await voteTx.wait(1);
            proposalState = await governor.state(proposalId);
            console.log(`[vote casted] Proposal id: ${proposalId} in state ${proposalState}`);
            expect(proposalState).to.eq(1);
            await moveBlocks(governance.VOTING_PERIOD + 10);

            const hasVoted = await governor.hasVoted(proposalId, deployer.address);
            expect(hasVoted).to.eq(true);
            console.log(`deployer has voted: ${hasVoted}`);
            console.log(
                `AgainstVotes: ${(
                    await governor.proposalVotes(proposalId)
                ).againstVotes.toString()}`
            );
            console.log(
                `ForVotes: ${(await governor.proposalVotes(proposalId)).forVotes.toString()}`
            );
            console.log(
                `AbstainVotes: ${(
                    await governor.proposalVotes(proposalId)
                ).abstainVotes.toString()}`
            );
            console.log(
                `Quorum: ${await governor.quorum(
                    proposeReciept.events[0].args.startBlock.toString()
                )}`
            );
            balance = await token.balanceOf(deployer.address);
            console.log(`[after casting vote] gov tokens supply = ${balance / 10 ** 18}`);

            // queue
            const descriptionHash = ethers.utils.id(PROPOSAL_DESCRIPTION);
            const queueTx = await governor.queue(
                [managerContract.address],
                [0],
                [encodedFunctionCall],
                descriptionHash
            );
            await queueTx.wait(1);
            await moveBlocks(1);
            proposalState = await governor.state(proposalId);
            expect(proposalState).to.eq(5);
            console.log(`[queued] Proposal id: ${proposalId} in state ${proposalState}`);

            console.log("Executing...");
            const exTx = await governor.execute(
                [managerContract.address],
                [0],
                [encodedFunctionCall],
                descriptionHash
            );
            await exTx.wait(1);
        });
    });
});
