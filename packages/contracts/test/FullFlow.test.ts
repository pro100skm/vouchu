import { expect } from "chai";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers";
import { HostDeposit, HostRegistry } from "../typechain-types";
import { ethers } from "hardhat";

describe("Full Flow", () => {
  let hostRegistry: HostRegistry;
  let hostDeposit: HostDeposit;
  let accessManager: any;

  let admin: SignerWithAddress;
  let host: SignerWithAddress;
  let invitee1: SignerWithAddress;
  let invitee2: SignerWithAddress;

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
    await hostRegistry
      .connect(admin)
      .updateMinToDeposit(ethers.parseEther("100"));
    await hostRegistry
      .connect(admin)
      .updateAllowanceToInvite(host.address, true);
    await hostDeposit
      .connect(admin)
      .increaseDeposit(host.address, ethers.parseEther("1000"));
  });

  it("Should complete full user journey", async () => {
    // 1. Хост приглашает пользователя
    await hostRegistry
      .connect(admin)
      .updateAllowanceToInvite(host.address, true);

    await hostRegistry.connect(host).invite(invitee1.address);

    expect(await hostRegistry.invites(invitee1.address)).to.equal(host.address);

    // 2. Хост приглашает второго пользователя
    await hostRegistry.connect(host).invite(invitee2.address);

    // 3. Первый пользователь принимает инвайт
    await hostRegistry.connect(invitee1).acceptInvite();
    expect(await hostRegistry.hosts(invitee1.address)).to.equal(host.address);

    // 4. Второй пользователь отклоняет инвайт
    await hostRegistry.connect(invitee2).declineInvite();
    expect(await hostRegistry.invites(invitee2.address)).to.equal(
      ethers.ZeroAddress
    );
    expect(await hostRegistry.hosts(invitee2.address)).to.equal(
      ethers.ZeroAddress
    );

    // 5. Хост удаляет первого пользователя
    await hostRegistry.connect(host).removeUser(invitee1.address);
    expect(await hostRegistry.hosts(invitee1.address)).to.equal(
      ethers.ZeroAddress
    );

    // 6. Проверяем состояние депозита
    const deposit = await hostDeposit.deposits(host.address);

    expect(deposit[0]).to.equal(ethers.parseEther("1000"));
    // usedForInvites должен быть 0 после declineInvite
    expect(deposit[2]).to.equal(0);
  });

  it("Should handle deposit operations", async () => {
    // 1. Увеличиваем депозит
    await hostDeposit
      .connect(admin)
      .increaseDeposit(host.address, ethers.parseEther("500"));

    // 2. Блокируем часть депозита
    await hostDeposit.lockDeposit(host.address, ethers.parseEther("200"));

    let deposit = await hostDeposit.deposits(host.address);
    expect(deposit.locked).to.equal(ethers.parseEther("200"));

    // 3. Разблокируем
    await hostDeposit.unlockDeposit(host.address, ethers.parseEther("100"));

    deposit = await hostDeposit.deposits(host.address);
    expect(deposit.locked).to.equal(ethers.parseEther("100"));

    // 4. Слэшим депозит
    await hostDeposit
      .connect(admin)
      .slashDeposit(host.address, ethers.parseEther("50"));

    deposit = await hostDeposit.deposits(host.address);
    expect(deposit.total).to.equal(ethers.parseEther("1450")); // 1000 + 500 - 50
  });
});
