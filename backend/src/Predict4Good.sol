// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract PredictForGood is Ownable, ReentrancyGuard {
    uint256 public constant DONATION_PERCENT = 65;
    uint256 public constant WINNER_PERCENT = 35;
    // uint256 public constant PLATFORM_PERCENT = 5;

    uint256 public matchCounter;
    address[] public charityList;
    uint256 public totalCharityRaised;

    // uint256 public platformBalance; //iska logic dekhna ha kay kaya ha

    constructor() Ownable(msg.sender) {
        _registerCharity(
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            "Edhi Foundation",
            "Pakistan's largest welfare organization"
        );
        _registerCharity(
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
            "Shaukat Khanum",
            "Cancer hospital and research centre"
        );
        _registerCharity(
            0x90F79bf6EB2c4f870365E785982E1f101E93b906,
            "Namal University",
            "Education for underprivileged students"
        );
    }

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

    struct Charity {
        string name;
        string description;
        bool isActive;
        uint256 totalReceived;
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

    mapping(uint256 => Match) public matches;
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    mapping(address => mapping(uint256 => bool)) public hasPredictedMatch;
    mapping(uint256 => address[]) internal matchPredictors;
    mapping(address => Charity) public charities;

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

    receive() external payable {}

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
        require(
            block.timestamp >= matches[matchId].startTime,
            "Match has not started yet"
        );
        require(result != PredictionOutcome.NONE, "Invalid result");

        Match storage m = matches[matchId];
        m.status = MatchStatus.RESOLVED;
        m.result = result;

        uint256 charityAmt = (m.totalStaked * CHARITY_PERCENT) / 100;
        uint256 winnerAmt = (m.totalStaked * WINNER_PERCENT) / 100;
        uint256 platformAmt = (m.totalStaked * PLATFORM_PERCENT) / 100;

        m.charityPool = charityAmt;
        m.winnerPool = winnerAmt;
        platformBalance += platformAmt;

        // ← yeh naya add hua
        _distributeToCharities(charityAmt);

        emit MatchResolved(matchId, result, charityAmt, winnerAmt);
    }

    function cancelMatch(
        uint256 matchId
    ) external onlyOwner matchExists(matchId) matchIsActive(matchId) {
        matches[matchId].status = MatchStatus.CANCELLED;
        emit MatchCancelled(matchId);
    }

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

        // Pehle claimed mark karo — phir transfer (reentrancy se bachao)
        p.claimed = true;

        // Proportional reward calculate karo
        uint256 totalWinnerStake = _getTotalWinnerStake(matchId);
        uint256 reward = (matches[matchId].winnerPool * p.stakeAmount) /
            totalWinnerStake;

        (bool sent, ) = payable(msg.sender).call{value: reward}("");
        require(sent, "Reward transfer failed");

        emit RewardClaimed(msg.sender, matchId, reward);
    }

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

        // Pehle claimed — phir transfer
        p.claimed = true;

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "Refund failed");

        emit RefundClaimed(msg.sender, matchId, refundAmount);
    }

    function _registerCharity(
        address wallet,
        string memory name,
        string memory desc
    ) internal {
        require(wallet != address(0), "Invalid address");

        charities[wallet] = Charity({
            name: name,
            description: desc,
            isActive: true,
            totalReceived: 0
        });

        charityList.push(wallet);
        emit CharityRegistered(wallet, name);
    }

    function _distributeToCharities(uint256 totalAmount) internal {
        uint256 len = charityList.length;
        if (len == 0) return;

        uint256 share = totalAmount / len;
        // rounding remainder last charity ko milega
        uint256 dust = totalAmount - (share * len);

        for (uint256 i = 0; i < len; i++) {
            address c = charityList[i];
            if (!charities[c].isActive) continue;

            // last charity ko dust bhi milega
            uint256 amt = (i == len - 1) ? share + dust : share;

            charities[c].totalReceived += amt;
            totalCharityRaised += amt;

            (bool sent, ) = payable(c).call{value: amt}("");
            require(sent, "Charity transfer failed");

            emit DonationReleased(c, amt);
        }
    }

    function getAllCharities() external view returns (address[] memory) {
        return charityList;
    }

    function getCharityInfo(
        address wallet
    ) external view returns (Charity memory) {
        return charities[wallet];
    }
}
