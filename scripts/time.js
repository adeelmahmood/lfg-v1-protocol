const { moveTime } = require("../utils/move-time");

const SECONDS = 180;

async function time() {
    await moveTime(SECONDS);
}

time()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
