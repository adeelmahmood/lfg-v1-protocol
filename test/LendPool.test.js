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
    let WETH, DAI, USDT;

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
        DAI = new ethers.Contract(contracts.DAI, ercAbi, deployer);
        USDT = new ethers.Contract(contracts.USDT, ercAbi, deployer);
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
            const deposit = await WETH.deposit({ value: amount });
            await deposit.wait();

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
            const deposit = await WETH.deposit({ value: amount });
            await deposit.wait();

            // deposit weth into contract
            await WETH.approve(lendingPool.address, amount);
            await lendingPool.deposit(WETH.address, amount);

            // assert user balance and total supply
            const userBalance = await lendingPool.userBalance(deployer.address, WETH.address);
            expect(userBalance).to.equal(amount);

            // assert user balance is zero
            const finalWethBalance = await WETH.balanceOf(deployer.address);
            expect(finalWethBalance).to.be.equal(0);
        });

        // it("can deposit USDT", async function () {
        //     const amount = hre.ethers.utils.parseEther("10");

        //     // get some weth
        //     const deposit = await WETH.deposit({ value: amount });
        //     await deposit.wait();

        //     // approve weth for tranfer
        //     await WETH.approve(swapRouter.address, amount);

        //     // swap weth to usdt
        //     const tx = await swapRouter.swap(WETH.address, USDT.address, amount, {
        //         gasLimit: 300000,
        //     });
        //     tx.wait();
        //     const afterDaiBalance = await USDT.balanceOf(deployer.address);

        //     const usdtAmount = hre.ethers.utils.parseUnits("100", 6);

        //     console.log("trying %s", afterDaiBalance);

        //     // deposit usdt into contract
        //     await USDT.approve(lendingPool.address, afterDaiBalance);
        //     await lendingPool.deposit(USDT.address, afterDaiBalance);

        //     // // assert user balance and total supply
        //     // const userBalance = await lendingPool.userBalance(deployer.address, USDT.address);
        //     // expect(userBalance).to.equal(amount);

        //     // // assert user balance is zero
        //     // const finalBalance = await USDT.balanceOf(deployer.address);
        //     // expect(finalBalance).to.be.equal(0);
        // });

        it("can deposit DAI", async function () {
            const amount = hre.ethers.utils.parseEther("1");

            // get some weth
            const deposit = await WETH.deposit({ value: amount });
            await deposit.wait();

            // approve weth for tranfer
            await WETH.approve(swapRouter.address, amount);

            // swap weth to dai
            const tx = await swapRouter.swap(WETH.address, DAI.address, amount, {
                gasLimit: 300000,
            });
            tx.wait();
            const afterDaiBalance = await DAI.balanceOf(deployer.address);

            // deposit dai into contract
            await DAI.approve(lendingPool.address, afterDaiBalance);
            await lendingPool.deposit(DAI.address, afterDaiBalance);

            // assert user balance and total supply
            const userBalance = await lendingPool.userBalance(deployer.address, DAI.address);
            expect(userBalance).to.equal(afterDaiBalance);

            // assert user balance is zero
            const finalDaiBalance = await DAI.balanceOf(deployer.address);
            expect(finalDaiBalance).to.be.equal(0);
        });

        it("can retrieve pool liquidity", async function () {
            const liquidity = await lendingPool.getLiquidity();
            expect(liquidity.totalCollateral).to.be.equal(0);
            expect(liquidity.totalDebt).to.be.equal(0);
            expect(liquidity.availableToBorrow).to.be.equal(0);
            expect(liquidity.loanToValue).to.be.equal(0);
        });

        it("cant retrieve market tokens", async function () {
            const marketTokens = await lendingPool.getAvailableTokens();
            expect(marketTokens.length).to.be.greaterThan(0);

            // grab the first token
            const firstToken = marketTokens[0];
            expect(firstToken.token).to.be.a.properAddress;
        });

        it("can deposit WETH and get updated token balances", async function () {
            const amount = hre.ethers.utils.parseEther("1");

            const depositWeth = async (user, amount) => {
                const deposit = await WETH.connect(user).deposit({ value: amount });
                await deposit.wait();
                await WETH.connect(user).approve(lendingPool.address, amount);
                await lendingPool.connect(user).deposit(WETH.address, amount);
            };

            // deposit WETH from multiple users
            await depositWeth(deployer, amount);
            const balances = await lendingPool.getUserBalances(deployer.address);
            expect(balances.length).to.equal(1);
            expect(Number(balances[0].balance)).to.be.equal(Number(amount));
            expect(Number(balances[0].totalBalance)).to.be.equal(Number(amount));

            await depositWeth(user, amount);
            const balances2 = await lendingPool.connect(user).getUserBalances(user.address);
            expect(balances2.length).to.equal(1);
            expect(Number(balances2[0].balance)).to.be.equal(Number(amount));
            expect(Number(balances2[0].totalBalance)).to.greaterThanOrEqual(Number(amount) * 2);
        });
    });
});
