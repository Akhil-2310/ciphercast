// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { FHE, euint64, ebool, InEuint64, InEbool } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

interface IShieldedStablecoin {
    function confidentialTransfer(address to, euint64 amount) external returns (euint64);
    // euint64 overload: uses already-encrypted value, checks operator permission only
    function confidentialTransferFrom(address from, address to, euint64 value) external returns (euint64);
}

interface IFHERC20Receiver {
    function onConfidentialTransferReceived(
        address operator,
        address from,
        euint64 amount,
        bytes calldata data
    ) external returns (ebool);
}

contract FHEPredictionMarket is ReentrancyGuard, IFHERC20Receiver {
    using FHE for *;

    address public owner;
    IShieldedStablecoin public fusd;

    constructor(address _fusd) {
        owner = msg.sender;
        fusd = IShieldedStablecoin(_fusd);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    enum Currency {
        ETH,
        FUSD
    }

    struct Market {
        string question;
        uint256 closeTime;
        uint16 feeBps;
        Currency currency;
        // Chainlink
        AggregatorV3Interface priceFeed;
        int256 priceThreshold;
        bool outcomeReported;
        bool winningOutcome;
        // FHE aggregates
        euint64 totalYes;
        euint64 totalNo;
        uint64 decryptedYes;
        uint64 decryptedNo;
        // Derived values (computed once)
        uint64 winningPool;
        uint64 losingPool;
        uint64 distributablePool;
        // Fees
        uint256 ethProtocolFee;
        euint64 fusdProtocolFee;
        bool decryptRequested;
        bool settled;
    }

    struct Bet {
        address bettor;
        euint64 encryptedStake;
        ebool encryptedOutcome;
        uint256 ethEscrow; // ETH markets
        euint64 fusdEscrow; // FUSD markets
        bool decryptRequested;
        bool withdrawn;
    }

    event MarketCreated(uint256 indexed id, string question, address indexed creator);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, uint256 betIndex);
    event BetDecryptRequested(uint256 indexed marketId, uint256 betIndex, address indexed bettor);
    event FUSDDeposited(address indexed user, uint64 amount);
    event FUSDWithdrawn(address indexed user, uint64 amount);

    uint256 public marketCounter;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => Bet[]) public bets;

    // ETH escrow per market
    mapping(uint256 => uint256) public ethMarketEscrow;

    // FUSD user balances (encrypted)
    mapping(address => euint64) public userFusdBalance;

    function getBetCount(uint256 marketId) external view returns (uint256) {
        return bets[marketId].length;
    }

    /// @notice Deposit FUSD — user must first call setOperator on AUSD for this contract
    /// @dev Converts InEuint64 → euint64 first, then calls confidentialTransferFrom(euint64 overload)
    ///      This avoids InvalidSigner since the euint64 overload only checks operator permission
    function depositFUSD(InEuint64 memory encAmount) external {
        // Convert encrypted input to euint64 (this contract is the caller, so asEuint64 works)
        euint64 amount = FHE.asEuint64(encAmount);
        FHE.allowThis(amount);
        // Allow the AUSD contract to access this ciphertext for the transfer
        FHE.allow(amount, address(fusd));

        // Transfer from user to this contract using euint64 overload (operator-based, no signer check)
        fusd.confidentialTransferFrom(msg.sender, address(this), amount);

        // Credit user's internal balance
        userFusdBalance[msg.sender] = FHE.add(userFusdBalance[msg.sender], amount);
        FHE.allowThis(userFusdBalance[msg.sender]);
        FHE.allow(userFusdBalance[msg.sender], msg.sender); // allow user to decrypt their balance

        emit FUSDDeposited(msg.sender, 0);
    }

    /// @notice FHERC20 callback — called by AUSD when user does confidentialTransferAndCall
    function onConfidentialTransferReceived(
        address /* operator */,
        address from,
        euint64 amount,
        bytes calldata /* data */
    ) external override returns (ebool) {
        require(msg.sender == address(fusd), "Only AUSD accepted");

        FHE.allowThis(amount);
        userFusdBalance[from] = FHE.add(userFusdBalance[from], amount);
        FHE.allowThis(userFusdBalance[from]);
        FHE.allow(userFusdBalance[from], from); // allow user to decrypt their balance

        emit FUSDDeposited(from, 0);
        return FHE.asEbool(true);
    }

    function createPriceMarket(
        string calldata question,
        uint256 closeTime,
        uint16 feeBps,
        Currency currency,
        address priceFeed,
        int256 priceThreshold
    ) external onlyOwner returns (uint256 id) {
        require(closeTime > block.timestamp, "Invalid close time");
        require(feeBps <= 1000, "Fee too high");

        id = marketCounter++;

        Market storage m = markets[id];
        m.question = question;
        m.closeTime = closeTime;
        m.feeBps = feeBps;
        m.currency = currency;
        m.priceFeed = AggregatorV3Interface(priceFeed);
        m.priceThreshold = priceThreshold;

        m.totalYes = FHE.asEuint64(0);
        m.totalNo = FHE.asEuint64(0);

        FHE.allowThis(m.totalYes);
        FHE.allowThis(m.totalNo);

        emit MarketCreated(id, question, msg.sender);
    }

    function placeBet(
        uint256 marketId,
        InEuint64 memory encStake,
        InEbool memory encOutcome,
        uint256 ethAmount,
        InEuint64 memory encFusdAmount
    ) external payable {
        Market storage m = markets[marketId];
        require(block.timestamp < m.closeTime, "Market closed");

        euint64 stake;
        ebool outcome = FHE.asEbool(encOutcome);
        FHE.allowThis(outcome);

        if (m.currency == Currency.ETH) {
            require(msg.value == ethAmount && ethAmount > 0, "Bad ETH");
            ethMarketEscrow[marketId] += ethAmount;
            // For ETH, we use the public amount as the stake to ensure they match
            stake = FHE.asEuint64(ethAmount);
        } else {
            // FUSD: Deduct from user's deposited balance
            stake = FHE.asEuint64(encFusdAmount);
            FHE.allowThis(stake);
            // Subtract from user balance (will underflow/fail if insufficient)
            userFusdBalance[msg.sender] = FHE.sub(userFusdBalance[msg.sender], stake);
            FHE.allowThis(userFusdBalance[msg.sender]);
            FHE.allow(userFusdBalance[msg.sender], msg.sender); // allow user to decrypt their balance
        }

        FHE.allowThis(stake);
        // Allow user to decrypt their own bet data via permits
        FHE.allow(stake, msg.sender);
        FHE.allow(outcome, msg.sender);

        euint64 yesPart = FHE.select(outcome, stake, FHE.asEuint64(0));
        euint64 noPart = FHE.select(outcome, FHE.asEuint64(0), stake);

        m.totalYes = FHE.add(m.totalYes, yesPart);
        m.totalNo = FHE.add(m.totalNo, noPart);

        FHE.allowThis(m.totalYes);
        FHE.allowThis(m.totalNo);

        bets[marketId].push(
            Bet({
                bettor: msg.sender,
                encryptedStake: stake,
                encryptedOutcome: outcome,
                ethEscrow: ethAmount,
                fusdEscrow: stake,
                decryptRequested: false,
                withdrawn: false
            })
        );

        emit BetPlaced(marketId, msg.sender, bets[marketId].length - 1);
    }

    function resolveWithChainlink(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(block.timestamp >= m.closeTime, "Market open");
        require(!m.outcomeReported, "Already resolved");

        (, int256 price, , , ) = m.priceFeed.latestRoundData();
        m.winningOutcome = price >= m.priceThreshold;
        m.outcomeReported = true;
    }

    /// @notice Request decryption of pool totals - must be called before settleMarket
    function requestDecrypt(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.outcomeReported, "Outcome not set");
        require(!m.decryptRequested, "Already requested");

        FHE.decrypt(m.totalYes);
        FHE.decrypt(m.totalNo);
        m.decryptRequested = true;
    }

    function settleMarket(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.outcomeReported, "Outcome not set");
        require(m.decryptRequested, "Call requestDecrypt first");
        require(!m.settled, "Already settled");

        (uint64 yesPool, bool yReady) = FHE.getDecryptResultSafe(m.totalYes);
        (uint64 noPool, bool nReady) = FHE.getDecryptResultSafe(m.totalNo);
        require(yReady && nReady, "Decrypt pending - try again soon");

        m.decryptedYes = yesPool;
        m.decryptedNo = noPool;

        m.winningPool = m.winningOutcome ? yesPool : noPool;
        m.losingPool = m.winningOutcome ? noPool : yesPool;

        uint64 fee = (m.losingPool * m.feeBps) / 10_000;
        m.distributablePool = m.losingPool - fee;

        if (m.currency == Currency.ETH) {
            m.ethProtocolFee = fee;
        } else {
            m.fusdProtocolFee = FHE.asEuint64(fee);
            FHE.allowThis(m.fusdProtocolFee);
        }

        m.settled = true;
    }

    /// @notice Step 1: Request decryption of your bet outcome (call before withdraw)
    function requestBetDecrypt(uint256 marketId, uint256 betIndex) external {
        Market storage m = markets[marketId];
        require(m.settled, "Market not settled");

        Bet storage b = bets[marketId][betIndex];
        require(b.bettor == msg.sender, "Not your bet");
        require(!b.decryptRequested, "Already requested");
        require(!b.withdrawn, "Already withdrawn");

        FHE.decrypt(b.encryptedOutcome);
        b.decryptRequested = true;

        emit BetDecryptRequested(marketId, betIndex, msg.sender);
    }

    /// @notice Step 2: Claim ETH winnings (call after decryption completes)
    function withdrawETH(uint256 marketId, uint256 betIndex) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.currency == Currency.ETH && m.settled, "Bad market");

        Bet storage b = bets[marketId][betIndex];
        require(b.bettor == msg.sender && !b.withdrawn, "Bad bet");
        require(b.decryptRequested, "Call requestBetDecrypt first");

        (bool o, bool ready) = FHE.getDecryptResultSafe(b.encryptedOutcome);
        require(ready, "Outcome not ready - try again soon");

        b.withdrawn = true;
        if (o != m.winningOutcome) return;

        uint256 profit = (b.ethEscrow * m.distributablePool) / m.winningPool;

        uint256 payout = b.ethEscrow + profit;
        ethMarketEscrow[marketId] -= payout;

        (bool ok, ) = msg.sender.call{ value: payout }("");
        require(ok, "ETH transfer failed");
    }

    /// @notice Step 2: Claim FUSD winnings (call after decryption completes)
    function withdrawFUSD(uint256 marketId, uint256 betIndex) external {
        Market storage m = markets[marketId];
        require(m.currency == Currency.FUSD && m.settled, "Bad market");

        Bet storage b = bets[marketId][betIndex];
        require(b.bettor == msg.sender && !b.withdrawn, "Bad bet");
        require(b.decryptRequested, "Call requestBetDecrypt first");

        (bool o, bool ready) = FHE.getDecryptResultSafe(b.encryptedOutcome);
        require(ready, "Outcome not ready - try again soon");

        b.withdrawn = true;
        if (o != m.winningOutcome) return;

        // encrypted proportional profit
        euint64 escrowTimesPool = FHE.mul(b.fusdEscrow, FHE.asEuint64(m.distributablePool));
        FHE.allowThis(escrowTimesPool);
        euint64 profit = FHE.div(escrowTimesPool, FHE.asEuint64(m.winningPool));
        FHE.allowThis(profit);

        euint64 payout = FHE.add(b.fusdEscrow, profit);
        FHE.allowThis(payout);
        // Grant AUSD contract access to the payout ciphertext for confidentialTransfer
        FHE.allow(payout, address(fusd));

        fusd.confidentialTransfer(msg.sender, payout);
    }

    function withdrawETHFees(uint256 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        uint256 fee = m.ethProtocolFee;
        require(fee > 0, "No fee");

        m.ethProtocolFee = 0;
        (bool ok, ) = owner.call{ value: fee }("");
        require(ok, "Fee transfer failed");
    }

    function withdrawFUSDFees(uint256 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        euint64 fee = m.fusdProtocolFee;

        m.fusdProtocolFee = FHE.asEuint64(0);
        FHE.allowThis(m.fusdProtocolFee);

        fusd.confidentialTransfer(owner, fee);
    }
}
