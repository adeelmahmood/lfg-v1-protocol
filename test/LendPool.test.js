const { expect, assert } = require("chai");
const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../hardhat-helper-config");

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

describe("LendingPool Unit Tests", function () {
    let lendingPoolContract, lendingPool;
    let lendingPoolCore, lendingPoolCoreContract;
    let swapRouterContract, swapRouter;
    const chainId = network.config.chainId;
    let WETH, DAI;

    beforeEach(async function () {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        user = accounts[1];
        await deployments.fixture("all");

        lendingPoolContract = await ethers.getContract("LendPool");
        lendingPool = lendingPoolContract.connect(deployer);

        swapRouterContract = await ethers.getContract("SwapRouter");
        swapRouter = swapRouterContract.connect(deployer);

        lendingPoolCoreContract = await ethers.getContract("LendPoolCore");
        lendingPoolCore = lendingPoolCoreContract.connect(deployer);

        const contracts = networkConfig[chainId].contracts;

        WETH = new ethers.Contract(contracts.WETH, ercAbi, deployer);
        // WETH = await ethers.getContract("WethToken");
        // DAI = await ethers.getContract("DaiToken");
        DAI = new ethers.Contract(contracts.DAI, ercAbi, deployer);
    });

    describe("init", function () {
        it("requires sufficient amount for deposit", async function () {
            const amount = hre.ethers.utils.parseEther("10");

            await expect(lendingPool.deposit(DAI.address, amount)).to.be.revertedWithCustomError(
                lendingPool,
                "LendingPool__InsufficientAmountForDeposit"
            );
        });

        it("emits deposit event", async function () {
            const amount = hre.ethers.utils.parseEther("1");

            // get some weth
            const deposit = await WETH.deposit({
                value: amount,
            });
            await deposit.wait();

            // approve weth for tranfer
            await WETH.approve(swapRouter.address, amount);

            // deposit weth into contract
            await WETH.approve(lendingPool.address, amount);
            await expect(lendingPool.deposit(WETH.address, amount)).to.emit(
                lendingPool,
                "DepositMade"
            );
        });

        it("can deposit WETH", async function () {
            const amount = hre.ethers.utils.parseEther("1");

            // get some weth
            const deposit = await WETH.deposit({
                value: amount,
            });
            await deposit.wait();

            // approve weth for tranfer
            await WETH.approve(swapRouter.address, amount);

            // deposit weth into contract
            await WETH.approve(lendingPool.address, amount);
            await lendingPool.deposit(WETH.address, amount);

            // assert user balance and total supply
            const userBalance = await lendingPool.userBalance(deployer.address, WETH.address);
            expect(Number(userBalance)).to.be.equal(Number(amount));

            // assert user balance is zero
            const finalWethBalance = await WETH.balanceOf(deployer.address);
            expect(Number(finalWethBalance)).to.be.equal(0);
        });

        it("can deposit DAI", async function () {
            const amount = hre.ethers.utils.parseEther("1");

            // get some weth
            const deposit = await WETH.deposit({
                value: amount,
            });
            await deposit.wait();

            // approve weth for tranfer
            await WETH.approve(swapRouter.address, amount);

            // swap weth to dai
            const tx = await swapRouter.swapWETHForDai(amount, { gasLimit: 300000 });
            tx.wait();
            const afterDaiBalance = await DAI.balanceOf(deployer.address);

            // deposit dai into contract
            await DAI.approve(lendingPool.address, afterDaiBalance);
            await lendingPool.deposit(DAI.address, afterDaiBalance);

            // assert user balance and total supply
            const userBalance = await lendingPool.userBalance(deployer.address, DAI.address);
            expect(Number(userBalance)).to.be.equal(Number(afterDaiBalance));

            // assert user balance is zero
            const finalDaiBalance = await DAI.balanceOf(deployer.address);
            expect(Number(finalDaiBalance)).to.be.equal(0);
        });

        it("can deposit WETH and retrieve pool and token status", async function () {
            const amount = hre.ethers.utils.parseEther("1");

            // get some weth
            const deposit = await WETH.deposit({
                value: amount,
            });
            await deposit.wait();

            // approve weth for tranfer
            await WETH.approve(swapRouter.address, amount);

            // deposit weth into contract
            await WETH.approve(lendingPool.address, amount);
            await lendingPool.deposit(WETH.address, amount);

            const poolStats = await lendingPool.getLiquidity();

            const tokensMarketData = await lendingPool.getAvailableTokens();
            tokensMarketData.map((token) => {
                console.log(
                    token.tokenSymbol +
                        "\t" +
                        token.currentBalance +
                        "\t" +
                        token.balanceWithDeriveToken +
                        "\t" +
                        token.scaledBalance
                );
            });
        });
    });
});
