const { run, network } = require("hardhat");

function sleep(timeInMs) {
    return new Promise((resolve) => setTimeout(resolve, timeInMs));
}

const moveBlocks = async (numOfBlocks, sleepTime = 0, silent = true) => {
    if (!silent) console.log(`Moving ${numOfBlocks} blocks with sleep time ${sleepTime}`);
    for (let i = 0; i < numOfBlocks; i++) {
        await network.provider.request({
            method: "evm_mine",
            params: [],
        });
        if (sleepTime) {
            await sleep(sleepTime);
        }
    }
};

module.exports = { moveBlocks };
