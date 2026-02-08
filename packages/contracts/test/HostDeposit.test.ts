import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  HostDeposit,
  HostDeposit__factory,
  AccessManager,
  AccessManager__factory,
} from "../typechain-types";

describe("HostDeposit", () => {
  let hostDeposit: HostDeposit;
  let accessManager: AccessManager;
  let admin: SignerWithAddress;
  let host: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const HOST_ROLE = ethers.keccak256(ethers.toUtf8Bytes("HOST_ROLE"));
  const INVITE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INVITE_ROLE"));
  const ADMIN_ROLE = ethers.ZeroHash;

  beforeEach(async () => {
    [admin, host, user1, user2] = await ethers.getSigners();

    // Разворачиваем AccessManager
    const AccessManagerFactory = await ethers.getContractFactory(
      "AccessManager"
    );
    accessManager = await AccessManagerFactory.deploy(admin.address);
    await accessManager.waitForDeployment();

    // Разворачиваем HostDeposit
    const HostDepositFactory = (await ethers.getContractFactory(
      "HostDeposit"
    )) as HostDeposit__factory;

    hostDeposit = await HostDepositFactory.deploy(
      await accessManager.getAddress()
    );
    await hostDeposit.waitForDeployment();

    // Назначаем роли
    await accessManager
      .connect(admin)
      .grantRole(HOST_ROLE, await hostDeposit.getAddress());
    await accessManager.connect(admin).grantRole(INVITE_ROLE, user1.address);
    await accessManager.connect(admin).grantRole(ADMIN_ROLE, admin.address);
  });

  describe("Deployment", () => {
    it("Should set correct access manager", async () => {
      expect(await hostDeposit.accessManager()).to.equal(
        await accessManager.getAddress()
      );
    });

    it("Should have zero initial deposits", async () => {
      const deposit = await hostDeposit.deposits(host.address);
      expect(deposit.total).to.equal(0);
      expect(deposit.locked).to.equal(0);
      expect(deposit.usedForInvites).to.equal(0);
    });
  });

  describe("Deposit Management", () => {
    beforeEach(async () => {
      // Сначала увеличиваем депозит хосту
      await hostDeposit
        .connect(admin)
        .increaseDeposit(host.address, ethers.parseEther("100"));
    });

    describe("increaseDeposit", () => {
      it("Should increase host deposit", async () => {
        await hostDeposit
          .connect(admin)
          .increaseDeposit(host.address, ethers.parseEther("50"));
        const deposit = await hostDeposit.deposits(host.address);
        expect(deposit.total).to.equal(ethers.parseEther("150"));
      });

      it("Should emit DepositIncreased event", async () => {
        await expect(
          hostDeposit
            .connect(admin)
            .increaseDeposit(host.address, ethers.parseEther("50"))
        )
          .to.emit(hostDeposit, "DepositIncreased")
          .withArgs(host.address, ethers.parseEther("50"));
      });

      it("Should revert if not admin", async () => {
        await expect(
          hostDeposit
            .connect(user1)
            .increaseDeposit(host.address, ethers.parseEther("50"))
        ).to.be.reverted;
      });

      it("Should revert if amount is zero", async () => {
        await expect(
          hostDeposit.connect(admin).increaseDeposit(host.address, 0)
        ).to.be.revertedWith("Amount must be > 0");
      });
    });

    describe("lockDeposit", () => {
      it("Should lock deposit", async () => {
        await hostDeposit
          .connect(admin)
          .lockDeposit(host.address, ethers.parseEther("30"));
        const deposit = await hostDeposit.deposits(host.address);
        expect(deposit.locked).to.equal(ethers.parseEther("30"));
        expect(deposit.total).to.equal(ethers.parseEther("100"));
      });

      it("Should emit DepositLocked event", async () => {
        await expect(
          hostDeposit.lockDeposit(host.address, ethers.parseEther("30"))
        )
          .to.emit(hostDeposit, "DepositLocked")
          .withArgs(host.address, ethers.parseEther("30"));
      });

      it("Should revert if not enough balance", async () => {
        await expect(
          hostDeposit.lockDeposit(host.address, ethers.parseEther("150"))
        ).to.be.revertedWith("Not enough to lock");
      });

      it("Should revert if amount is zero", async () => {
        await expect(
          hostDeposit.lockDeposit(host.address, 0)
        ).to.be.revertedWith("Locking deposit must be > 0");
      });
    });

    describe("unlockDeposit", () => {
      beforeEach(async () => {
        await hostDeposit
          .connect(admin)
          .lockDeposit(host.address, ethers.parseEther("30"));
      });

      it("Should unlock deposit", async () => {
        await hostDeposit.unlockDeposit(host.address, ethers.parseEther("20"));
        const deposit = await hostDeposit.deposits(host.address);
        expect(deposit.locked).to.equal(ethers.parseEther("10"));
      });

      it("Should emit DepositUnlocked event", async () => {
        await expect(
          hostDeposit.unlockDeposit(host.address, ethers.parseEther("20"))
        )
          .to.emit(hostDeposit, "DepositUnlocked")
          .withArgs(host.address, ethers.parseEther("20"));
      });

      it("Should revert if trying to unlock more than locked", async () => {
        await expect(
          hostDeposit.unlockDeposit(host.address, ethers.parseEther("50"))
        ).to.be.revertedWith("Locked deposit must be >= sending amount");
      });
    });

    describe("slashDeposit", () => {
      it("Should slash deposit", async () => {
        await hostDeposit
          .connect(admin)
          .slashDeposit(host.address, ethers.parseEther("20"));
        const deposit = await hostDeposit.deposits(host.address);
        expect(deposit.total).to.equal(ethers.parseEther("80"));
      });

      it("Should emit DepositSlashed event", async () => {
        await expect(
          hostDeposit
            .connect(admin)
            .slashDeposit(host.address, ethers.parseEther("20"))
        )
          .to.emit(hostDeposit, "DepositSlashed")
          .withArgs(host.address, ethers.parseEther("20"));
      });

      it("Should revert if insufficient deposit", async () => {
        await expect(
          hostDeposit
            .connect(admin)
            .slashDeposit(host.address, ethers.parseEther("200"))
        ).to.be.revertedWith("Insufficient deposit");
      });
    });
  });

  describe("Access Control", () => {
    it("Should revert if non-HOST_ROLE calls lockDeposit", async () => {
      await expect(
        hostDeposit
          .connect(user1)
          .lockDeposit(host.address, ethers.parseEther("10"))
      ).to.be.reverted;
    });

    it("Should revert if non-INVITE_ROLE calls useForInvite", async () => {
      await expect(
        hostDeposit
          .connect(user2)
          .useForInvite(host.address, user1.address, ethers.parseEther("10"))
      ).to.be.reverted;
    });
  });
});
