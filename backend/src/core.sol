// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Donation} from "./Donation.sol";
import {RewardNFT} from "./NFTTier.sol";

contract Core {
    Donation public charity;
    RewardNFT public nft;

    uint256 public constant DONATION_PERCENT = 65;
    uint256 public constant WINNER_PERCENT = 35;

    uint256 public matchCounter;

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
        MatchStatus status;
        PredictionOutcome result;
        uint256 totalStaked;
        uint256 winnerPool;
        uint256 donationPool;
    }

    struct Prediction {
        PredictionOutcome choice;
        uint256 stakeAmount;
        bool claimed;
    }

    mapping(uint256 => Match) public matches;
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    mapping(address => uint256) public correctPredictions;

    event MatchCreated(uint256 matchId);
    event MatchResolved(uint256 matchId);

    constructor(address _nft) {
        nft = RewardNFT(_nft);
    }

    function createMatch() external returns (uint256) {
        uint256 id = ++matchCounter;

        matches[id] = Match({
            matchId: id,
            status: MatchStatus.ACTIVE,
            result: PredictionOutcome.NONE,
            totalStaked: 0,
            winnerPool: 0,
            donationPool: 0
        });

        emit MatchCreated(id);
        return id;
    }

    function resolveMatch(uint256 matchId, PredictionOutcome result) external {
        Match storage m = matches[matchId];

        m.status = MatchStatus.RESOLVED;
        m.result = result;

        uint256 donation = (m.totalStaked * DONATION_PERCENT) / 100;
        uint256 winner = (m.totalStaked * WINNER_PERCENT) / 100;

        m.donationPool = donation;
        m.winnerPool = winner;

        charity.distributeToCharities(donation);

        emit MatchResolved(matchId);
    }

    function mintUserNft(address user, uint256 correctCount) external {
        if (correctCount >= 10) {
            nft.mintNft(user, RewardNFT.NFTTier.GOLD, correctCount);
        } else if (correctCount >= 5) {
            nft.mintNft(user, RewardNFT.NFTTier.SILVER, correctCount);
        } else if (correctCount >= 1) {
            nft.mintNft(user, RewardNFT.NFTTier.BRONZE, correctCount);
        }
    }

    function setDonation(address payable _donation) external {
        require(address(charity) == address(0), "Already set");
        charity = Donation(_donation);
    }
}
