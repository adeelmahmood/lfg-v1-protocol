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

describe("UsdPriceSupplyStrategy Unit Tests", function () {
    let usdPriceSupplyStrategyContract, usdPriceSupplyStrategy;
    let WETH, DAI, USDC;

    const chainId = network.config.chainId;

    beforeEach(async function () {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        user = accounts[1];
        await deployments.fixture("all");

        usdPriceSupplyStrategyContract = await ethers.getContract("UsdPriceSupplyStrategy");
        usdPriceSupplyStrategy = usdPriceSupplyStrategyContract.connect(deployer);

        const contracts = networkConfig[chainId].contracts;

        WETH = new ethers.Contract(contracts.WETH, ercAbi, deployer);
        DAI = new ethers.Contract(contracts.DAI, ercAbi, deployer);
        USDC = new ethers.Contract(contracts.USDC, ercAbi, deployer);
    });

    describe("init", function () {
        it("can do something", async function () {
            console.log(USDC);

            const wethAmount = hre.ethers.utils.parseEther("1");
            const wethVotes = await usdPriceSupplyStrategy.votes(WETH.address, wethAmount);
            console.log("weth amount %s, weth votes %s", hre.ethers.utils.formatEther(wethVotes));

            const daiAmount = hre.ethers.utils.parseUnits("1", 18);
            const daiVotes = await usdPriceSupplyStrategy.votes(DAI.address, daiAmount);
            console.log("dai amount %s, weth votes %s", hre.ethers.utils.formatUnits(daiVotes, 18));

            const usdcAmount = hre.ethers.utils.parseUnits("1", 6);
            const usdcVotes = await usdPriceSupplyStrategy.votes(USDC.address, usdcAmount);
            console.log(
                "usdc amount %s, weth votes %s",
                hre.ethers.utils.formatUnits(usdcVotes, 6)
            );
        });
    });
});
