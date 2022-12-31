const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const swapRouter = await deploy("SwapRouter", {
        from: deployer,
        args: [
            networkConfig[chainId].contracts.DAI,
            networkConfig[chainId].contracts.WETH,
            networkConfig[chainId].contracts.UNISWAP_ROUTER,
        ],
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHER_SCAN_KEY) {
        log("Verifying...");
        await verify(swapRouter.address, []);
    }

    log("SwapRouter contract deployed successfully");
};

module.exports.tags = ["all", "swaprouter"];
