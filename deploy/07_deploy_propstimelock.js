const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const args = [networkConfig[chainId].governance.MIN_DELAY, [], [], deployer];

    const timelock = await deploy("ProposalsTimeLock", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHER_SCAN_KEY) {
        log("Verifying...");
        await verify(timelock.address, args);
    }
    log("ProposalsTimeLock contract deployed successfully");
};

module.exports.tags = ["all", "governance", "timelock"];
