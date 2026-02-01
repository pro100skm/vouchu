pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AccessManager
 * @notice Handles access for all contracts.
 */
contract AccessManager is AccessControl {
	/* ────────────────────────────────────────────────
		 Roles
	──────────────────────────────────────────────── */
	bytes32 public constant HOST_ROLE   = keccak256("HOST_ROLE");
	bytes32 public constant HOST_CONTRACT_ROLE   = keccak256("HOST_CONTRACT_ROLE");
	bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
	bytes32 public constant INVITE_ROLE  = keccak256("INVITE_ROLE");

	/* ────────────────────────────────────────────────
		 Constructor
	──────────────────────────────────────────────── */
	constructor(address admin) {
		_grantRole(DEFAULT_ADMIN_ROLE, admin);
		_grantRole(ADMIN_ROLE, admin);
	}

}