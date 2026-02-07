pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./HostDeposit.sol";
import "./AccessManager.sol";

/**
 * @title InviteRegistry
 * @notice Creates invites, registers users and links them to a host.
 */
contract HostRegistry is AccessControlled, ReentrancyGuard {
	/* ────────────────────────────────────────────────
		 Storage
	──────────────────────────────────────────────── */
	uint256 minToDeposit = 100_000_000; // 100$

	HostDeposit public hostDeposit;

	mapping(address => bool) public allowedToInvite;
	mapping(address => address) public hosts;
	mapping(address => address) public invites;

	/* ────────────────────────────────────────────────
		 Events
	──────────────────────────────────────────────── */
	event MinToDeposit(uint256 amount);
	event InviteCreated(address indexed host, address indexed invitee);
	event InviteCancelled(address indexed host, address indexed invitee);
	event InviteDeclined(address indexed host, address indexed invitee);

	event UserCreated(address indexed host, address indexed user);
	event UserRemoved(address indexed host, address indexed user);

	event UpdatedAllowanceToInvite(address indexed host, bool isAllowed);
	event UpdatedMinToDeposit(uint256 amount);

	/* ────────────────────────────────────────────────
		 Modifiers
	──────────────────────────────────────────────── */

	modifier onlyInvited() {
		require(invites[msg.sender] != address(0), "You are not invited");
		_;
	}

	modifier onlyHost(address user) {
		require(hosts[user] == msg.sender, "You are not a host");
		_;
	}

	/* ────────────────────────────────────────────────
		 Constructor
	──────────────────────────────────────────────── */
	constructor(address _hostDeposit, address _accessManager) AccessControlled(_accessManager) {
		hostDeposit = HostDeposit(_hostDeposit);
	}

	/* ────────────────────────────────────────────────
		 Invite functions
	──────────────────────────────────────────────── */
	function invite(address account) external {
		require(allowedToInvite[msg.sender], "You are not allowed to invite");
		require(account != address(0), "Zero invited");
		require(invites[account] == address(0), "Address is invited");
		require(hosts[account] == address(0), "Address is registered");

		hostDeposit.useForInvite(msg.sender, account, minToDeposit);

		invites[account] = msg.sender;

		emit InviteCreated(msg.sender, account);
	}

	function cancelInvite(address invitee) external nonReentrant {
		require(invites[invitee] == msg.sender, "Host can cancel only invited account");
		delete invites[invitee];
		hostDeposit.releaseFromInvite(msg.sender, invitee);
		emit InviteCancelled(msg.sender, invitee);
	}

	function declineInvite() external nonReentrant onlyInvited {
		address invitee = msg.sender;
		address host = invites[invitee];
		delete invites[invitee];
		hostDeposit.releaseFromInvite(host, invitee);
		emit InviteDeclined(host, invitee);
	}

	function acceptInvite() external nonReentrant onlyInvited {
		address invitee = msg.sender;
		address host = invites[invitee];
		delete invites[invitee];
		hosts[invitee] = host;
		emit UserCreated(host, invitee);
	}

	/* ────────────────────────────────────────────────
	 Hosts
	──────────────────────────────────────────────── */

	function removeUser(address _user) external onlyHost(_user) {
		address host = hosts[_user];
		delete hosts[_user];
		hostDeposit.releaseFromInvite(host, _user);
		emit UserRemoved(host, _user);
	}

	/* ────────────────────────────────────────────────
		 Admin
	──────────────────────────────────────────────── */
	function updateAllowanceToInvite(address _host, bool _allow) external onlyAdmin {
		allowedToInvite[_host] = _allow;
		emit UpdatedAllowanceToInvite(_host, _allow);
	}

	function updateMinToDeposit(uint256 _new) external onlyAdmin {
		require(_new > 1_000_000, "Limit is 1$");
		minToDeposit = _new;
		emit UpdatedMinToDeposit(_new);
	}

}