import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AccessManager, AccessManager__factory } from "../typechain-types";

describe("AccessManager", () => {
  let accessManager: AccessManager;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let deployer: SignerWithAddress;

  const HOST_CONTRACT = ethers.keccak256(ethers.toUtf8Bytes("HOST_CONTRACT"));
  const REGISTRY_CONTRACT = ethers.keccak256(
    ethers.toUtf8Bytes("REGISTRY_CONTRACT")
  );

  beforeEach(async () => {
    [deployer, admin, user1, user2] = await ethers.getSigners();

    const AccessManagerFactory = (await ethers.getContractFactory(
      "AccessManager"
    )) as AccessManager__factory;

    accessManager = await AccessManagerFactory.deploy(admin.address);
    await accessManager.waitForDeployment();
  });

  describe("Deployment", () => {
    it("Should set the right admin", async () => {
      expect(
        await accessManager.hasRole(
          await accessManager.DEFAULT_ADMIN_ROLE(),
          admin.address
        )
      ).to.be.true;
    });

    it("Should have correct role constants", async () => {
      expect(await accessManager.HOST_CONTRACT()).to.equal(HOST_CONTRACT);
      expect(await accessManager.REGISTRY_CONTRACT()).to.equal(
        REGISTRY_CONTRACT
      );
    });

    it("Should revert if admin is zero address", async () => {
      const AccessManagerFactory = await ethers.getContractFactory(
        "AccessManager"
      );
      await expect(
        AccessManagerFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Admin address cannot be zero");
    });
  });

  describe("Role Management", () => {
    it("Admin should grant HOST_CONTRACT role", async () => {
      await accessManager
        .connect(admin)
        .grantRole(HOST_CONTRACT, user1.address);
      expect(await accessManager.hasRole(HOST_CONTRACT, user1.address)).to.be
        .true;
    });

    it("Non-admin cannot grant roles", async () => {
      await expect(
        accessManager.connect(user1).grantRole(HOST_CONTRACT, user2.address)
      ).to.be.revertedWithCustomError(
        accessManager,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Admin can revoke roles", async () => {
      await accessManager
        .connect(admin)
        .grantRole(HOST_CONTRACT, user1.address);
      await accessManager
        .connect(admin)
        .revokeRole(HOST_CONTRACT, user1.address);
      expect(await accessManager.hasRole(HOST_CONTRACT, user1.address)).to.be
        .false;
    });

    it("Should set correct role admins", async () => {
      expect(await accessManager.getRoleAdmin(HOST_CONTRACT)).to.equal(
        await accessManager.DEFAULT_ADMIN_ROLE()
      );
      expect(await accessManager.getRoleAdmin(REGISTRY_CONTRACT)).to.equal(
        await accessManager.DEFAULT_ADMIN_ROLE()
      );
    });
  });

  describe("Role Constants", () => {
    it("Should return correct role hashes", async () => {
      expect(await accessManager.HOST_CONTRACT()).to.equal(
        ethers.keccak256(ethers.toUtf8Bytes("HOST_CONTRACT"))
      );
    });
  });
});
