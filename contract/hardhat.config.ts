import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local Hardhat network (for testing with MockHTS)
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true,
    },

    // Hedera Testnet
    "hedera-testnet": {
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: process.env.HEDERA_TESTNET_PRIVATE_KEY
      ? [process.env.HEDERA_TESTNET_PRIVATE_KEY]
      : [],
      gas: 10_000_000,
      gasPrice: 490_000_000_000, // ✅ Minimum required (490 gwei)
      timeout: 120_000,
    },


    // Hedera Mainnet (when ready for production)
    "hedera-mainnet": {
      url: "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: process.env.HEDERA_MAINNET_PRIVATE_KEY
        ? [process.env.HEDERA_MAINNET_PRIVATE_KEY]
        : [],
      gas: 10_000_000,
      gasPrice: 80_000_000_000,
      timeout: 120_000,
    },
  },

  // Gas reporter (optional)
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },

  // Etherscan verification (Hedera doesn't use Etherscan)
  // For Hedera, verification happens via HashScan
  etherscan: {
    apiKey: {
      // Leave empty for Hedera networks
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 120_000, // 2 minutes for Hedera testnet tests
  },
};

export default config;