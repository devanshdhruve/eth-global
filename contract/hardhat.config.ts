import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const accountId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
const privateKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;

if (!accountId || !privateKey) {
  throw new Error(
    "Please set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY in your .env file"
  );
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // This fixes the "Stack too deep" error
    },
  },
  networks: {
    hedera_testnet: {
      url: "https://testnet.hashio.io/api",
      accounts: [privateKey],
      chainId: 296,
    },
  },
};

export default config;