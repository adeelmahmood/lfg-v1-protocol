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

    const isAdmin = await timelock.hasRole(adminRole, deployer);
    if (isAdmin) {
        const isProposersRoleSet = await timelock.hasRole(proposerRole, governor.address);
        if (!isProposersRoleSet) {
            log("setting up proposer role");
            const proposerTx = await timelock.grantRole(proposerRole, governor.address);
            await proposerTx.wait(BLOCK_CONFIRMATIONS);
            log("done");
        }

        const isExecsRoleSet = await timelock.hasRole(executorRole, ADDRESS_ZERO);
        if (!isExecsRoleSet) {
            log("setting up executor role");
            const executorTx = await timelock.grantRole(executorRole, ADDRESS_ZERO);
            await executorTx.wait(BLOCK_CONFIRMATIONS);
            log("done");
        }

        log("revoking admin role");
        const revokeTx = await timelock.revokeRole(adminRole, deployer);
        await revokeTx.wait(BLOCK_CONFIRMATIONS);
    }

    log("Transferring LendPool ownership to Timelock");
    const lendPool = await ethers.getContract("LendPool");
    const owner = await lendPool.owner();
    if (owner != timelock.address) {
        log("transferring LendPool ownership from %s to %s", owner, timelock.address);
        const transferTx = await lendPool.transferOwnership(timelock.address);
        await transferTx.wait(BLOCK_CONFIRMATIONS);
        log("Timelock took ownership of LendPool");
    } else {
        log("Timelock ownership of LendPool already set");
    }

    log("Governance setup");
};

module.exports.tags = ["all", "governance"];
