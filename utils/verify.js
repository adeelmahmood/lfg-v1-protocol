const { run } = require("hardhat");

const verify = async (contractAddress, args, contractFile) => {
    console.log("Verifying contract...");
    try {
        if (contractFile) {
            await run("verify:verify", {
                address: contractAddress,
                constructorArguments: args,
                contract: contractFile,
            });
        } else {
            await run("verify:verify", {
                address: contractAddress,
                constructorArguments: args,
            });
        }
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already Verified");
        } else {
            console.log(e);
        }
    }
};

module.exports = { verify };
