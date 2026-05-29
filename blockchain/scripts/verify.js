const hre = require("hardhat");

async function main() {
  const args = process.argv.slice(2);
  const contractAddress = process.env.CONTRACT_ADDRESS || args[0];
  if (!contractAddress) {
    console.error("Please provide the deployed contract address.");
    console.error("Usage via npm: CONTRACT_ADDRESS=0x... npm run verify:amoy");
    console.error("Usage via node: HARDHAT_NETWORK=amoy node scripts/verify.js 0x...");
    process.exit(1);
  }
  const [deployer] = await hre.ethers.getSigners();
  const initialOwner = deployer.address;

  console.log("Verifying CertificateRegistry at:", contractAddress);
  console.log("Constructor argument (initialOwner):", initialOwner);

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [initialOwner],
    });
    console.log("Verification successful!");
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("Contract is already verified!");
    } else {
      console.error("Verification failed:", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
