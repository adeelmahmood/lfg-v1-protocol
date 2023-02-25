const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;

    const core = await ethers.getContract("LendPoolCore");
    const handler = await ethers.getContract("GovTokenHandler");
    const borrowToken = networkConfig[chainId].contracts.DAI;

    const args = [core.address, handler.address, borrowToken];

    const lendingPool = await deploy("LendPool", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: BLOCK_CONFIRMATIONS,
    });

    if (!developmentChains.includes(network.name)) {
        log("Verifying...");
        await verify(lendingPool.address, args);
    }
    log("LendingPool contract deployed successfully");

    log("Transferring LendPoolCore ownership to LendPool");
    const owner = await core.owner();
    if (owner != lendingPool.address) {
        log("transferring core ownership from %s to %s", owner, lendingPool.address);
        const transferTx = await core.transferOwnership(lendingPool.address);
        await transferTx.wait(BLOCK_CONFIRMATIONS);
        log("LendPool took ownership of LendPoolCore");
    } else {
        log("LendPoolCore ownership of LendPool already set");
    }
};

module.exports.tags = ["all", "lendingpool"];
