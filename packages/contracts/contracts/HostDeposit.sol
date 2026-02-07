pragma solidity ^0.8.20;

import "./AccessControlled.sol";
import "./AccessManager.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HostDeposit
 * @notice Handles locking, unlocking and slashing of a host’s collateral.
 */
contract HostDeposit is AccessControlled, ReentrancyGuard {
	/* ────────────────────────────────────────────────
		 Storage
	──────────────────────────────────────────────── */
	struct Deposit {
		uint256 total; // The total volume of collateral locked by the host.
		uint256 locked; // The volume locked by protocol during the transaction. available = total - locked.
		uint256 usedForInvites; // The volume of collateral that is available for the host to invite new users.
	}

	// host_address -> deposit
	mapping(address => Deposit) public deposits;
	mapping(address => uint256) public inviteDeposits;

	/* ────────────────────────────────────────────────
		 Events
	──────────────────────────────────────────────── */
	event DepositIncreased(address indexed host, uint256 amount);

	event DepositLocked(address indexed host, uint256 amount);
	event DepositUnlocked(address indexed host, uint256 amount);

	event DepositSlashed(address indexed host, uint256 amount);

	event UsedForInvite(address indexed host, address indexed invitee, uint256 amount);
	event ReleasedFromInvite(address indexed host, address indexed invitee, uint256 amount);


	/* ────────────────────────────────────────────────
		 Constructor
	──────────────────────────────────────────────── */
	constructor(address _accessManager) AccessControlled(_accessManager) {}

	/* ────────────────────────────────────────────────
			Host functions
	──────────────────────────────────────────────── */

	/**
	 * @notice Locks a host's deposit for the duration of a trade.
     * @param host The address of the host.
     * @param amount The amount to lock.
     */
	function lockDeposit(address host, uint256 amount) external onlyAdmin nonReentrant {
		require(amount > 0, "Locking deposit must be > 0");
		Deposit storage d = deposits[host];
		require(d.total - d.locked >= amount, "Not enough to lock");
		d.locked += amount;
		emit DepositLocked(host, amount);
	}

	/**
* @notice Unlocks a host's deposit after a successful trade.
     * @param host The address of the host.
     * @param amount The amount to unlock.
     */
	function unlockDeposit(address host, uint256 amount) external onlyAdmin nonReentrant {
		Deposit storage d = deposits[host];
		require(d.locked >= amount, "Locked deposit must be >= sending amount");
		d.locked -= amount;
		emit DepositUnlocked(host, amount);
	}

	/* ────────────────────────────────────────────────
			Invite functions
	──────────────────────────────────────────────── */

	/**
 * @notice Uses a portion of the deposit as an invite.
     * @param invitee The address of the invited account.
     * @param amount The amount to use for the invite.
     */
	function useForInvite(address host, address invitee, uint256 amount) external onlyRegistryContract nonReentrant {
		Deposit storage d = deposits[host];
		require(d.usedForInvites + amount <= d.total, "Not enough to lock");
		d.usedForInvites += amount;
		inviteDeposits[invitee] = amount;
		emit UsedForInvite(host, invitee, amount);
	}

	/**
 * @notice Returns a portion of the deposit from an invite cancel.
     * @param invitee The address of the invited account.
     */
	function releaseFromInvite(address host, address invitee) external onlyRegistryContract nonReentrant {
		Deposit storage d = deposits[host];
		uint256 amount = inviteDeposits[invitee];
		delete inviteDeposits[invitee];
		d.usedForInvites -= amount;
		emit ReleasedFromInvite(host, invitee, amount);
	}

	/* ────────────────────────────────────────────────
			Admin functions
	──────────────────────────────────────────────── */
	/**
* @notice Increases a host's deposit.
     * @param host The address of the host.
     * @param amount The amount to increase the deposit by.
     */
	function increaseDeposit(address host, uint256 amount) external onlyAdmin nonReentrant {
		require(amount > 0, "Amount must be > 0");
		Deposit storage d = deposits[host];
		d.total += amount;
		emit DepositIncreased(host, amount);
	}

	/**
* @notice Slashes a host's deposit in case of a dispute.
     * @param host The address of the host.
     * @param amount The amount to slash.
     */
	function slashDeposit(address host, uint256 amount) external onlyAdmin {
		Deposit storage d = deposits[host];
		require(d.total >= amount, "Insufficient deposit");
		d.total -= amount;
		emit DepositSlashed(host, amount);
	}
}