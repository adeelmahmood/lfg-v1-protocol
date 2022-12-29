const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const lbToken = await deploy("SwapRouter", {
        from: deployer,
        args: [
            networkConfig[chainId].contracts.DAI,
            networkConfig[chainId].contracts.WETH,
            networkConfig[chainId].contracts.UNISWAP_ROUTER,
        ],
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    log("SwapRouter contract deployed successfully");
};

module.exports.tags = ["all", "swaprouter"];
