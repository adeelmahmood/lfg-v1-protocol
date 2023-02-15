const { moveBlocks } = require("../utils/move-blocks");

const BLOCKS = 9;
const SLEEP_AMOUNT = 100;

async function mine() {
    await moveBlocks(BLOCKS, SLEEP_AMOUNT);
}

mine()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
