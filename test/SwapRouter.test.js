const { expect, assert } = require("chai");
const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../hardhat-helper-config");
const {
    BN, // Big Number support
    constants, // Common constants, like the zero address and largest integers
    expectEvent, // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
    balance,
} = require("@openzeppelin/test-helpers");

const ercAbi = [
    // Read-Only Functions
    "function balanceOf(address owner) view returns (uint256)",
    // Authenticated Functions
    "function transfer(address to, uint amount) returns (bool)",
    "function deposit() public payable",
    "function approve(address spender, uint256 amount) returns (bool)",
];

describe("SwapRouter Unit Tests", function () {
    let swapRouterContract, swapRouter;
    const chainId = network.config.chainId;
    let WETH, DAI;

    beforeEach(async function () {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        user = accounts[1];
        await deployments.fixture("all");

        swapRouterContract = await ethers.getContract("SwapRouter");
        swapRouter = swapRouterContract.connect(deployer);

        const contracts = networkConfig[chainId].contracts;

        WETH = new ethers.Contract(contracts.WETH, ercAbi, deployer);
        // WETH = await ethers.getContract("WethToken");
        // DAI = await ethers.getContract("DaiToken");
        DAI = new ethers.Contract(contracts.DAI, ercAbi, deployer);
    });

    describe("SwapRouter", function () {
        it("can swap weth to dai", async function () {
            const amount = hre.ethers.utils.parseEther("1");
            const deposit = await WETH.deposit({
                value: amount,
            });
            await deposit.wait();

            await WETH.approve(swapRouter.address, amount);

            // get current balances
            const beforeDaiBalance = await DAI.balanceOf(deployer.address);
            const beforeWethBalance = await WETH.balanceOf(deployer.address);

            await expect(swapRouter.swapWETHForDai(beforeWethBalance)).to.emit(
                swapRouter,
                "WethToDaiCompleted"
            );
            // tx.wait();

            // get after balances
            const afterDaiBalance = await DAI.balanceOf(deployer.address);
            const afterWethBalance = await WETH.balanceOf(deployer.address);

            // assert after balances
            expect(Number(afterDaiBalance)).to.be.greaterThan(Number(beforeDaiBalance));
        });
    });
});
