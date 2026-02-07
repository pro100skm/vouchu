import { ethers } from "ethers";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const ROLES = {
  ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000",
  HOST_CONTRACT: ethers.keccak256(ethers.toUtf8Bytes("HOST_CONTRACT")),
  REGISTRY_CONTRACT: ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_CONTRACT")),
  HOST_ROLE: ethers.keccak256(ethers.toUtf8Bytes("HOST_ROLE")),
  INVITE_ROLE: ethers.keccak256(ethers.toUtf8Bytes("INVITE_ROLE")),
};
