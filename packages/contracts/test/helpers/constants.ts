import { ethers } from "hardhat";

export const ROLES = {
  ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000",
  HOST_CONTRACT: ethers.keccak256(ethers.toUtf8Bytes("HOST_CONTRACT")),
  REGISTRY_CONTRACT: ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_CONTRACT")),
};
