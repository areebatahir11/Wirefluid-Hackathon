// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract PredictForGood is Ownable, ReentrancyGuard {
    uint256 public constant DONATION_PERCENT = 60;
    uint256 public constant WINNER_PERCENT = 35;
    uint256 public constant PLATFORM_PERCENT = 5;

    uint256 public matchCounter;
    // uint256 public platformBalance; //iska logic dekhna ha kay kaya ha

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

    struct Match {
        uint256 matchId;
        string teamA;
        string teamB;
        uint256 startTime;
        uint256 lockTime; // predictions will be locked
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
        bool claimed; // reward/refund
    }

    event MatchStarted(
        uint256 indexed matchId,
        string teamA,
        string teamB,
        uint256 startTime,
        uint256 lockTime
    );

    event PredictionPlaced(
        address indexed predictor,
        uint256 indexed matchId,
        uint256 stakeAmount
    );

    event MatchResolved(
        uint256 indexed matchId,
        PredictionOutcome result,
        uint256 charityAmount,
        uint256 winnerPool
    );

    event MatchCancelled(uint256 indexed matchId);

    mapping(uint256 => Match) public matches;
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    mapping(address => mapping(uint256 => bool)) public hasPredictedMatch;
    mapping(uint256 => address[]) internal matchPredictors;

    modifier matchExists(uint256 matchId) {
        require(matches[matchId].startTime != 0, "Match not found");
        _;
    }
    modifier matchIsActive(uint256 matchId) {
        require(
            matches[matchId].status == MatchStatus.ACTIVE,
            "Match not active"
        );
        _;
    }

    modifier predictionOpen(uint256 matchId) {
        require(
            block.timestamp < matches[matchId].lockTime,
            "Predictions are locked"
        );
        _;
    }

    constructor() Ownable(msg.sender) {}

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

        // Match store karo
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
            charityPool: 0
        });

        emit MatchStarted(matchId, teamA, teamB, startTime, lockTime);
    }

    function getMatch(
        uint256 matchId
    ) external view matchExists(matchId) returns (Match memory) {
        return matches[matchId];
    }

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
        );

        predictions[matchId][msg.sender] = Prediction({
            choice: choice,
            stakeAmount: msg.value,
            timestamp: block.timestamp,
            claimed: false
        });

        hasPredictedMatch[msg.sender][matchId] = true;
        matchPredictors[matchId].push(msg.sender);

        matches[matchId].totalStaked += msg.value;

        emit PredictionPlaced(msg.sender, matchId, msg.value);
    }

    function getUserPrediction(
        uint256 matchId,
        address user
    ) external view returns (Prediction memory) {
        return predictions[matchId][user];
    }

    function resolveMatch(
        uint256 matchId,
        PredictionOutcome result
    ) external onlyOwner matchExists(matchId) matchIsActive(matchId) {
        // Match shuru ho chuka hona chahiye tab hi resolve hoga
        require(
            block.timestamp >= matches[matchId].startTime,
            "Match has not started yet"
        );
        require(result != PredictionOutcome.NONE, "Invalid result");

        Match storage m = matches[matchId];

        // Status aur result set karo
        m.status = MatchStatus.RESOLVED;
        m.result = result;

        uint256 donationAmt = (m.totalStaked * DONATION_PERCENT) / 100;
        uint256 winnerAmt = (m.totalStaked * WINNER_PERCENT) / 100;
        uint256 platformAmt = (m.totalStaked * PLATFORM_PERCENT) / 100;

        // Contract ke andar track karo
        m.donationPool = donationAmt;
        m.winnerPool = winnerAmt;
        platformBalance += platformAmt;

        emit MatchResolved(matchId, result, donationAmt, winnerAmt);
    }

    function cancelMatch(
        uint256 matchId
    ) external onlyOwner matchExists(matchId) matchIsActive(matchId) {
        matches[matchId].status = MatchStatus.CANCELLED;
        emit MatchCancelled(matchId);
    }
}
