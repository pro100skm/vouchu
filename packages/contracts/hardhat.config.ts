import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      // remappings: [
      //   "@openzeppelin/contracts=./.pnpm/@openzeppelin+contracts@5.4.0/node_modules/@openzeppelin/contracts"
      // ]
    },
  },
  paths: {
    sources: "./contracts",
  }
};

export default config;
