const { expect, assert } = require("chai");
const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { networkConfig, developmentChains, MAX_INT } = require("../hardhat-helper-config");

const {
    BN, // Big Number support
    constants, // Common constants, like the zero address and largest integers
    expectEvent, // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
    balance,
    time,
} = require("@openzeppelin/test-helpers");
const { moveBlocks } = require("../utils/move-blocks");
const { moveTime } = require("../utils/move-time");
const { formatUnits } = require("ethers/lib/utils");

const ercAbi = [
    // Read-Only Functions
    "function balanceOf(address owner) view returns (uint256)",
    // Authenticated Functions
    "function transfer(address to, uint amount) returns (bool)",
    "function deposit() public payable",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function name() public view returns (string memory)",
    "function decimals() public view returns (uint8)",
];

describe("LendingPool Unit Tests", function () {
    let lendingPoolContract, lendingPool;
    let lendingPoolCore, lendingPoolCoreContract;
    let govTokenContract, govToken;
    let govTokenHandler;
    let swapRouterContract, swapRouter;
    let governor, governorContract;
    const chainId = network.config.chainId;
    let WETH, DAI, USDC, borrowTokens;

    const depositWeth = async (user, amount) => {
        const deposit = await WETH.connect(user).deposit({ value: amount });
        await deposit.wait();
        await WETH.connect(user).approve(lendingPool.address, amount);
        await lendingPool.connect(user).deposit(WETH.address, amount);
    };

    const delegate = async (delegateTo) => {
        // delegate gov tokens
        const delegateTx = await govToken.connect(delegateTo).delegate(delegateTo.address);
        await delegateTx.wait(1);
    };

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

        govTokenContract = await ethers.getContract("GovToken");
        govToken = govTokenContract.connect(deployer);

        govTokenHandler = await ethers.getContract("GovTokenHandler");

        governorContract = await ethers.getContract("LoanGovernor");
        governor = governorContract.connect(deployer);

        const contracts = networkConfig[chainId].contracts;

        WETH = new ethers.Contract(contracts.WETH, ercAbi, deployer);
        DAI = new ethers.Contract(contracts.DAI, ercAbi, deployer);
        USDC = new ethers.Contract(contracts.USDC, ercAbi, deployer);

        borrowTokens = await lendingPool.getBorrowTokens();
    });

    describe("lending tests", function () {
        it("requires sufficient amount for deposit", async function () {
            const amount = hre.ethers.utils.parseEther("10");

            await expect(lendingPool.deposit(DAI.address, amount)).to.be.revertedWithCustomError(
                lendingPool,
                "LendingPool__InsufficientAmountForDeposit"
            );
        });

        it("emits deposit event", async function () {
            const amount = hre.ethers.utils.parseEther("10");

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

        it("mints lend token equal to deposited amount", async function () {
            const amount = hre.ethers.utils.parseEther("10");

            // get some weth
            const deposit = await WETH.deposit({ value: amount });
            await deposit.wait();

            const govTokenBeforeBalance = await govTokenContract.balanceOf(deployer.address);
            expect(govTokenBeforeBalance).to.eq(0);

            // deposit weth into contract
            await WETH.approve(lendingPool.address, amount);
            const tx = await lendingPool.deposit(WETH.address, amount);
            await tx.wait(1);

            // check govToken balance
            const govTokenAfterBalance = await govTokenContract.balanceOf(deployer.address);
            expect(govTokenAfterBalance).to.gt(0);
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

        it("can deposit USDC", async function () {
            const amount = hre.ethers.utils.parseEther("10");

            // get some weth
            const deposit = await WETH.deposit({ value: amount });
            await deposit.wait();

            // approve weth for tranfer
            await WETH.approve(swapRouter.address, amount);

            // swap weth to usdc
            const tx = await swapRouter.swap(WETH.address, USDC.address, amount, {
                gasLimit: 300000,
            });
            tx.wait();
            const afterBalance = await USDC.balanceOf(deployer.address);

            // deposit usdc into contract
            await USDC.approve(lendingPool.address, afterBalance);
            await lendingPool.deposit(USDC.address, afterBalance);

            // assert user balance and total supply
            const userBalance = await lendingPool.userBalance(deployer.address, USDC.address);
            expect(userBalance).to.equal(afterBalance);

            // assert user balance is zero
            const finalBalance = await USDC.balanceOf(deployer.address);
            expect(finalBalance).to.be.equal(0);

            // now withdraw the full amount
            govToken.approve(govTokenHandler.address, afterBalance);
            await lendingPool.withdraw(USDC.address, 0);

            // assert user balance
            const balance = await USDC.balanceOf(deployer.address);
            expect(balance).to.be.greaterThanOrEqual(afterBalance);

            // check govToken balance to be zero
            const govTokenBalance = await govToken.balanceOf(deployer.address);
            expect(govTokenBalance).to.eq(0);
        });

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
            const marketTokens = await lendingPool.getAvailableTokens(deployer.address);
            expect(marketTokens.length).to.be.greaterThan(0);

            // grab the first token
            const firstToken = marketTokens[0];
            expect(firstToken.token).to.be.a.properAddress;
        });

        it("cant retrieve borrow tokens", async function () {
            const borrowTokens = await lendingPool.getBorrowTokens();

            expect(borrowTokens.length).is.gt(0);
            borrowTokens.map((token) => {
                expect(token.token).to.be.a.properAddress;
            });
        });

        it("can deposit WETH from multiple users and get updated token balances", async function () {
            const amount = hre.ethers.utils.parseEther("1");

            // deposit WETH from multiple users
            await depositWeth(deployer, amount);
            const balances = await lendingPool.getDeposits(deployer.address);
            expect(balances.length).to.equal(1);
            expect(Number(balances[0].balance)).to.be.equal(Number(amount));
            expect(Number(balances[0].totalBalance)).to.be.equal(Number(amount));

            await depositWeth(user, amount);
            const balances2 = await lendingPool.connect(user).getDeposits(user.address);
            expect(balances2.length).to.equal(1);
            expect(Number(balances2[0].balance)).to.be.equal(Number(amount));
            expect(Number(balances2[0].totalBalance)).to.greaterThanOrEqual(Number(amount) * 2);
        });

        it("cannot withdraw with no balance", async function () {
            const amount = hre.ethers.utils.parseEther("1");

            await expect(lendingPool.withdraw(DAI.address, amount)).to.be.revertedWithCustomError(
                lendingPool,
                "LendingPool__WithdrawRequestedWithNoBalance"
            );
        });

        it("cannot withdraw more than balance", async function () {
            const amount = hre.ethers.utils.parseEther("1");
            const amountMore = hre.ethers.utils.parseEther("2");

            // get some weth
            const deposit = await WETH.deposit({ value: amount });
            await deposit.wait();

            // deposit weth into contract
            await WETH.approve(lendingPool.address, amount);
            await lendingPool.deposit(WETH.address, amount);

            // try to withdraw more than depositted
            await expect(
                lendingPool.withdraw(WETH.address, amountMore)
            ).to.be.revertedWithCustomError(
                lendingPool,
                "LendingPool__WithdrawAmountMoreThanBalance"
            );
        });

        it("can deposit WETH and withdraw the full amount", async function () {
            const amount = hre.ethers.utils.parseEther("1");

            // get some weth
            const deposit = await WETH.deposit({ value: amount });
            await deposit.wait();

            // deposit weth into contract
            await WETH.approve(lendingPool.address, amount);
            await lendingPool.deposit(WETH.address, amount);

            // approve all gov tokens burn
            const govTokensBalanceToBurn = await govToken.balanceOf(deployer.address);
            // this is needed to burn the gov tokens
            await govToken.approve(govTokenHandler.address, govTokensBalanceToBurn);
            await lendingPool.withdraw(WETH.address, 0);

            // assert user balance
            const balance = await WETH.balanceOf(deployer.address);
            expect(balance).to.be.greaterThanOrEqual(amount);

            govToken.approve(lendingPool.address);

            // check govToken balance to be zero
            const govTokenBalance = await govToken.balanceOf(deployer.address);
            expect(govTokenBalance).to.eq(0);
        });
    });

    describe("governance tests", function () {
        const amount = hre.ethers.utils.parseEther("100");

        it("can only run borrow through governance", async function () {
            await expect(lendingPool.borrow(WETH.address, 0, deployer.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("governance using borrow tokens", async function () {
            for (let i = 0; i < borrowTokens.length; i++) {
                const borrowToken = new ethers.Contract(borrowTokens[i].token, ercAbi, deployer);
                const borrowTokenSymbol = await borrowToken.name();
                const borrowTokenDecimals = await borrowToken.decimals();
                const borrowAmount = hre.ethers.utils.parseUnits("10", borrowTokenDecimals);

                console.log("borrowToken %s", borrowTokenSymbol);

                // get some weth
                const deposit = await WETH.deposit({ value: amount });
                await deposit.wait();
                // approve weth for tranfer
                await WETH.approve(swapRouter.address, amount);

                // swap weth to borrow token
                const tx = await swapRouter.swap(WETH.address, borrowToken.address, amount, {
                    gasLimit: 300000,
                });
                tx.wait();
                const afterBalance = await borrowToken.balanceOf(deployer.address);
                console.log("afterBalance %s", afterBalance);

                // deposit borrowToken into contract
                await borrowToken.approve(lendingPool.address, afterBalance);
                await lendingPool.deposit(borrowToken.address, afterBalance);

                await delegate(deployer);

                const governance = networkConfig[chainId].governance;

                const functionName = "borrow";
                const PROPOSAL_DESCRIPTION = `Borrow Propopsal`;

                let balance = await govToken.balanceOf(deployer.address);
                console.log(`[start] gov tokens supply = ${balance}`);

                const args = [borrowToken.address, borrowAmount, user.address];

                const encodedFunctionCall = lendingPool.interface.encodeFunctionData(
                    functionName,
                    args
                );

                // propose
                const proposeTx = await governor.propose(
                    [lendingPool.address],
                    [0],
                    [encodedFunctionCall],
                    PROPOSAL_DESCRIPTION
                );
                const proposeReciept = await proposeTx.wait(1);
                const proposalId = proposeReciept.events[0].args.proposalId;
                await moveBlocks(governance.VOTING_DELAY);

                // vote
                const voteTx = await governor.castVoteWithReason(proposalId, 1, "like");
                await voteTx.wait(1);

                console.log(
                    `ForVotes before moving blocks: ${
                        (await governor.proposalVotes(proposalId)).forVotes
                    }`
                );

                await moveBlocks(governance.VOTING_PERIOD);
                console.log(
                    `ForVotes after moving blocks: ${
                        (await governor.proposalVotes(proposalId)).forVotes
                    }`
                );

                // queue
                const descriptionHash = ethers.utils.id(PROPOSAL_DESCRIPTION);
                const queueTx = await governor.queue(
                    [lendingPool.address],
                    [0],
                    [encodedFunctionCall],
                    descriptionHash
                );
                await queueTx.wait(1);
                await moveBlocks(1);
                await moveTime(governance.EXECUTE_DELAY + 1);

                const exTx = await governor.execute(
                    [lendingPool.address],
                    [0],
                    [encodedFunctionCall],
                    descriptionHash
                );
                await exTx.wait(1);

                const userBalance = await borrowToken.balanceOf(user.address);
                expect(userBalance).to.be.eq(borrowAmount);

                const recordedBorrowBalance = await lendingPool.borrowBalance(
                    user.address,
                    borrowToken.address
                );
                expect(recordedBorrowBalance).to.be.eq(borrowAmount);
            }
        });

        it("proposes, votes, queues, and then executes the borrow function", async function () {
            const governance = networkConfig[chainId].governance;

            const borrowToken = new ethers.Contract(borrowTokens[0].token, ercAbi, deployer);
            const borrowTokenDecimals = await borrowToken.decimals();
            const borrowAmount = hre.ethers.utils.parseUnits("10", borrowTokenDecimals);

            await depositWeth(deployer, amount);
            await delegate(deployer);

            const functionName = "borrow";
            const PROPOSAL_DESCRIPTION = `Borrow Propopsal`;

            let balance = await govToken.balanceOf(deployer.address);
            console.log(`[start] gov tokens supply = ${balance}`);

            const args = [WETH.address, borrowAmount, user.address];

            const encodedFunctionCall = lendingPool.interface.encodeFunctionData(
                functionName,
                args
            );

            // propose
            const proposeTx = await governor.propose(
                [lendingPool.address],
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
            const voteTx = await governor.castVoteWithReason(proposalId, 1, "like");
            await voteTx.wait(1);

            console.log(
                `ForVotes before moving blocks: ${(
                    await governor.proposalVotes(proposalId)
                ).forVotes.toString()}`
            );

            proposalState = await governor.state(proposalId);
            console.log(`[vote casted] Proposal id: ${proposalId} in state ${proposalState}`);
            expect(proposalState).to.eq(1);
            await moveBlocks(governance.VOTING_PERIOD);

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
            balance = await govToken.balanceOf(deployer.address);
            console.log(`[after casting vote] gov tokens supply = ${balance}`);

            // queue
            const descriptionHash = ethers.utils.id(PROPOSAL_DESCRIPTION);
            const queueTx = await governor.queue(
                [lendingPool.address],
                [0],
                [encodedFunctionCall],
                descriptionHash
            );
            await queueTx.wait(1);
            await moveBlocks(1);
            proposalState = await governor.state(proposalId);
            expect(proposalState).to.eq(5);
            console.log(`[queued] Proposal id: ${proposalId} in state ${proposalState}`);
            await moveTime(governance.EXECUTE_DELAY + 1);

            console.log("Executing...");
            const exTx = await governor.execute(
                [lendingPool.address],
                [0],
                [encodedFunctionCall],
                descriptionHash
            );
            await exTx.wait(1);

            const borrowedBalance = await WETH.balanceOf(user.address);
            expect(borrowedBalance).to.be.eq(borrowAmount);

            const recordedBorrowBalance = await lendingPool.borrowBalance(
                user.address,
                WETH.address
            );
            expect(recordedBorrowBalance).to.be.eq(borrowAmount);
        });
    });

    describe.skip("lending scenarios", function () {
        const days = 1;
        const _moveTime = async (_days = days) => {
            await moveTime(_days * 24 * 60 * 60, true);
            await moveBlocks((_days * 24 * 60 * 60) / 12, 0, true);
        };

        it("one lender single deposit", async function () {
            const amount = hre.ethers.utils.parseEther("1000");

            await depositWeth(deployer, amount);

            await _moveTime();

            // now check compounded interest
            showParameters(lendingPool);
            const liquidity = await lendingPool.getLiquidity();
            showNumbers(amount, liquidity);
        });

        it("two lenders same deposit", async function () {
            const amount = hre.ethers.utils.parseEther("1000");

            await depositWeth(deployer, amount);
            await depositWeth(user, amount);

            await _moveTime();

            // now check compounded interest
            const liquidity = await lendingPool.getLiquidity();
            showNumbers(amount.mul(2), liquidity);
        });

        it("two lenders different deposits", async function () {
            const amount = hre.ethers.utils.parseEther("1000");
            const amount2 = hre.ethers.utils.parseEther("5000");

            await depositWeth(deployer, amount);
            await depositWeth(user, amount2);

            await _moveTime();

            // now check compounded interest
            const liquidity = await lendingPool.getLiquidity();
            showNumbers(amount.add(amount2), liquidity);
        });

        it("two lenders different deposits at different times", async function () {
            const amount = hre.ethers.utils.parseEther("1000");
            const amount2 = hre.ethers.utils.parseEther("5000");

            await depositWeth(deployer, amount);
            await _moveTime(days / 2);

            // now check compounded interest
            console.log("--After first deposit and " + days / 2 + " days--");
            let liquidity = await lendingPool.getLiquidity();
            showNumbers(amount, liquidity);

            await depositWeth(user, amount2);
            await _moveTime(days / 2);

            // now check compounded interest
            console.log("--After second deposit and " + days / 2 + " days--");
            liquidity = await lendingPool.getLiquidity();
            showNumbers(amount.add(amount2), liquidity);
        });
    });

    async function showParameters(lendingPool) {
        const afterBorrowToken = await lendingPool.getBorrowToken();
        console.log(
            "[Parameters]:\n\tInterestRate = " +
                displayPercent(displayRay(afterBorrowToken.variableBorrowRate)) +
                "\n\tCurrentLiquidityRate = " +
                displayRay(afterBorrowToken.liquidityRate) +
                "\n\tLiquidityIndex = " +
                displayRay(afterBorrowToken.liquidityIndex)
        );
    }

    function showNumbers(deposit, liquidity) {
        console.log("Deposit = " + displayUnits(deposit));
        console.log("Now w/ Interest = " + displayUnits(liquidity.totalCollateral));
        console.log("Profit = " + displayUnits(liquidity.totalCollateral.sub(deposit)));
    }

    const displayRay = (number) => {
        if (number == undefined) return 0;

        const RAY = 10 ** 27; // 10 to the power 27
        return number / RAY;
    };

    const displayPercent = (number) => {
        if (number == undefined) return 0;

        number *= 100;
        return Math.round((number + Number.EPSILON) * 100) / 100;
    };

    const displayUnits = (number, decimals = 18) => {
        if (number == undefined) return 0;
        const eth = formatUnits(number, decimals);
        const val = Math.round(eth * 1e4) / 1e4;
        return val;
    };
});
