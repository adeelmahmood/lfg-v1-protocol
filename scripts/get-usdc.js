const { network, ethers } = require("hardhat");

const ercAbi = [
    // Read-Only Functions
    "function balanceOf(address owner) view returns (uint256)",
    // Authenticated Functions
    "function transfer(address to, uint amount) returns (bool)",
    "function deposit() public payable",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function name() public view returns (string memory)",
    "function decimals() public view returns (uint8)",
];

async function getUsdc() {
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const USDC_WHALE = "0x203520F4ec42Ea39b03F62B20e20Cf17DB5fdfA7";

    {
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [USDC_WHALE],
        });
    }

    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    const whale = await ethers.getSigner(USDC_WHALE);
    const usdc = new ethers.Contract(USDC, ercAbi, deployer);

    const HUNDRED_THOUSAND = ethers.utils.parseUnits("100000", 6);
    await usdc.connect(whale).transfer(deployer.address, HUNDRED_THOUSAND);

    let newWhaleBal = await usdc.balanceOf(USDC_WHALE);
    console.log("newWhaleBal", newWhaleBal);
    let deployerBal = await usdc.balanceOf(deployer.address);
    console.log("deployerBal", deployerBal);
}

getUsdc()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
