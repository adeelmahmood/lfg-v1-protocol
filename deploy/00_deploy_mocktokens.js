const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const fakeWeth = await deploy("WethToken", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    log("Fake Weth Token contract deployed successfully");

    const fakeDai = await deploy("DaiToken", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    log("Fake Dai Token contract deployed successfully");
};

module.exports.tags = ["all", "mocktokens"];
