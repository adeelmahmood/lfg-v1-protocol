const { ethers, network } = require("hardhat");
const fs = require("fs");
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/signers");

const UI_FOLDER = process.env.LFG_UI_FOLDER;

const FRONT_END_ADDRS_FILE = UI_FOLDER + "/contract.json";
const FRONT_END_LENDPOOL_ABI_FILE = UI_FOLDER + "/lendingpool.json";
const FRONT_END_LENDPOOLCORE_ABI_FILE = UI_FOLDER + "/lendingpoolcore.json";
const FRONT_END_SWAPROUTER_ABI_FILE = UI_FOLDER + "/swaprouter.json";

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END === "true") {
        await updateContractAddress();
        await updateAbi();
    }
};

async function updateAbi() {
    const lendingpool = await ethers.getContract("LendPool");
    fs.writeFileSync(
        FRONT_END_LENDPOOL_ABI_FILE,
        lendingpool.interface.format(ethers.utils.FormatTypes.json)
    );

    const lendingpoolCore = await ethers.getContract("LendPoolCore");
    fs.writeFileSync(
        FRONT_END_LENDPOOLCORE_ABI_FILE,
        lendingpoolCore.interface.format(ethers.utils.FormatTypes.json)
    );

    const swapRouter = await ethers.getContract("SwapRouter");
    fs.writeFileSync(
        FRONT_END_SWAPROUTER_ABI_FILE,
        swapRouter.interface.format(ethers.utils.FormatTypes.json)
    );
}

async function updateContractAddress() {
    const lendingPool = await ethers.getContract("LendPool");
    const lendingPoolCore = await ethers.getContract("LendPoolCore");
    const swapRouter = await ethers.getContract("SwapRouter");

    const chainId = network.config.chainId.toString();
    const contractAddress = JSON.parse(fs.readFileSync(FRONT_END_ADDRS_FILE));

    contractAddress[chainId] = {
        LendingPool: [lendingPool.address],
        LendingPoolCore: [lendingPoolCore.address],
        SwapRouter: [swapRouter.address],
    };

    fs.writeFileSync(FRONT_END_ADDRS_FILE, JSON.stringify(contractAddress));
}

module.exports.tags = ["all", "frontend"];