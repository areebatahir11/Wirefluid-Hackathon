// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

contract PredictForGood is Ownable {
    uint256 public matchCounter;

    enum MatchStatus {
        ACTIVE,
        RESOLVED,
        CANCELLED
    }

    struct Match {
        uint256 matchId;
        string teamA;
        string teamB;
        uint256 startTime;
        uint256 lockTime; // predictions band ho jaayein is time ke baad
        MatchStatus status;
        uint256 totalStaked; // baad mein kaam aayega
    }

    event MatchStarted(
        uint256 indexed matchId,
        string teamA,
        string teamB,
        uint256 startTime,
        uint256 lockTime
    );

    mapping(uint256 => Match) public matches;

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
            totalStaked: 0
        });

        emit MatchStarted(matchId, teamA, teamB, startTime, lockTime);
    }
}
