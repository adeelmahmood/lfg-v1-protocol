const networkConfig = {
    4: {
        name: "rinkeby",
        vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        subscriptionId: "5713",
        callbackGasLimit: "500000",
        contracts: {},
    },
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x",
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        subscriptionId: "5713",
        callbackGasLimit: "500000",
        contracts: {
            WETH: "0xCCa7d1416518D095E729904aAeA087dBA749A4dC",
            DAI: "0x75Ab5AB1Eef154C0352Fc31D2428Cef80C7F8B33",
            UNISWAP_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
            AAVE_LP_PROVIDER: "0x5E52dEc931FFb32f609681B8438A51c675cc232d",
        },
        governance: {
            EXECUTE_DELAY: 600, // 3600 = 1 hour - after vote passes, there is one hour delay
            QUORUM_PERC: 4, // need 4% of voters to pass the vote
            VOTING_PERIOD: 25, // blocks for how long voting stays open
            VOTING_DELAY: 0, // blocks before proposal becomes active
        },
    },
    31337: {
        name: "hardhat",
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callbackGasLimit: "500000",
        contracts: {
            WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
            USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            UNISWAP_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
            AAVE_LP_PROVIDER: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        },
        governance: {
            EXECUTE_DELAY: 0, // 3600 = 1 hour - after vote passes, there is one hour delay
            QUORUM_PERC: 4, // need 4% of voters to pass the vote
            VOTING_PERIOD: 10, // blocks for how long voting stays open
            VOTING_DELAY: 0, // blocks before proposal becomes active
        },
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
};
