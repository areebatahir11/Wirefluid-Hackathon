// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {PredictForGood} from "../src/Predict4Good.sol";

contract PredictForGoodTest is Test {
    PredictForGood public predict;

    // ─── Actors ───
    address owner = address(1);
    address user1 = address(2); // winner
    address user2 = address(3); // loser
    address user3 = address(4); // second winner

    // ─── Shared match params ───
    uint256 startTime;
    uint256 lockTime;

    // ─── Charity addresses (same as constructor) ───
    address charity1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address charity2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address charity3 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    // ─────────────────────────────────────────────────────────
    //  SETUP
    // ─────────────────────────────────────────────────────────
    function setUp() public {
        vm.prank(owner);
        predict = new PredictForGood();

        // Default times — reuse in tests
        startTime = block.timestamp + 1 days;
        lockTime = block.timestamp + 12 hours;

        // Give ETH to users
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(user3, 10 ether);
    }

    // ─────────────────────────────────────────────────────────
    //  HELPER — creates match #1 and returns matchId
    // ─────────────────────────────────────────────────────────
    function _createMatch() internal returns (uint256 matchId) {
        vm.prank(owner);
        matchId = predict.createMatch(
            "Karachi Kings",
            "Lahore Qalandars",
            startTime,
            lockTime
        );
    }

    // ─────────────────────────────────────────────────────────
    //  HELPER — create + place predictions + resolve
    // ─────────────────────────────────────────────────────────
    function _setupResolvedMatch() internal returns (uint256 matchId) {
        matchId = _createMatch();

        // user1 bets TEAM_A — 1 ETH
        vm.prank(user1);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );

        // user2 bets TEAM_B — 1 ETH (loser)
        vm.prank(user2);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_B
        );

        // Move time to after match starts
        vm.warp(startTime + 1);

        // Owner resolves — TEAM_A wins
        vm.prank(owner);
        predict.resolveMatch(matchId, PredictForGood.PredictionOutcome.TEAM_A);
    }

    // ═════════════════════════════════════════════════════════
    //  1. CREATE MATCH
    // ═════════════════════════════════════════════════════════

    function testCreateMatch_Success() public {
        uint256 matchId = _createMatch();

        assertEq(matchId, 1);

        PredictForGood.Match memory m = predict.getMatch(matchId);
        assertEq(m.matchId, 1);
        assertEq(m.teamA, "Karachi Kings");
        assertEq(m.teamB, "Lahore Qalandars");
        assertEq(m.startTime, startTime);
        assertEq(m.lockTime, lockTime);
        assertEq(uint(m.status), uint(PredictForGood.MatchStatus.ACTIVE));
    }

    function testCreateMatch_Fail_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        predict.createMatch("A", "B", startTime, lockTime);
    }

    function testCreateMatch_Fail_LockAfterStart() public {
        vm.prank(owner);
        // lockTime > startTime — should fail
        vm.expectRevert("Lock must be before match starts");
        predict.createMatch(
            "A",
            "B",
            block.timestamp + 1 hours, // startTime
            block.timestamp + 2 hours // lockTime AFTER start — wrong
        );
    }

    function testCreateMatch_Fail_StartInPast() public {
        vm.prank(owner);

        vm.expectRevert("Start time must be in future");

        predict.createMatch(
            "A",
            "B",
            block.timestamp - 1,
            block.timestamp + 1 hours
        );
    }

    // ═════════════════════════════════════════════════════════
    //  2. PLACE PREDICTION
    // ═════════════════════════════════════════════════════════

    function testPlacePrediction_Success() public {
        uint256 matchId = _createMatch();

        vm.prank(user1);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );

        PredictForGood.Prediction memory p = predict.getUserPrediction(
            matchId,
            user1
        );

        assertEq(p.stakeAmount, 1 ether);
        assertEq(uint(p.choice), uint(PredictForGood.PredictionOutcome.TEAM_A));
        assertFalse(p.claimed);

        // Match total staked update hua?
        PredictForGood.Match memory m = predict.getMatch(matchId);
        assertEq(m.totalStaked, 1 ether);
    }

    function testPlacePrediction_Fail_ZeroStake() public {
        uint256 matchId = _createMatch();

        vm.prank(user1);
        vm.expectRevert("Stake must be greater than 0");
        predict.placePrediction{value: 0}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );
    }

    function testPlacePrediction_Fail_DoublePrediction() public {
        uint256 matchId = _createMatch();

        vm.prank(user1);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );

        // Same user dobara try kare
        vm.prank(user1);
        vm.expectRevert("Already predicted this match");
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_B
        );
    }

    function testPlacePrediction_Fail_AfterLock() public {
        uint256 matchId = _createMatch();

        // Time ko lockTime ke baad move karo
        vm.warp(lockTime + 1);

        vm.prank(user1);
        vm.expectRevert("Predictions are locked");
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );
    }

    function testPlacePrediction_Fail_InvalidChoice() public {
        uint256 matchId = _createMatch();

        vm.prank(user1);
        vm.expectRevert("Choose a valid outcome");
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.NONE // NONE invalid hai
        );
    }

    // ═════════════════════════════════════════════════════════
    //  3. RESOLVE MATCH + POOL SPLIT
    // ═════════════════════════════════════════════════════════

    function testResolveMatch_PoolSplitCorrect() public {
        uint256 matchId = _createMatch();

        // 2 ETH total stake
        vm.prank(user1);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );
        vm.prank(user2);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_B
        );

        vm.warp(startTime + 1);
        vm.prank(owner);
        predict.resolveMatch(matchId, PredictForGood.PredictionOutcome.TEAM_A);

        PredictForGood.Match memory m = predict.getMatch(matchId);

        // Total = 2 ETH
        // donationPool = 65% = 1.3 ETH
        // winnerPool   = 35% = 0.7 ETH
        assertEq(m.donationPool, 1.3 ether);
        assertEq(m.winnerPool, 0.7 ether);
        assertEq(uint(m.status), uint(PredictForGood.MatchStatus.RESOLVED));
        assertEq(uint(m.result), uint(PredictForGood.PredictionOutcome.TEAM_A));
    }

    function testResolveMatch_CharitiesReceiveFunds() public {
        uint256 matchId = _createMatch();

        vm.prank(user1);
        predict.placePrediction{value: 3 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );

        vm.warp(startTime + 1);

        // Charity balances pehle record karo
        uint256 c1Before = charity1.balance;
        uint256 c2Before = charity2.balance;
        uint256 c3Before = charity3.balance;

        vm.prank(owner);
        predict.resolveMatch(matchId, PredictForGood.PredictionOutcome.TEAM_A);

        // 3 ETH ka 65% = 1.95 ETH — 3 charities mein equally split
        // Each charity = 0.65 ETH
        assertEq(charity1.balance - c1Before, 0.65 ether);
        assertEq(charity2.balance - c2Before, 0.65 ether);
        assertEq(charity3.balance - c3Before, 0.65 ether);

        // totalCharityRaised update hua?
        assertEq(predict.totalCharityRaised(), 1.95 ether);
    }

    function testResolveMatch_Fail_NotOwner() public {
        uint256 matchId = _createMatch();
        vm.warp(startTime + 1);

        vm.prank(user1);
        vm.expectRevert();
        predict.resolveMatch(matchId, PredictForGood.PredictionOutcome.TEAM_A);
    }

    function testResolveMatch_Fail_BeforeStart() public {
        uint256 matchId = _createMatch();
        // Time warp nahi kiya — match start nahi hua

        vm.prank(owner);
        vm.expectRevert("Match has not started yet");
        predict.resolveMatch(matchId, PredictForGood.PredictionOutcome.TEAM_A);
    }

    // ═════════════════════════════════════════════════════════
    //  4. CLAIM REWARD
    // ═════════════════════════════════════════════════════════

    function testClaimReward_Success() public {
        uint256 matchId = _setupResolvedMatch();

        uint256 balBefore = user1.balance;

        vm.prank(user1);
        predict.claimReward(matchId);

        uint256 balAfter = user1.balance;

        // user1 ne 1 ETH lagaya, total stake = 2 ETH
        // winnerPool = 35% of 2 ETH = 0.7 ETH
        // user1 hi akela winner — pura 0.7 ETH milega
        assertEq(balAfter - balBefore, 0.7 ether);

        // claimed flag set hua?
        PredictForGood.Prediction memory p = predict.getUserPrediction(
            matchId,
            user1
        );
        assertTrue(p.claimed);

        // correctPredictions increment hua?
        assertEq(predict.correctPredictions(user1), 1);
    }

    function testClaimReward_TwoWinners_ProportionalSplit() public {
        uint256 matchId = _createMatch();

        // user1 = 1 ETH on TEAM_A
        vm.prank(user1);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );

        // user3 = 1 ETH on TEAM_A (dono winners)
        vm.prank(user3);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );

        // user2 = 2 ETH on TEAM_B (loser)
        vm.prank(user2);
        predict.placePrediction{value: 2 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_B
        );

        vm.warp(startTime + 1);
        vm.prank(owner);
        predict.resolveMatch(matchId, PredictForGood.PredictionOutcome.TEAM_A);

        // Total = 4 ETH, winnerPool = 35% = 1.4 ETH
        // user1 aur user3 dono ne 1 ETH lagaya — 50/50 split
        // Each gets = 0.7 ETH

        uint256 u1Before = user1.balance;
        uint256 u3Before = user3.balance;

        vm.prank(user1);
        predict.claimReward(matchId);

        vm.prank(user3);
        predict.claimReward(matchId);

        assertEq(user1.balance - u1Before, 0.7 ether);
        assertEq(user3.balance - u3Before, 0.7 ether);
    }

    function testClaimReward_Fail_WrongPrediction() public {
        uint256 matchId = _setupResolvedMatch();

        // user2 ne TEAM_B bet kiya tha — TEAM_A jeeta
        vm.prank(user2);
        vm.expectRevert("Your prediction was wrong");
        predict.claimReward(matchId);
    }

    function testClaimReward_Fail_DoubleClaim() public {
        uint256 matchId = _setupResolvedMatch();

        vm.prank(user1);
        predict.claimReward(matchId);

        // Dobara claim karne ki koshish
        vm.prank(user1);
        vm.expectRevert("Already claimed");
        predict.claimReward(matchId);
    }

    function testClaimReward_Fail_MatchNotResolved() public {
        uint256 matchId = _createMatch();

        vm.prank(user1);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );

        // Resolve nahi kiya abhi tak
        vm.prank(user1);
        vm.expectRevert("Match not resolved yet");
        predict.claimReward(matchId);
    }

    // ═════════════════════════════════════════════════════════
    //  5. CANCEL MATCH + CLAIM REFUND
    // ═════════════════════════════════════════════════════════

    function testCancelMatch_And_ClaimRefund() public {
        uint256 matchId = _createMatch();

        vm.prank(user1);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );

        // Admin cancels
        vm.prank(owner);
        predict.cancelMatch(matchId);

        // Status check
        PredictForGood.Match memory m = predict.getMatch(matchId);
        assertEq(uint(m.status), uint(PredictForGood.MatchStatus.CANCELLED));

        // user1 refund leta hai
        uint256 balBefore = user1.balance;
        vm.prank(user1);
        predict.claimRefund(matchId);

        // Pura 1 ETH wapas mila
        assertEq(user1.balance - balBefore, 1 ether);
    }

    function testClaimRefund_Fail_MatchNotCancelled() public {
        uint256 matchId = _setupResolvedMatch(); // RESOLVED hai

        vm.prank(user1);
        vm.expectRevert("Match was not cancelled");
        predict.claimRefund(matchId);
    }

    function testClaimRefund_Fail_DoubleRefund() public {
        uint256 matchId = _createMatch();

        vm.prank(user1);
        predict.placePrediction{value: 1 ether}(
            matchId,
            PredictForGood.PredictionOutcome.TEAM_A
        );

        vm.prank(owner);
        predict.cancelMatch(matchId);

        vm.prank(user1);
        predict.claimRefund(matchId);

        // Dobara refund try karo
        vm.prank(user1);
        vm.expectRevert("Already refunded");
        predict.claimRefund(matchId);
    }

    // ═════════════════════════════════════════════════════════
    //  6. MINT NFT
    // ═════════════════════════════════════════════════════════

    function testMintNFT_Bronze_AfterFirstCorrectPrediction() public {
        uint256 matchId = _setupResolvedMatch();

        // user1 pehle reward claim kare — correctPredictions++ hota hai wahan
        vm.prank(user1);
        predict.claimReward(matchId);

        // Ab mint karo
        vm.prank(user1);
        predict.mintPredictorNft(matchId);

        // Token mila?
        uint256[] memory nfts = predict.getUserNfts(user1);
        assertEq(nfts.length, 1);

        // Tier Bronze hai?
        PredictForGood.NftMetadata memory meta = predict.getNftMetadata(
            nfts[0]
        );
        assertEq(uint(meta.tier), uint(PredictForGood.NFTTier.BRONZE));

        // ERC721 ownership check
        assertEq(predict.ownerOf(nfts[0]), user1);
    }

    function testMintNFT_Fail_WrongPrediction() public {
        uint256 matchId = _setupResolvedMatch();

        // user2 ne galat predict kiya tha
        vm.prank(user2);
        vm.expectRevert("Prediction was wrong");
        predict.mintPredictorNft(matchId);
    }

    function testMintNFT_Fail_DoubleMint_SameTier() public {
        uint256 matchId = _setupResolvedMatch();

        vm.prank(user1);
        predict.claimReward(matchId);

        vm.prank(user1);
        predict.mintPredictorNft(matchId);

        // Dobara same tier mint karne ki koshish
        vm.prank(user1);
        vm.expectRevert("This tier already minted");
        predict.mintPredictorNft(matchId);
    }

    function testMintNFT_Fail_NotEligible() public {
        // user3 ne koi prediction hi nahi ki
        uint256 matchId = _setupResolvedMatch();

        vm.prank(user3);
        vm.expectRevert("No prediction found");
        predict.mintPredictorNft(matchId);
    }

    // ═════════════════════════════════════════════════════════
    //  7. UPGRADE NFT
    // ═════════════════════════════════════════════════════════

    function testUpgradeNFT_Bronze_To_Silver() public {
        // user1 ko 5 correct predictions chahiye Silver ke liye
        // 5 alag matches banate hain — user1 sab mein jeete

        uint256 tokenId;

        for (uint256 i = 0; i < 5; i++) {
            // Har iteration ke liye naya time
            uint256 sTime = block.timestamp + 1 days + (i * 2 days);
            uint256 lTime = block.timestamp + 12 hours + (i * 2 days);

            vm.prank(owner);
            uint256 mId = predict.createMatch("Team A", "Team B", sTime, lTime);

            vm.prank(user1);
            predict.placePrediction{value: 0.1 ether}(
                mId,
                PredictForGood.PredictionOutcome.TEAM_A
            );

            vm.warp(sTime + 1);

            vm.prank(owner);
            predict.resolveMatch(mId, PredictForGood.PredictionOutcome.TEAM_A);

            vm.prank(user1);
            predict.claimReward(mId);

            // Pehle match ke baad Bronze mint karo
            if (i == 0) {
                vm.prank(user1);
                predict.mintPredictorNft(mId);

                uint256[] memory nfts = predict.getUserNfts(user1);
                tokenId = nfts[0];
            }
        }

        // Ab 5 correct predictions hain — Silver upgrade karo
        vm.prank(user1);
        predict.upgradeNft(tokenId);

        PredictForGood.NftMetadata memory meta = predict.getNftMetadata(
            tokenId
        );
        assertEq(uint(meta.tier), uint(PredictForGood.NFTTier.SILVER));
    }

    function testUpgradeNFT_Fail_NotYourNFT() public {
        uint256 matchId = _setupResolvedMatch();

        vm.prank(user1);
        predict.claimReward(matchId);

        vm.prank(user1);
        predict.mintPredictorNft(matchId);

        uint256[] memory nfts = predict.getUserNfts(user1);
        uint256 tokenId = nfts[0];

        // user2 user1 ka NFT upgrade karne ki koshish
        vm.prank(user2);
        vm.expectRevert("Not your NFT");
        predict.upgradeNft(tokenId);
    }

    function testUpgradeNFT_Fail_NotEnoughPredictions() public {
        uint256 matchId = _setupResolvedMatch();

        vm.prank(user1);
        predict.claimReward(matchId);

        // Sirf 1 correct prediction — Bronze mint karo
        vm.prank(user1);
        predict.mintPredictorNft(matchId);

        uint256[] memory nfts = predict.getUserNfts(user1);

        // Silver ke liye 5 chahiye — abhi sirf 1 hai
        vm.prank(user1);
        vm.expectRevert("Not enough correct predictions");
        predict.upgradeNft(nfts[0]);
    }

    // ═════════════════════════════════════════════════════════
    //  8. VIEW FUNCTIONS
    // ═════════════════════════════════════════════════════════

    function testGetActiveMatches() public {
        _createMatch(); // match 1

        vm.prank(owner);
        predict.createMatch(
            "Peshawar Zalmi",
            "Quetta Gladiators",
            block.timestamp + 2 days,
            block.timestamp + 1 days
        ); // match 2

        uint256[] memory active = predict.getActiveMatches();
        assertEq(active.length, 2);
        assertEq(active[0], 1);
        assertEq(active[1], 2);
    }

    function testGetActiveMatches_ExcludeResolved() public {
        _setupResolvedMatch(); // resolved ho gaya

        uint256[] memory active = predict.getActiveMatches();
        assertEq(active.length, 0); // koi active nahi
    }

    function testGetAllCharities() public view {
        address[] memory list = predict.getAllCharities();
        assertEq(list.length, 3);
        assertEq(list[0], charity1);
        assertEq(list[1], charity2);
        assertEq(list[2], charity3);
    }

    function testGetCharityInfo() public view {
        PredictForGood.Charity memory c = predict.getCharityInfo(charity1);
        assertEq(c.name, "Edhi Foundation");
        assertTrue(c.isActive);
        assertEq(c.totalReceived, 0); // abhi kuch nahi mila
    }

    function testSetNFTUris_OnlyOwner() public {
        vm.prank(owner);
        predict.setNftUris("ipfs://bronze", "ipfs://silver", "ipfs://gold");

        assertEq(predict.bronzeURI(), "ipfs://bronze");
        assertEq(predict.silverURI(), "ipfs://silver");
        assertEq(predict.goldURI(), "ipfs://gold");
    }

    function testSetNFTUris_Fail_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        predict.setNftUris("a", "b", "c");
    }

    function testTokenURI_ReturnsCorrectTier() public {
        // URIs set karo
        vm.prank(owner);
        predict.setNftUris("ipfs://bronze", "ipfs://silver", "ipfs://gold");

        uint256 matchId = _setupResolvedMatch();

        vm.prank(user1);
        predict.claimReward(matchId);

        vm.prank(user1);
        predict.mintPredictorNft(matchId);

        uint256[] memory nfts = predict.getUserNfts(user1);
        string memory uri = predict.tokenURI(nfts[0]);

        assertEq(uri, "ipfs://bronze");
    }
}
