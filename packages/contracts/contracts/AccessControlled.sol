// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "./AccessManager.sol";

/**
 * @title AccessControlled
 * @notice Abstract contract that provides access control modifiers
 * @dev All contracts that need access control should inherit from this
 */
abstract contract AccessControlled {
	AccessManager public immutable accessManager;

	error Unauthorized(address caller, bytes32 role);

	/* ────────────────────────────────────────────────
		 Constructor
	──────────────────────────────────────────────── */
	constructor(address _accessManager) {
		if (_accessManager == address(0)) {
			revert("AccessManager address cannot be zero");
		}
		accessManager = AccessManager(_accessManager);
	}

	/* ────────────────────────────────────────────────
		 Modifiers
	──────────────────────────────────────────────── */

	/// @notice Only allows DEFAULT_ADMIN_ROLE
	modifier onlyAdmin() {
		_checkRole(accessManager.DEFAULT_ADMIN_ROLE(), msg.sender);
		_;
	}

	/// @notice Only allows HOST_CONTRACT role
	modifier onlyHostContract() {
		_checkRole(accessManager.HOST_CONTRACT(), msg.sender);
		_;
	}


	/// @notice Only allows REGISTRY_CONTRACT role
	modifier onlyRegistryContract() {
		_checkRole(accessManager.REGISTRY_CONTRACT(), msg.sender);
		_;
	}

	/// @notice Custom role check
	modifier onlyRole(bytes32 role) {
		_checkRole(role, msg.sender);
		_;
	}

	/* ────────────────────────────────────────────────
		 Internal functions
	──────────────────────────────────────────────── */

	/**
	 * @dev Internal function to check role with custom error
     * @param role The role to check
     * @param account The account to check
     */
	function _checkRole(bytes32 role, address account) internal view virtual {
		if (!accessManager.hasRole(role, account)) {
			revert Unauthorized(account, role);
		}
	}

	/**
	 * @dev Internal function to check role with revert message
     * @param role The role to check
     * @param account The account to check
     */
	function _checkRoleWithRevert(bytes32 role, address account) internal view virtual {
		if (!accessManager.hasRole(role, account)) {
			revert Unauthorized(account, role);
		}
	}

	/* ────────────────────────────────────────────────
		 View functions
	──────────────────────────────────────────────── */

	/**
	 * @notice Check if account has role
     * @param role The role to check
     * @param account The account to check
     * @return bool True if account has role
     */
	function hasRole(bytes32 role, address account) public view returns (bool) {
		return accessManager.hasRole(role, account);
	}

	/**
	 * @notice Get role admin
     * @param role The role to check
     * @return bytes32 Admin role
     */
	function getRoleAdmin(bytes32 role) public view returns (bytes32) {
		return accessManager.getRoleAdmin(role);
	}

	/**
	 * @notice Check if caller is admin
     * @param account The account to check
     * @return bool True if account is admin
     */
	function isAdmin(address account) public view returns (bool) {
		return hasRole(accessManager.DEFAULT_ADMIN_ROLE(), account);
	}
}