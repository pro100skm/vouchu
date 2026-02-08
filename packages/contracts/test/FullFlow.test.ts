import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";

import { HostDeposit, HostRegistry } from "../typechain-types";

describe("Full Flow", () => {
  let hostRegistry: HostRegistry;
  let hostDeposit: HostDeposit;
  let accessManager: any;

  let admin: SignerWithAddress;
  let host: SignerWithAddress;
  let invitee1: SignerWithAddress;
  let invitee2: SignerWithAddress;

  const minToDeposit = ethers.parseEther("100");
  const initialDeposited = ethers.parseEther("1000");

  beforeEach(async () => {
    [admin, host, invitee1, invitee2] = await ethers.getSigners();

    // Деплой всех контрактов
    const AccessManager = await ethers.getContractFactory("AccessManager");
    accessManager = await AccessManager.deploy(admin.address);
    await accessManager.waitForDeployment();

    const HostDeposit = await ethers.getContractFactory("HostDeposit");
    hostDeposit = await HostDeposit.deploy(await accessManager.getAddress());
    await hostDeposit.waitForDeployment();

    const HostRegistry = await ethers.getContractFactory("HostRegistry");
    hostRegistry = await HostRegistry.deploy(
      await hostDeposit.getAddress(),
      await accessManager.getAddress()
    );
    await hostRegistry.waitForDeployment();

    // Настройка ролей
    const HOST_CONTRACT = ethers.keccak256(ethers.toUtf8Bytes("HOST_CONTRACT"));
    const REGISTRY_CONTRACT = ethers.keccak256(
      ethers.toUtf8Bytes("REGISTRY_CONTRACT")
    );

    await accessManager
      .connect(admin)
      .grantRole(HOST_CONTRACT, await hostDeposit.getAddress());
    await accessManager
      .connect(admin)
      .grantRole(REGISTRY_CONTRACT, await hostRegistry.getAddress());

    // Настройка системы
    await hostRegistry.connect(admin).updateMinToDeposit(minToDeposit);
    await hostRegistry
      .connect(admin)
      .updateAllowanceToInvite(host.address, true);
    await hostDeposit
      .connect(admin)
      .increaseDeposit(host.address, initialDeposited);
  });

  it("Should complete full users journey (accepted and declined invites)", async () => {
    // Хост приглашает пользователя
    await hostRegistry.connect(host).invite(invitee1.address);
    expect(await hostRegistry.invites(invitee1.address)).to.equal(host.address);
    let [total, locked, usedForInvites] = await hostDeposit.deposits(
      host.address
    );
    expect(total).to.equal(initialDeposited);
    expect(locked).to.equal(0);
    expect(usedForInvites).to.equal(minToDeposit);
    expect(await hostDeposit.inviteDeposits(invitee1.address)).to.equal(
      minToDeposit
    );

    // Первый пользователь принимает инвайт
    await hostRegistry.connect(invitee1).acceptInvite();
    expect(await hostRegistry.hosts(invitee1.address)).to.equal(host.address);

    // Попытка удалить первого пользователя не хостом
    await expect(
      hostRegistry.connect(invitee2).removeUser(invitee1)
    ).to.be.revertedWith("You are not a host");

    // Хост удаляет первого пользователя
    await hostRegistry.connect(host).removeUser(invitee1.address);
    expect(await hostRegistry.hosts(invitee1.address)).to.equal(
      ethers.ZeroAddress
    );
    [total, locked, usedForInvites] = await hostDeposit.deposits(host.address);
    expect(total).to.equal(initialDeposited);
    expect(locked).to.equal(0);
    expect(usedForInvites).to.equal(0);
    expect(await hostDeposit.inviteDeposits(invitee1.address)).to.equal(0);

    // 4. Хост приглашает второго пользователя и он отклоняет инвайт
    await hostRegistry.connect(host).invite(invitee2.address);
    await hostRegistry.connect(invitee2).declineInvite();
    [total, locked, usedForInvites] = await hostDeposit.deposits(host.address);
    expect(total).to.equal(initialDeposited);
    expect(locked).to.equal(0);
    expect(usedForInvites).to.equal(0);
    expect(await hostDeposit.inviteDeposits(invitee1.address)).to.equal(0);
    expect(await hostRegistry.invites(invitee2.address)).to.equal(
      ethers.ZeroAddress
    );
    expect(await hostRegistry.hosts(invitee2.address)).to.equal(
      ethers.ZeroAddress
    );
  });

  it("Should handle deposit operations", async () => {
    // Блокируем часть депозита
    await expect(
      hostDeposit.lockDeposit(host.address, ethers.parseEther("200"))
    )
      .to.emit(hostDeposit, "DepositLocked")
      .withArgs(host.address, ethers.parseEther("200"));

    let deposit = await hostDeposit.deposits(host.address);
    expect(deposit.locked).to.equal(ethers.parseEther("200"));
    expect(deposit.total).to.equal(initialDeposited);
    expect(deposit.usedForInvites).to.equal(0);

    // Разблокируем
    await hostDeposit.unlockDeposit(host.address, ethers.parseEther("100"));

    deposit = await hostDeposit.deposits(host.address);
    expect(deposit.locked).to.equal(ethers.parseEther("100"));

    // Слэшим депозит -50 + Увеличиваем на 100 => +50
    await hostDeposit
      .connect(admin)
      .slashDeposit(host.address, ethers.parseEther("50"));
    await hostDeposit
      .connect(admin)
      .increaseDeposit(host.address, ethers.parseEther("100"));

    deposit = await hostDeposit.deposits(host.address);
    expect(deposit.total).to.equal(ethers.parseEther("1050")); // 1000 - 50 + 100 => 1050
  });
});
