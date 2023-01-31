const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const token = await ethers.getContract("GovToken");
    const supplyStrategy = await ethers.getContract("EthPriceSupplyStrategy");

    const args = [token.address, supplyStrategy.address];

    const handler = await deploy("GovTokenHandler", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHER_SCAN_KEY) {
        log("Verifying...");
        await verify(handler.address, args);
    }

    log("GovTokenHandler contract deployed successfully");

    await token.transferOwnership(handler.address);
    log("GovToken ownership tranferred to GovTokenHandler");
};

module.exports.tags = ["all", "govtokenhandler"];
