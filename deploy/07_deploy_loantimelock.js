const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const args = [networkConfig[chainId].governance.EXECUTE_DELAY, [], [], deployer];

    const timelock = await deploy("LoanTimeLock", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    if (!developmentChains.includes(network.name)) {
        log("Verifying...");
        await verify(timelock.address, args, "contracts/governance/LoanTimeLock.sol:LoanTimeLock");
    }
    log("LoanTimeLock contract deployed successfully");
};

module.exports.tags = ["all", "governance", "timelock"];
