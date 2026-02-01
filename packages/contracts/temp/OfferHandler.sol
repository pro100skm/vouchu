pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./HostDeposit.sol";

enum TradeState { Created, Accepted, FinalizedSuccess, FinalizedDispute }

contract OfferHandler is ReentrancyGuard {
    /* ────────────────────────────────────────────────
       Storage
    ──────────────────────────────────────────────── */
    struct Trade {
        uint256    id;
        address    trader1;
        address    trader2;
        address    host;      // The host who invited trader1
        uint256    cryptoAmount;
        uint256    fiatAmount;
        TradeState state;
        string     disputeReason;
    }

    HostDeposit public hostDeposit;
    mapping(uint256 => Trade) public trades;
    uint256 private _nextTradeId = 1;

    /* ────────────────────────────────────────────────
       Events
    ──────────────────────────────────────────────── */
    event TradeCreated(
        uint256 indexed id,
        address indexed trader1,
        address indexed host,
        uint256 cryptoAmount,
        uint256 fiatAmount
    );
    event TradeAccepted(uint256 indexed id, address indexed trader2);
    event TradeFinalized(
        uint256 indexed id,
        TradeState state,
        string reason
    );

    /* ────────────────────────────────────────────────
       Constructor
    ──────────────────────────────────────────────── */
    constructor(address _hostDeposit) {
        hostDeposit = HostDeposit(_hostDeposit);
    }

    /* ────────────────────────────────────────────────
       Trade functions
    ──────────────────────────────────────────────── */
    function createTrade(
        address host,
        uint256 cryptoAmount,
        uint256 fiatAmount
    ) external nonReentrant returns (uint256) {
        uint256 id = _nextTradeId++;
        trades[id] = Trade({
            id: id,
            trader1: msg.sender,
            trader2: address(0),
            host: host,
            cryptoAmount: cryptoAmount,
            fiatAmount: fiatAmount,
            state: TradeState.Created,
            disputeReason: ""
        });

        emit TradeCreated(id, msg.sender, host, cryptoAmount, fiatAmount);
        return id;
    }

    function acceptTrade(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        require(t.state == TradeState.Created, "Not creatable");
        t.trader2 = msg.sender;
        t.state = TradeState.Accepted;

        // Lock the host’s deposit for the duration of this trade
        hostDeposit.lockDeposit(); // Host must have already locked enough funds

        emit TradeAccepted(id);
    }

    function finalizeTrade(
        uint256 id,
        bool success,
        string calldata reason
    ) external nonReentrant {
        Trade storage t = trades[id];
        require(
            t.trader1 == msg.sender || t.trader2 == msg.sender,
            "Not a participant"
        );
        require(t.state == TradeState.Accepted, "Trade not active");

        if (success) {
            t.state = TradeState.FinalizedSuccess;
            hostDeposit.unlockDeposit();
        } else {
            t.state = TradeState.FinalizedDispute;
            t.disputeReason = reason;
            // Example: slash half of the host’s deposit
            hostDeposit.slashDeposit(t.host, t.hostDeposit().deposits(t.host).amount / 2);
        }

        emit TradeFinalized(id, t.state, reason);
    }
}