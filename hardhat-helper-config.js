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
            WETH: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
            DAI: "0x73967c6a0904aA032C103b4104747E88c566B1A2",
            UNISWAP_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
            AAVE_LP_PROVIDER: "0x5E52dEc931FFb32f609681B8438A51c675cc232d",
        },
    },
    31337: {
        name: "hardhat",
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callbackGasLimit: "500000",
        contracts: {
            WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            UNISWAP_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
            AAVE_LP_PROVIDER: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        },
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
};