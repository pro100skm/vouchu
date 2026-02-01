pragma solidity ^0.8.20;

interface IHostDeposit {
	/**
	 * @notice Uses a portion of the deposit as an invite.
     * @param invitee The address of the invited account.
     * @param amount The amount to use for the invite.
     */
	function useForInvite(address invitee, uint256 amount) external;

	/**
 * @notice Returns a portion of the deposit from an invite cancel.
     * @param invitee The address of the invited account.
     */
	function releaseFromInvite(address invitee) external;


	/**
	 * @notice Increases a host's deposit.
     * @param host The address of the host.
     * @param amount The amount to increase the deposit by.
     */
	function increaseDeposit(address host, uint256 amount) external;

	/**
	 * @notice Locks a host's deposit for the duration of a trade.
     * @param host The address of the host.
     * @param amount The amount to lock.
     */
	function lockDeposit(address host, uint256 amount) external;

	/**
	 * @notice Unlocks a host's deposit after a successful trade.
     * @param host The address of the host.
     * @param amount The amount to unlock.
     */
	function unlockDeposit(address host, uint256 amount) external;

	/**
	 * @notice Slashes a host's deposit in case of a dispute.
     * @param host The address of the host.
     * @param amount The amount to slash.
     */
	function slashDeposit(address host, uint256 amount) external;

	/**
	 * @notice Updates the role of a host.
     * @param host The address of the host.
     * @param enable Whether to grant or revoke the HOST_ROLE.
     */
	function setHostRole(address host, bool enable) external;
}