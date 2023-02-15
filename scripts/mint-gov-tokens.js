const { ethers, network } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");
const { networkConfig } = require("../hardhat-helper-config");

const HOW_MANY = ethers.utils.parseEther("10000");
const USER = 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266;

async function mintGovTokens() {
    const chainId = network.config.chainId;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log(deployer.address);

    const handler = await ethers.getContract("GovTokenHandler");
    const DAI = networkConfig[chainId].contracts.DAI;

    const mintTx = await handler.mint(deployer.address, DAI, HOW_MANY);
    mintTx.wait(1);
}

mintGovTokens()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
