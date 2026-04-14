// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Donation} from "./Donation.sol";
import {RewardNFT} from "./NFTTier.sol";

contract Core is ReentrancyGuard {
    // ─────────────────────────────────────────────────────────
    //  FIX #3 — simple owner stored at construction
    // ─────────────────────────────────────────────────────────
    address public owner;

    Donation public charity;
    RewardNFT public nft;

    uint256 public constant DONATION_PERCENT = 65;
    uint256 public constant WINNER_PERCENT = 35;

    uint256 public matchCounter;

    // ─────────────────────────────────────────────────────────
    //  ENUMS
    // ─────────────────────────────────────────────────────────
    enum MatchStatus {
        ACTIVE,
        RESOLVED,
        CANCELLED
    }
    enum PredictionOutcome {
        NONE,
        TEAM_A,
        TEAM_B,
        DRAW
    }

    // ─────────────────────────────────────────────────────────
    //  STRUCTS
    // ─────────────────────────────────────────────────────────
    struct Match {
        uint256 matchId;
        string teamA;
        string teamB;
        uint256 startTime;
        uint256 lockTime;
        MatchStatus status;
        PredictionOutcome result;
        uint256 totalStaked;
        uint256 winnerPool;
        uint256 donationPool;
    }

    struct Prediction {
        PredictionOutcome choice;
        uint256 stakeAmount;
        uint256 timestamp;
        bool claimed;
    }

    // ─────────────────────────────────────────────────────────
    //  MAPPINGS
    // ─────────────────────────────────────────────────────────
    mapping(uint256 => Match) public matches;
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    mapping(address => mapping(uint256 => bool)) public hasPredictedMatch; // FIX #7
    mapping(uint256 => address[]) internal matchPredictors; // FIX #6
    mapping(address => uint256) public correctPredictions; // FIX #8

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────
    event MatchCreated(
        uint256 indexed matchId,
        string teamA,
        string teamB,
        uint256 startTime,
        uint256 lockTime
    );
    event MatchResolved(
        uint256 indexed matchId,
        PredictionOutcome result,
        uint256 donationAmount,
        uint256 winnerPool
    );
    event MatchCancelled(uint256 indexed matchId);
    event PredictionPlaced(
        address indexed predictor,
        uint256 indexed matchId,
        uint256 stakeAmount
    );
    event RewardClaimed(
        address indexed user,
        uint256 indexed matchId,
        uint256 reward
    );
    event RefundClaimed(
        address indexed user,
        uint256 indexed matchId,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────────────────────
    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    modifier matchExists(uint256 matchId) {
        _matchExists(matchId);
        _;
    }

    modifier matchIsActive(uint256 matchId) {
        _matchIsActive(matchId);
        _;
    }

    modifier predictionOpen(uint256 matchId) {
        _predictionOpen(matchId);
        _;
    }

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────
    constructor(address _nft) {
        owner = msg.sender;
        nft = RewardNFT(_nft);
    }

    // FIX #1 — Core must accept ETH from users staking predictions
    receive() external payable {}

    // ═════════════════════════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ═════════════════════════════════════════════════════════

    /// @notice Wire Donation contract after deployment
    /// FIX #3 — onlyOwner added
    function setDonation(address payable _donation) external onlyOwner {
        require(address(charity) == address(0), "Already set");
        charity = Donation(_donation);
    }

    /// @notice Create a new match
    function createMatch(
        string calldata teamA,
        string calldata teamB,
        uint256 startTime,
        uint256 lockTime
    ) external onlyOwner returns (uint256 matchId) {
        require(startTime > block.timestamp, "Start time must be in future");
        require(lockTime < startTime, "Lock must be before match starts");
        require(lockTime > block.timestamp, "Lock time already passed");
        require(bytes(teamA).length > 0, "Team A name required");
        require(bytes(teamB).length > 0, "Team B name required");

        matchId = ++matchCounter;

        matches[matchId] = Match({
            matchId: matchId,
            teamA: teamA,
            teamB: teamB,
            startTime: startTime,
            lockTime: lockTime,
            status: MatchStatus.ACTIVE,
            result: PredictionOutcome.NONE,
            totalStaked: 0,
            winnerPool: 0,
            donationPool: 0
        });

        emit MatchCreated(matchId, teamA, teamB, startTime, lockTime);
    }

    /// @notice Resolve match and distribute donation pool to charities
    /// FIX #1 — ETH forwarded to Donation before calling distributeToCharities
    function resolveMatch(
        uint256 matchId,
        PredictionOutcome result
    ) external onlyOwner matchExists(matchId) matchIsActive(matchId) {
        require(
            block.timestamp >= matches[matchId].startTime,
            "Match has not started yet"
        );
        require(result != PredictionOutcome.NONE, "Invalid result");

        Match storage m = matches[matchId];
        m.status = MatchStatus.RESOLVED;
        m.result = result;

        uint256 donationAmt = (m.totalStaked * DONATION_PERCENT) / 100;
        uint256 winnerAmt = (m.totalStaked * WINNER_PERCENT) / 100;

        m.donationPool = donationAmt;
        m.winnerPool = winnerAmt;

        // FIX #1 — forward ETH to Donation contract THEN call distribute
        if (donationAmt > 0) {
            (bool sent, ) = payable(address(charity)).call{value: donationAmt}(
                ""
            );
            require(sent, "ETH forward to Donation failed");
            charity.distributeToCharities(donationAmt);
        }

        emit MatchResolved(matchId, result, donationAmt, winnerAmt);
    }

    /// @notice Cancel match — enables full refunds
    function cancelMatch(
        uint256 matchId
    ) external onlyOwner matchExists(matchId) matchIsActive(matchId) {
        matches[matchId].status = MatchStatus.CANCELLED;
        emit MatchCancelled(matchId);
    }

    // ═════════════════════════════════════════════════════════
    //  USER FUNCTIONS
    // ═════════════════════════════════════════════════════════

    /// @notice FIX #2 — restored from original
    function placePrediction(
        uint256 matchId,
        PredictionOutcome choice
    )
        external
        payable
        nonReentrant
        matchExists(matchId)
        matchIsActive(matchId)
        predictionOpen(matchId)
    {
        require(msg.value > 0, "Stake must be greater than 0");
        require(choice != PredictionOutcome.NONE, "Choose a valid outcome");
        require(
            !hasPredictedMatch[msg.sender][matchId],
            "Already predicted this match"
        ); // FIX #7

        predictions[matchId][msg.sender] = Prediction({
            choice: choice,
            stakeAmount: msg.value,
            timestamp: block.timestamp,
            claimed: false
        });

        hasPredictedMatch[msg.sender][matchId] = true; // FIX #7
        matchPredictors[matchId].push(msg.sender); // FIX #6
        matches[matchId].totalStaked += msg.value;

        emit PredictionPlaced(msg.sender, matchId, msg.value);
    }

    /// @notice FIX #2 — restored from original
    function claimReward(
        uint256 matchId
    ) external nonReentrant matchExists(matchId) {
        require(
            matches[matchId].status == MatchStatus.RESOLVED,
            "Match not resolved yet"
        );

        Prediction storage p = predictions[matchId][msg.sender];
        require(p.stakeAmount > 0, "No prediction found");
        require(!p.claimed, "Already claimed");
        require(
            p.choice == matches[matchId].result,
            "Your prediction was wrong"
        );

        p.claimed = true;

        // FIX #8 — increment using internal mapping, not an external param
        correctPredictions[msg.sender] += 1;

        uint256 totalWinnerStake = _getTotalWinnerStake(matchId);
        uint256 reward = (matches[matchId].winnerPool * p.stakeAmount) /
            totalWinnerStake;

        (bool sent, ) = payable(msg.sender).call{value: reward}("");
        require(sent, "Reward transfer failed");

        emit RewardClaimed(msg.sender, matchId, reward);
    }

    /// @notice FIX #2 — restored from original
    function claimRefund(
        uint256 matchId
    ) external nonReentrant matchExists(matchId) {
        require(
            matches[matchId].status == MatchStatus.CANCELLED,
            "Match was not cancelled"
        );

        Prediction storage p = predictions[matchId][msg.sender];
        require(p.stakeAmount > 0, "No prediction found");
        require(!p.claimed, "Already refunded");

        uint256 refundAmount = p.stakeAmount;
        p.claimed = true;

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "Refund failed");

        emit RefundClaimed(msg.sender, matchId, refundAmount);
    }

    /// @notice Mint NFT badge — FIX #8: uses internal correctPredictions, no param
    function mintPredictorNft(
        uint256 matchId
    ) external nonReentrant matchExists(matchId) {
        require(
            matches[matchId].status == MatchStatus.RESOLVED,
            "Match not resolved"
        );

        Prediction storage p = predictions[matchId][msg.sender];
        require(p.stakeAmount > 0, "No prediction found");
        require(p.choice == matches[matchId].result, "Prediction was wrong");

        // FIX #8 — tier derived from internal mapping, caller cannot manipulate
        uint256 correct = correctPredictions[msg.sender];
        RewardNFT.NFTTier eligible;

        if (correct >= 10) eligible = RewardNFT.NFTTier.GOLD;
        else if (correct >= 5) eligible = RewardNFT.NFTTier.SILVER;
        else if (correct >= 1) eligible = RewardNFT.NFTTier.BRONZE;
        else revert("Not eligible yet");

        nft.mintNft(msg.sender, eligible, correct);
    }

    /// @notice FIX #4 — upgradeNFT restored, calls RewardNFT
    function upgradeNft(uint256 tokenId) external nonReentrant {
        nft.upgradeNft(msg.sender, tokenId);
    }

    // ═════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═════════════════════════════════════════════════════════

    function getMatch(
        uint256 matchId
    ) external view matchExists(matchId) returns (Match memory) {
        return matches[matchId];
    }

    function getActiveMatches() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= matchCounter; i++) {
            if (matches[i].status == MatchStatus.ACTIVE) count++;
        }

        uint256[] memory activeIds = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= matchCounter; i++) {
            if (matches[i].status == MatchStatus.ACTIVE) {
                activeIds[idx++] = i;
            }
        }
        return activeIds;
    }

    function getUserPrediction(
        uint256 matchId,
        address user
    ) external view returns (Prediction memory) {
        return predictions[matchId][user];
    }

    function getMatchPredictors(
        uint256 matchId
    ) external view returns (address[] memory) {
        return matchPredictors[matchId];
    }

    // ═════════════════════════════════════════════════════════
    //  INTERNAL FUNCTIONS
    // ═════════════════════════════════════════════════════════

    /// @dev FIX #6 — uses matchPredictors array (restored)
    function _getTotalWinnerStake(
        uint256 matchId
    ) internal view returns (uint256 total) {
        PredictionOutcome result = matches[matchId].result;
        address[] memory preds = matchPredictors[matchId];

        for (uint256 i = 0; i < preds.length; i++) {
            Prediction memory p = predictions[matchId][preds[i]];
            if (p.choice == result) {
                total += p.stakeAmount;
            }
        }
    }

    function _onlyOwner() internal view {
        require(msg.sender == owner, "Not owner");
    }

    function _matchExists(uint256 matchId) internal view {
        require(matches[matchId].startTime != 0, "Match not found");
    }

    function _matchIsActive(uint256 matchId) internal view {
        require(
            matches[matchId].status == MatchStatus.ACTIVE,
            "Match not active"
        );
    }

    function _predictionOpen(uint256 matchId) internal view {
        require(
            block.timestamp < matches[matchId].lockTime,
            "Predictions are locked"
        );
    }
}
