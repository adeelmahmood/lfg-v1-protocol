const { network } = require("hardhat");

const moveTime = async (amount, silent = false) => {
    if (!silent) console.log("Moving blocks...");
    await network.provider.send("evm_increaseTime", [amount]);

    if (!silent) console.log(`Moved forward in time ${amount} seconds`);
};

module.exports = { moveTime };
