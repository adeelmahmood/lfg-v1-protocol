const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const govToken = await ethers.getContract("GovToken");
    const timelock = await ethers.getContract("LoanTimeLock");

    const args = [
        govToken.address,
        timelock.address,
        networkConfig[chainId].governance.QUORUM_PERC,
        networkConfig[chainId].governance.VOTING_PERIOD,
        networkConfig[chainId].governance.VOTING_DELAY,
    ];

    const governor = await deploy("LoanGovernor", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHER_SCAN_KEY) {
        log("Verifying...");
        await verify(governor.address, args);
    }
    log("L contract deployed successfully");
};

module.exports.tags = ["all", "governance", "governor"];
