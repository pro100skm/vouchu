import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import {
  HostRegistry,
  HostRegistry__factory,
  HostDeposit,
  HostDeposit__factory,
  AccessManager,
  AccessManager__factory,
} from "../typechain-types";
import { ROLES } from "./helpers/constants";

describe("HostRegistry", () => {
  let hostRegistry: HostRegistry;
  let hostDeposit: HostDeposit;
  let accessManager: AccessManager;
  let admin: SignerWithAddress;
  let host: SignerWithAddress;
  let invitee: SignerWithAddress;
  let otherUser: SignerWithAddress;
  let deployer: SignerWithAddress;

  const initialMinToDeposit = ethers.parseEther("100");
  const initialDeposited = ethers.parseEther("1000");

  beforeEach(async () => {
    [deployer, admin, host, invitee, otherUser] = await ethers.getSigners();

    // Разворачиваем AccessManager
    const AccessManagerFactory = await ethers.getContractFactory(
      "AccessManager"
    );
    accessManager = await AccessManagerFactory.deploy(admin.address);
    await accessManager.waitForDeployment();

    // Разворачиваем HostDeposit
    const HostDepositFactory = await ethers.getContractFactory("HostDeposit");
    hostDeposit = await HostDepositFactory.deploy(
      await accessManager.getAddress()
    );
    await hostDeposit.waitForDeployment();

    // Разворачиваем HostRegistry
    const HostRegistryFactory = (await ethers.getContractFactory(
      "HostRegistry"
    )) as HostRegistry__factory;

    hostRegistry = await HostRegistryFactory.deploy(
      await hostDeposit.getAddress(),
      await accessManager.getAddress()
    );
    await hostRegistry.waitForDeployment();

    // Настраиваем роли
    await accessManager
      .connect(admin)
      .grantRole(ROLES.HOST_CONTRACT, await hostDeposit.getAddress());
    await accessManager
      .connect(admin)
      .grantRole(ROLES.REGISTRY_CONTRACT, await hostRegistry.getAddress());
    await accessManager.connect(admin).grantRole(ROLES.ADMIN, admin.address);

    // Устанавливаем минимальный депозит
    await hostRegistry.connect(admin).updateMinToDeposit(initialMinToDeposit);

    // Даем хосту разрешение приглашать
    await hostRegistry
      .connect(admin)
      .updateAllowanceToInvite(host.address, true);

    // Увеличиваем депозит хосту
    await hostDeposit
      .connect(admin)
      .increaseDeposit(host.address, initialDeposited);
  });

  describe("Deployment", () => {
    it("Should set correct contracts addresses", async () => {
      expect(await hostRegistry.hostDeposit()).to.equal(
        await hostDeposit.getAddress()
      );
      expect(await hostRegistry.accessManager()).to.equal(
        await accessManager.getAddress()
      );
    });

    it("Should set initial minToDeposit", async () => {
      expect(await hostRegistry.minToDeposit()).to.equal(
        ethers.parseEther("100")
      );
    });
  });

  describe("Invite Flow", () => {
    it("Should create invite", async () => {
      await expect(hostRegistry.connect(host).invite(invitee.address))
        .to.emit(hostRegistry, "InviteCreated")
        .withArgs(host.address, invitee.address);

      expect(await hostRegistry.invites(invitee.address)).to.equal(
        host.address
      );
    });

    it("Should revert if host not allowed to invite", async () => {
      await hostRegistry
        .connect(admin)
        .updateAllowanceToInvite(host.address, false);
      await expect(
        hostRegistry.connect(host).invite(invitee.address)
      ).to.be.revertedWith("You are not allowed to invite");
    });

    it("Should revert if invitee is zero address", async () => {
      await expect(
        hostRegistry.connect(host).invite(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero invited");
    });

    it("Should revert if already invited", async () => {
      await hostRegistry.connect(host).invite(invitee.address);
      await expect(
        hostRegistry.connect(host).invite(invitee.address)
      ).to.be.revertedWith("Address is invited");
    });

    it("Should use host deposit for invite", async () => {
      const depositBefore = await hostDeposit.deposits(host.address);

      await hostRegistry.connect(host).invite(invitee.address);

      const depositAfter = await hostDeposit.deposits(host.address);
      // Проверяем, что usedForInvites увеличилось
      expect(depositAfter.usedForInvites).to.equal(
        depositBefore.usedForInvites + ethers.parseEther("100")
      );
    });
  });

  describe("Cancel Invite", () => {
    beforeEach(async () => {
      await hostRegistry.connect(host).invite(invitee.address);
    });

    it("Should cancel invite by host", async () => {
      await expect(hostRegistry.connect(host).cancelInvite(invitee.address))
        .to.emit(hostRegistry, "InviteCancelled")
        .withArgs(host.address, invitee.address);

      expect(await hostRegistry.invites(invitee.address)).to.equal(
        ethers.ZeroAddress
      );
    });

    it("Should revert if not host cancels invite", async () => {
      await expect(
        hostRegistry.connect(otherUser).cancelInvite(invitee.address)
      ).to.be.revertedWith("Host can cancel only invited account");
    });
  });

  describe("Accept Invite", () => {
    beforeEach(async () => {
      await hostRegistry.connect(host).invite(invitee.address);
    });

    it("Should accept invite", async () => {
      await expect(hostRegistry.connect(invitee).acceptInvite())
        .to.emit(hostRegistry, "UserCreated")
        .withArgs(host.address, invitee.address);

      expect(await hostRegistry.hosts(invitee.address)).to.equal(host.address);
      expect(await hostRegistry.invites(invitee.address)).to.equal(
        ethers.ZeroAddress
      );
    });

    it("Should revert if not invited", async () => {
      await expect(
        hostRegistry.connect(otherUser).acceptInvite()
      ).to.be.revertedWith("You are not invited");
    });
  });

  describe("Decline Invite", () => {
    beforeEach(async () => {
      await hostRegistry.connect(host).invite(invitee.address);
    });

    it("Should decline invite", async () => {
      await expect(hostRegistry.connect(invitee).declineInvite())
        .to.emit(hostRegistry, "InviteDeclined")
        .withArgs(host.address, invitee.address);

      expect(await hostRegistry.invites(invitee.address)).to.equal(
        ethers.ZeroAddress
      );
    });
  });

  describe("Remove User", () => {
    beforeEach(async () => {
      await hostRegistry.connect(host).invite(invitee.address);
      await hostRegistry.connect(invitee).acceptInvite();
    });

    it("Should remove user by host", async () => {
      await expect(hostRegistry.connect(host).removeUser(invitee.address))
        .to.emit(hostRegistry, "UserRemoved")
        .withArgs(host.address, invitee.address);

      expect(await hostRegistry.hosts(invitee.address)).to.equal(
        ethers.ZeroAddress
      );
    });

    it("Should revert if not host removes user", async () => {
      await expect(
        hostRegistry.connect(otherUser).removeUser(invitee.address)
      ).to.be.revertedWith("You are not a host");
    });
  });

  describe("Admin Functions", () => {
    describe("updateAllowanceToInvite", () => {
      it("Should update allowance", async () => {
        await expect(
          hostRegistry
            .connect(admin)
            .updateAllowanceToInvite(host.address, false)
        )
          .to.emit(hostRegistry, "UpdatedAllowanceToInvite")
          .withArgs(host.address, false);

        expect(await hostRegistry.allowedToInvite(host.address)).to.be.false;
      });

      it("Should revert if not admin", async () => {
        await expect(
          hostRegistry
            .connect(host)
            .updateAllowanceToInvite(host.address, false)
        ).to.be.reverted;
      });
    });

    describe("updateMinToDeposit", () => {
      it("Should update min deposit", async () => {
        const newMin = ethers.parseEther("200");
        await expect(hostRegistry.connect(admin).updateMinToDeposit(newMin))
          .to.emit(hostRegistry, "UpdatedMinToDeposit")
          .withArgs(newMin);

        expect(await hostRegistry.minToDeposit()).to.equal(newMin);
      });

      it("Should revert if less than 1$", async () => {
        await expect(
          hostRegistry
            .connect(admin)
            .updateMinToDeposit(ethers.parseEther("0.5"))
        ).to.be.revertedWith("Limit is 1$");
      });

      it("Should revert if not admin", async () => {
        await expect(
          hostRegistry
            .connect(host)
            .updateMinToDeposit(ethers.parseEther("200"))
        ).to.be.reverted;
      });
    });
  });
});
