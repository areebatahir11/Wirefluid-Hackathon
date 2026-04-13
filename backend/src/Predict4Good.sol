// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {ERC721} from "../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";

contract PredictForGood is ERC721, Ownable, ReentrancyGuard {
    // ─────────────────────────────────────────────────────────
    //  CONSTANTS
    // ─────────────────────────────────────────────────────────
    uint256 public constant DONATION_PERCENT = 65;
    uint256 public constant WINNER_PERCENT = 35;

    uint256 public constant BRONZE_THRESHOLD = 1;
    uint256 public constant SILVER_THRESHOLD = 5;
    uint256 public constant GOLD_THRESHOLD = 10;

    // ─────────────────────────────────────────────────────────
    //  STATE VARIABLES
    // ─────────────────────────────────────────────────────────
    uint256 public matchCounter;
    uint256 public tokenCounter;
    uint256 public totalCharityRaised;

    address[] public charityList;

    string public bronzeURI;
    string public silverURI;
    string public goldURI;

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
    enum NFTTier {
        NONE,
        BRONZE,
        SILVER,
        GOLD
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

    struct Charity {
        string name;
        string description;
        bool isActive;
        uint256 totalReceived;
    }

    struct NftMetadata {
        NFTTier tier;
        uint256 mintedAt;
        uint256 predictionsAtMint;
    }

    // ─────────────────────────────────────────────────────────
    //  MAPPINGS
    // ─────────────────────────────────────────────────────────
    mapping(uint256 => Match) public matches;
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    mapping(address => mapping(uint256 => bool)) public hasPredictedMatch;
    mapping(uint256 => address[]) internal matchPredictors;
    mapping(address => Charity) public charities;
    mapping(uint256 => NftMetadata) public nftMetadata;
    mapping(address => uint256[]) public userNFTs;
    mapping(address => mapping(NFTTier => bool)) internal tierMinted;
    mapping(address => uint256) public correctPredictions;

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
    event PredictionPlaced(
        address indexed predictor,
        uint256 indexed matchId,
        uint256 stakeAmount
    );
    event MatchResolved(
        uint256 indexed matchId,
        PredictionOutcome result,
        uint256 donationAmount,
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
    event CharityRegistered(address indexed wallet, string name);
    event DonationReleased(address indexed charity, uint256 amount);
    event NFTMinted(address indexed user, uint256 tokenId, NFTTier tier);
    event NFTUpgraded(
        address indexed user,
        uint256 tokenId,
        NFTTier oldTier,
        NFTTier newTier
    );

    // ─────────────────────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────
    constructor() ERC721("PredictForGood", "P4G") Ownable(msg.sender) {
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

    // ─────────────────────────────────────────────────────────
    //  RECEIVE ETH
    // ─────────────────────────────────────────────────────────
    receive() external payable {}

    // ═════════════════════════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ═════════════════════════════════════════════════════════

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

    /// @notice Resolve match and distribute pools
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

        // 65% donation, 35% winners — no platform cut
        uint256 donationAmt = (m.totalStaked * DONATION_PERCENT) / 100;
        uint256 winnerAmt = (m.totalStaked * WINNER_PERCENT) / 100;

        m.donationPool = donationAmt;
        m.winnerPool = winnerAmt;

        _distributeToCharities(donationAmt);

        emit MatchResolved(matchId, result, donationAmt, winnerAmt);
    }

    /// @notice Cancel match — enables refunds
    function cancelMatch(
        uint256 matchId
    ) external onlyOwner matchExists(matchId) matchIsActive(matchId) {
        matches[matchId].status = MatchStatus.CANCELLED;
        emit MatchCancelled(matchId);
    }

    /// @notice Set NFT image URIs (IPFS links)
    function setNFTUris(
        string calldata bronze,
        string calldata silver,
        string calldata gold
    ) external onlyOwner {
        bronzeURI = bronze;
        silverURI = silver;
        goldURI = gold;
    }

    // ═════════════════════════════════════════════════════════
    //  USER FUNCTIONS
    // ═════════════════════════════════════════════════════════

    /// @notice Place prediction with ETH stake
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

    /// @notice Claim winner reward after match resolved
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

        // Claimed pehle mark karo — reentrancy se bachao
        p.claimed = true;

        // Correct prediction count badhao — NFT eligibility ke liye
        correctPredictions[msg.sender] += 1;

        // Proportional reward
        uint256 totalWinnerStake = _getTotalWinnerStake(matchId);
        uint256 reward = (matches[matchId].winnerPool * p.stakeAmount) /
            totalWinnerStake;

        (bool sent, ) = payable(msg.sender).call{value: reward}("");
        require(sent, "Reward transfer failed");

        emit RewardClaimed(msg.sender, matchId, reward);
    }

    /// @notice Claim refund if match was cancelled
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

    /// @notice Mint NFT badge after correct prediction
    function mintPredictorNFT(
        uint256 matchId
    ) external nonReentrant matchExists(matchId) {
        require(
            matches[matchId].status == MatchStatus.RESOLVED,
            "Match not resolved"
        );

        Prediction storage p = predictions[matchId][msg.sender];
        require(p.stakeAmount > 0, "No prediction found");
        require(p.choice == matches[matchId].result, "Prediction was wrong");

        NFTTier eligible = _getEligibleTier(msg.sender);
        require(eligible != NFTTier.NONE, "Not eligible yet");
        require(!tierMinted[msg.sender][eligible], "This tier already minted");

        tierMinted[msg.sender][eligible] = true;
        uint256 tokenId = ++tokenCounter;

        nftMetadata[tokenId] = NftMetadata({
            tier: eligible,
            mintedAt: block.timestamp,
            predictionsAtMint: correctPredictions[msg.sender]
        });

        userNFTs[msg.sender].push(tokenId);
        _safeMint(msg.sender, tokenId);

        emit NFTMinted(msg.sender, tokenId, eligible);
    }

    /// @notice Upgrade NFT Bronze→Silver or Silver→Gold
    function upgradeNFT(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not your NFT");

        NftMetadata storage meta = nftMetadata[tokenId];
        NFTTier oldTier = meta.tier;

        NFTTier newTier;
        if (oldTier == NFTTier.BRONZE) newTier = NFTTier.SILVER;
        else if (oldTier == NFTTier.SILVER) newTier = NFTTier.GOLD;
        else revert("Already at max tier");

        uint256 threshold = (newTier == NFTTier.SILVER)
            ? SILVER_THRESHOLD
            : GOLD_THRESHOLD;

        require(
            correctPredictions[msg.sender] >= threshold,
            "Not enough correct predictions"
        );
        require(!tierMinted[msg.sender][newTier], "Tier already minted");

        tierMinted[msg.sender][newTier] = true;
        meta.tier = newTier;

        emit NFTUpgraded(msg.sender, tokenId, oldTier, newTier);
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
                activeIds[idx] = i;
                idx++;
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

    function getAllCharities() external view returns (address[] memory) {
        return charityList;
    }

    function getCharityInfo(
        address wallet
    ) external view returns (Charity memory) {
        return charities[wallet];
    }

    function getUserNFTs(
        address user
    ) external view returns (uint256[] memory) {
        return userNFTs[user];
    }

    function getNFTMetadata(
        uint256 tokenId
    ) external view returns (NftMetadata memory) {
        return nftMetadata[tokenId];
    }

    function getMatchPredictors(
        uint256 matchId
    ) external view returns (address[] memory) {
        return matchPredictors[matchId];
    }

    // ═════════════════════════════════════════════════════════
    //  ERC721 OVERRIDE
    // ═════════════════════════════════════════════════════════

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        NFTTier tier = nftMetadata[tokenId].tier;

        if (tier == NFTTier.GOLD) return goldURI;
        if (tier == NFTTier.SILVER) return silverURI;
        if (tier == NFTTier.BRONZE) return bronzeURI;
        return "";
    }

    // ═════════════════════════════════════════════════════════
    //  INTERNAL FUNCTIONS
    // ═════════════════════════════════════════════════════════

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
        uint256 dust = totalAmount - (share * len);

        for (uint256 i = 0; i < len; i++) {
            address c = charityList[i];
            if (!charities[c].isActive) continue;

            // Last charity ko rounding dust bhi milti hai
            uint256 amt = (i == len - 1) ? share + dust : share;

            charities[c].totalReceived += amt;
            totalCharityRaised += amt;

            (bool sent, ) = payable(c).call{value: amt}("");
            require(sent, "Charity transfer failed");

            emit DonationReleased(c, amt);
        }
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

    function _getEligibleTier(address user) internal view returns (NFTTier) {
        uint256 correct = correctPredictions[user];

        if (correct >= GOLD_THRESHOLD) return NFTTier.GOLD;
        if (correct >= SILVER_THRESHOLD) return NFTTier.SILVER;
        if (correct >= BRONZE_THRESHOLD) return NFTTier.BRONZE;
        return NFTTier.NONE;
    }
}
