const { moveBlocks } = require("../utils/move-blocks");

const BLOCKS = 10;
const SLEEP_AMOUNT = 0;

async function mine() {
    await moveBlocks(BLOCKS, SLEEP_AMOUNT);
}

mine()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
