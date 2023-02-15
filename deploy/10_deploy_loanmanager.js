const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const args = [];

    const manager = await deploy("LoanManager", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHER_SCAN_KEY) {
        log("Verifying...");
        await verify(manager.address, args);
    }
    log("LoanManager contract deployed successfully");

    log("Transferring ownership to Timelock");
    const managerContract = await ethers.getContract("LoanManager");
    const timelock = await ethers.getContract("LoanTimeLock");
    const owner = await managerContract.owner();
    if (owner != timelock.address) {
        log("transferring loan manager ownership from %s to %s", owner, timelock.address);
        const transferTx = await managerContract.transferOwnership(timelock.address);
        await transferTx.wait(BLOCK_CONFIRMATIONS);
        log("Timelock took ownership of loan manager");
    } else {
        log("Timelock ownership of loan manager already set");
    }
};

module.exports.tags = ["all", "governance", "governor"];
