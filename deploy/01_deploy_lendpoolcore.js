const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const core = await deploy("LendPoolCore", {
        from: deployer,
        args: [networkConfig[chainId].contracts.AAVE_LP_PROVIDER],
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    log("LendPoolCore contract deployed successfully");
};

module.exports.tags = ["all", "mocktokens"];
