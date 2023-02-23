const { ethers, network } = require("hardhat");
const fs = require("fs");
const { networkConfig } = require("../hardhat-helper-config");

const UI_FOLDER = process.env.LFG_UI_FOLDER;

const abis = [
    "LendPool",
    "LendPoolCore",
    "SwapRouter",
    "GovToken",
    "GovTokenHandler",
    "LoanTimeLock",
    "LoanGovernor",
];

const FRONT_END_ADDRS_FILE = UI_FOLDER + "/contract.json";

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END == "true") {
        for (let i = 0; i < abis.length; i++) {
            console.log("Updating front end for " + abis[i]);
            await updateAbi(abis[i]);
            await updateContractAddress(abis[i]);
        }

        const chainId = network.config.chainId.toString();
        // DAI address
        const daiAddress = networkConfig[chainId].contracts.DAI;
        await addAddressEntry("DAI", daiAddress);
    }
};

async function updateAbi(abi) {
    const contract = await ethers.getContract(abi);
    fs.writeFileSync(
        UI_FOLDER + "/" + abi + ".json",
        contract.interface.format(ethers.utils.FormatTypes.json)
    );
}

async function updateContractAddress(abi) {
    const contract = await ethers.getContract(abi);

    await addAddressEntry(abi, contract.address);
}

async function addAddressEntry(key, addr) {
    const chainId = network.config.chainId.toString();

    if (!fs.existsSync(FRONT_END_ADDRS_FILE)) {
        fs.writeFileSync(FRONT_END_ADDRS_FILE, JSON.stringify({}));
    }

    const contractAddress = JSON.parse(fs.readFileSync(FRONT_END_ADDRS_FILE));

    if (!contractAddress[chainId]) {
        contractAddress[chainId] = {};
    }
    contractAddress[chainId][key] = addr;

    fs.writeFileSync(FRONT_END_ADDRS_FILE, JSON.stringify(contractAddress));
}

module.exports.tags = ["all", "frontend"];
