const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../hardhat-helper-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const BLOCK_CONFIRMATIONS = developmentChains.includes(network.name) ? 1 : 6;
    const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

    const timelock = await ethers.getContract("LoanTimeLock");
    const governor = await ethers.getContract("LoanGovernor");

    log("Setting up roles for timelock");
    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();

    const proposerTx = await timelock.grantRole(proposerRole, governor.address);
    await proposerTx.wait(BLOCK_CONFIRMATIONS);

    const executorTx = await timelock.grantRole(executorRole, ADDRESS_ZERO);
    await executorTx.wait(BLOCK_CONFIRMATIONS);

    const revokeTx = await timelock.revokeRole(adminRole, deployer);
    await revokeTx.wait(BLOCK_CONFIRMATIONS);

    log("Governance setup");
};

module.exports.tags = ["all", "governance"];
