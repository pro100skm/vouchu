pragma solidity ^0.8.20;


import "./IHostDeposit.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HostDeposit
 * @notice Handles locking, unlocking and slashing of a host’s collateral.
 */
contract HostDeposit is IHostDeposit, AccessControl, ReentrancyGuard {
    /* ────────────────────────────────────────────────
       Roles
    ──────────────────────────────────────────────── */
    bytes32 public constant HOST_ROLE   = keccak256("HOST_ROLE");
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant INVITE_ROLE  = keccak256("INVITE_ROLE");

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
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /* ────────────────────────────────────────────────
        Host functions
    ──────────────────────────────────────────────── */

//    // starting exchange
    function lockDeposit(address host, uint256 amount) external onlyRole(HOST_ROLE) nonReentrant {
        require(amount> 0, "Locking deposit must be > 0");
        Deposit storage d = deposits[host];
        require(d.total - d.locked >= amount, "Not enough to lock");
        d.locked  += amount;
        emit DepositLocked(host, amount);
    }

    // success end of exchange
    function unlockDeposit(address host, uint256 amount) external onlyRole(HOST_ROLE) nonReentrant {
        Deposit storage d = deposits[host];
        require(d.locked >= amount, "Locked deposit must be >= sending amount");
        d.locked  -= amount;
        emit DepositUnlocked(host, amount);
    }


    /* ────────────────────────────────────────────────
        Invite functions
    ──────────────────────────────────────────────── */

    function useForInvite(address host, address invitee, uint256 amount) external onlyRole(INVITE_ROLE) nonReentrant {
        Deposit storage d = deposits[host];
        require(d.usedForInvites + amount <= d.total, "Not enough to lock");
        d.usedForInvites += amount;
        inviteDeposits[invitee] = amount;
        emit UsedForInvite(host, invitee, amount);
    }

    function releaseFromInvite(address host, address invitee) external onlyRole(INVITE_ROLE) nonReentrant {
        Deposit storage d = deposits[host];
        uint256 amount = inviteDeposits[invitee];
        delete inviteDeposits[invitee];
        d.usedForInvites -= amount;
        emit ReleasedFromInvite(host, invitee, amount);
    }


    /* ────────────────────────────────────────────────
        Admin functions
    ──────────────────────────────────────────────── */
    // deposited more
    function increaseDeposit(address host, uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(amount > 0, "Amount must be > 0");
        Deposit storage d = deposits[host];
        d.total += amount;
        emit DepositIncreased(host, amount);
    }

    // failed on exchange or remove user under your host
    function slashDeposit(address host, uint256 amount) external onlyRole(ADMIN_ROLE) {
        Deposit storage d = deposits[host];
        require(d.total >= amount, "Insufficient deposit");
        d.total -= amount;
        emit DepositSlashed(host, amount);
    }

    function setHostRole(address host, bool enable) external onlyRole(ADMIN_ROLE) {
        if (enable) {
            grantRole(HOST_ROLE, host);
        } else {
            revokeRole(HOST_ROLE, host);
        }
    }
}