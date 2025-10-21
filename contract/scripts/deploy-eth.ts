import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Deploying to Ethereum Sepolia for Blockscout visibility...");

  // Deploy MockERC20
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("ASI Token", "ASI", 8, ethers.parseUnits("1000000", 8));
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ MockERC20 deployed at:", tokenAddress);

  // Deploy AnnotationMarketplaceETH
  const Marketplace = await ethers.getContractFactory("AnnotationMarketplaceETH");
  const marketplace = await Marketplace.deploy(tokenAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ AnnotationMarketplaceETH deployed at:", marketplaceAddress);

  // Deploy ReputationSystem
  const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
  const reputation = await ReputationSystem.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("✅ ReputationSystem deployed at:", reputationAddress);

  console.log("\n🔍 View on Blockscout:");
  console.log(`📋 Marketplace: https://sepolia.blockscout.com/address/${marketplaceAddress}`);
  console.log(`📊 Reputation: https://sepolia.blockscout.com/address/${reputationAddress}`);
  console.log(`🪙 Token: https://sepolia.blockscout.com/address/${tokenAddress}`);

  console.log("\n📝 Add to your .env:");
  console.log(`ETH_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
  console.log(`ETH_REPUTATION_ADDRESS=${reputationAddress}`);
  console.log(`ETH_TOKEN_ADDRESS=${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
