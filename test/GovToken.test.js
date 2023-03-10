const { expect, assert } = require("chai");
const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../hardhat-helper-config");
const { impersonateAccount, setBalance } = require("@nomicfoundation/hardhat-network-helpers");

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

describe("GovToken Unit Tests", function () {
    let govTokenContract, govToken;
    let govTokenHandlerContract, govTokenHandler, govTokenHandlerSigner;

    const chainId = network.config.chainId;

    beforeEach(async function () {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        user = accounts[1];
        await deployments.fixture("all");

        govTokenHandlerContract = await ethers.getContract("GovTokenHandler");
        govTokenHandler = govTokenHandlerContract.connect(deployer);

        //this is needed because govToken requires lending pool as owner
        await impersonateAccount(govTokenHandler.address);
        await setBalance(govTokenHandler.address, 100n ** 18n);
        govTokenHandlerSigner = await ethers.getSigner(govTokenHandler.address);

        govTokenContract = await ethers.getContract("GovToken");
        govToken = govTokenContract.connect(deployer);
    });

    describe("init", function () {
        it("can mint governance tokens", async function () {
            const amount = hre.ethers.utils.parseEther("10");

            await govToken.connect(govTokenHandlerSigner).mint(deployer.address, amount);

            const balance = await govToken.balanceOf(deployer.address);
            expect(balance).to.eq(amount);
        });

        it("can burn token", async function () {
            const amount = hre.ethers.utils.parseEther("10");

            await govToken.connect(govTokenHandlerSigner).mint(deployer.address, amount);
            await govToken.approve(govTokenHandler.address, amount);
            await govToken.connect(govTokenHandlerSigner).burnFrom(deployer.address, amount);

            const balance = await govToken.balanceOf(deployer.address);
            expect(balance).to.eq(0);
        });
    });
});
