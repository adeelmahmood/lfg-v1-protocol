require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-deploy");
require("solidity-coverage");
require("dotenv").config();

const RINKEBY_URL = process.env.RINKEBY_URL || "https://eth-ropsten";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey";
const ETHER_SCAN_KEY = process.env.ETHER_SCAN_KEY || "key";
const COINMARKETCAP_KEY = process.env.COINMARKETCAP_KEY || "key";
const GOERLI_URL = process.env.GOERLI_URL || "";
const MAINNET_URL = process.env.MAINNET_URL || "";

module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.6.11",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100,
                    },
                },
            },
            {
                version: "0.8.9",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100,
                    },
                },
            },
            {
                version: "0.8.10",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100,
                    },
                },
            },
        ],
    },

    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
            forking: {
                url: MAINNET_URL,
                blockNumber: 16664268,
            },
        },
        rinkeby: {
            url: RINKEBY_URL,
            accounts: [PRIVATE_KEY],
            chainId: 4,
        },
        goerli: {
            url: GOERLI_URL,
            accounts: [PRIVATE_KEY],
            chainId: 5,
            gasPrice: 20000000000,
            gas: 6000000,
        },
        localhost: {
            url: "http://0.0.0.0:8545",
            chainId: 31337,
            gasPrice: 20000000000,
            gas: 6000000,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    etherscan: {
        apiKey: ETHER_SCAN_KEY,
    },
    gasReporter: {
        enabled: false,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_KEY,
    },
    mocha: {
        timeout: 200000, // 200 seconds max for running tests
    },
};
