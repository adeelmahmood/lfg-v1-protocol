const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const core = await ethers.getContract("LendPoolCore");
    const token = await ethers.getContract("GovToken");

    const args = [core.address, token.address];

    const lendingPool = await deploy("LendPool", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHER_SCAN_KEY) {
        log("Verifying...");
        await verify(lendingPool.address, args);
    }
    log("LendingPool contract deployed successfully");

    await token.transferOwnership(lendingPool.address);
    log("GovToken ownership tranferred to LendPool");
};

module.exports.tags = ["all", "lendingpool"];
