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
	bytes32 public constant HOST_CONTRACT     = keccak256("HOST_CONTRACT");
	bytes32 public constant REGISTRY_CONTRACT = keccak256("REGISTRY_CONTRACT");


	/* ────────────────────────────────────────────────
		 Constructor
	──────────────────────────────────────────────── */
	constructor(address admin) {
		if (admin == address(0)) {
			revert("Admin address cannot be zero");
		}

		_grantRole(DEFAULT_ADMIN_ROLE, admin);
		_setRoleAdmin(REGISTRY_CONTRACT, DEFAULT_ADMIN_ROLE);
		_setRoleAdmin(HOST_CONTRACT, DEFAULT_ADMIN_ROLE);
	}

}