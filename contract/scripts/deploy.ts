import { ethers } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const tokenAddress = process.env.ASI_TOKEN_ADDRESS!;
  if (!tokenAddress) throw new Error("❌ Missing ASI_TOKEN_ADDRESS in .env");

  console.log("🚀 Deploying AnnotationMarketplaceHTS with token:", tokenAddress);

  const Factory = await ethers.getContractFactory("AnnotationMarketplaceHTS");
  const contract = await Factory.deploy(tokenAddress);

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ Deployed AnnotationMarketplaceHTS at:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
