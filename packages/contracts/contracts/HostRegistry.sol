pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./IHostDeposit.sol";

/**
 * @title InviteRegistry
 * @notice Creates invites, registers users and links them to a host.
 */
contract HostRegistry is ReentrancyGuard {
    /* ────────────────────────────────────────────────
       Storage
    ──────────────────────────────────────────────── */
    uint256 minToDeposit = 100_000_000; // 100$

    IHostDeposit public hostDeposit;

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
    event InviteAccepted(address indexed host, address indexed invitee);


    /* ────────────────────────────────────────────────
       Modifiers
    ──────────────────────────────────────────────── */

    modifier onlyInvited() {
        require(invites[msg.sender] != address(0) , "You are not invited");
        _;
    }

    modifier onlyHost(address user) {
        require(hosts[user] == msg.sender , "You are not a host");
        _;
    }



    /* ────────────────────────────────────────────────
       Constructor
    ──────────────────────────────────────────────── */
    constructor(address _hostDeposit) {
        hostDeposit   = IHostDeposit(_hostDeposit);
    }



    /* ────────────────────────────────────────────────
       Invite functions
    ──────────────────────────────────────────────── */
    function invite(address account) external nonReentrant {
        require(allowedToInvite[msg.sender], "You are not allowed to invite");
        require(account != address(0), "Zero invited");
        require(invites[account] == address(0), "Address is invited");
        require(hosts[account] == address(0), "Address is registered");

        hostDeposit.useForInvite(msg.sender, minToDeposit);
        
        invites[account] = msg.sender;

        emit InviteCreated(msg.sender, account);
    }

    function cancelInvite(address account) external nonReentrant {
        require(invites[account] == msg.sender, "Host can cancel only invited account");
        invites[account] = address(0);
        hostDeposit.releaseFromInvite(account);
        emit InviteCancelled(msg.sender, account);
    }

    function declineInvite() external nonReentrant onlyInvited {
        address invitee = msg.sender;
        address host = invites[invitee];
        delete invites[invitee];
        hostDeposit.releaseFromInvite(invitee);
        emit InviteDeclined(host, invitee);
    }

    function acceptInvite() external nonReentrant onlyInvited {
        address invitee = msg.sender;
        address host = invites[invitee];
        delete invites[invitee];
        hosts[invitee] = host;
        emit InviteAccepted(host, invitee);
    }
    /* ────────────────────────────────────────────────
       Host functions
    ──────────────────────────────────────────────── */

    /* ────────────────────────────────────────────────
       Admin helper (if needed)
    ──────────────────────────────────────────────── */
    function allowToInvite(address host) external  {

    }
}