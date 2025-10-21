import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Deploying ReputationSystem...");

  const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
  const reputationSystem = await ReputationSystem.deploy();

  await reputationSystem.waitForDeployment();

  const address = await reputationSystem.getAddress();
  console.log("✅ Deployed ReputationSystem at:", address);
  
  // Update .env file with the new contract address
  console.log("\n📝 Add this to your .env file:");
  console.log(`REPUTATION_CONTRACT_ADDRESS=${address}`);
  
  // Verify deployment
  const reputationScore = await reputationSystem.getReputation("0x0000000000000000000000000000000000000000");
  console.log(`✅ Contract verified - default reputation: ${reputationScore}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
