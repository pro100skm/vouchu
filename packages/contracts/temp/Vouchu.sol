pragma solidity ^0.8.20;

import "./InviteRegistry.sol";
import "./OfferHandler.sol";
import "./HostDeposit.sol";

/**
 * @title Vouchu
 * @notice Main contract that only stores persistent mappings and delegates
 *         all business logic to the sub‑contracts.
 */
contract Vouchu {
    /* ────────────────────────────────────────────────
       Addresses of sub‑contracts
    ──────────────────────────────────────────────── */
    InviteRegistry public inviteRegistry;
    OfferHandler  public offerHandler;
    HostDeposit   public hostDeposit;

    /* ────────────────────────────────────────────────
       Persistence
    ──────────────────────────────────────────────── */
    mapping(address => address) public userToHost;

    /* ────────────────────────────────────────────────
       Admin (only the deployer)
    ──────────────────────────────────────────────── */
    address public immutable admin;

    event SetUserHost(address indexed user, address indexed host);

    /* ────────────────────────────────────────────────
       Constructor
    ──────────────────────────────────────────────── */
    constructor(
        address _inviteRegistry,
        address _offerHandler,
        address _hostDeposit
    ) {
        admin = msg.sender;
        inviteRegistry = InviteRegistry(_inviteRegistry);
        offerHandler   = OfferHandler(_offerHandler);
        hostDeposit    = HostDeposit(_hostDeposit);
    }

    /* ────────────────────────────────────────────────
       Admin helpers
    ──────────────────────────────────────────────── */
    function setInviteRegistry(address newAddr) external {
        require(msg.sender == admin, "Not admin");
        inviteRegistry = InviteRegistry(newAddr);
    }
    function setOfferHandler(address newAddr) external {
        require(msg.sender == admin, "Not admin");
        offerHandler = OfferHandler(newAddr);
    }
    function setHostDeposit(address newAddr) external {
        require(msg.sender == admin, "Not admin");
        hostDeposit = HostDeposit(newAddr);
    }

    /* ────────────────────────────────────────────────
       Helper called by InviteRegistry
    ──────────────────────────────────────────────── */
    function setUserHost(address user, address host) external {
        require(msg.sender == address(inviteRegistry), "Only InviteRegistry");
        userToHost[user] = host;
        emit SetUserHost(user, host);
    }
}