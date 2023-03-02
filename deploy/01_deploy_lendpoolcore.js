const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const args = [networkConfig[chainId].contracts.AAVE_LP_PROVIDER];

    const core = await deploy("LendPoolCore", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    if (!developmentChains.includes(network.name)) {
        log("Verifying...");
        await verify(core.address, args);
    }

    log("LendPoolCore contract deployed successfully");
};

module.exports.tags = ["all", "lendingpool", "lendingpoolcore"];
