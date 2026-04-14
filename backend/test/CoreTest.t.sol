// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {Core} from "../src/core.sol";
import {Donation} from "../src/Donation.sol";
import {RewardNFT} from "../src/NFTTier.sol";

contract CoreTest is Test {
    Core core;
    Donation donation;
    RewardNFT nft;

    address owner = address(this);
    address alice = address(0xA1);
    address bob = address(0xB0);

    // Charity addresses
    address c1 = address(0xC1);
    address c2 = address(0xC2);
    address c3 = address(0xC3);

    uint256 constant START = 2000;
    uint256 constant LOCK = 1000;

    function setUp() public {
        nft = new RewardNFT();
        donation = new Donation(c1, c2, c3);
        core = new Core(address(nft));

        // Wire contracts
        core.setDonation(payable(address(donation)));
        donation.transferOwnership(address(core));
        nft.setCore(address(core));

        // Fund test users
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    // ─── helpers ──────────────────────────────────────────────────

    function _createMatch() internal returns (uint256) {
        vm.warp(1);
        return core.createMatch("PSG", "Barcelona", START, LOCK);
    }

    function _resolveMatch(uint256 id, Core.PredictionOutcome result) internal {
        vm.warp(START + 1);
        core.resolveMatch(id, result);
    }

    // ─── tests ────────────────────────────────────────────────────

    function testCreateMatch() public {
        uint256 id = _createMatch();
        assertEq(id, 1);

        Core.Match memory m = core.getMatch(1);
        assertEq(m.teamA, "PSG");
        assertEq(m.teamB, "Barcelona");
    }

    function testPlacePrediction() public {
        uint256 id = _createMatch();
        vm.warp(LOCK - 1);

        vm.prank(alice);
        core.placePrediction{value: 1 ether}(id, Core.PredictionOutcome.TEAM_A);

        Core.Prediction memory p = core.getUserPrediction(id, alice);
        assertEq(p.stakeAmount, 1 ether);
        assertEq(uint(p.choice), uint(Core.PredictionOutcome.TEAM_A));
    }

    function testCannotPredictTwice() public {
        uint256 id = _createMatch();
        vm.warp(LOCK - 1);

        vm.startPrank(alice);
        core.placePrediction{value: 1 ether}(id, Core.PredictionOutcome.TEAM_A);

        vm.expectRevert("Already predicted this match");
        core.placePrediction{value: 1 ether}(id, Core.PredictionOutcome.TEAM_B);
        vm.stopPrank();
    }

    function testCannotPredictAfterLock() public {
        uint256 id = _createMatch();
        vm.warp(LOCK + 1);

        vm.prank(alice);
        vm.expectRevert("Predictions are locked");
        core.placePrediction{value: 1 ether}(id, Core.PredictionOutcome.TEAM_A);
    }

    function testResolveAndClaimReward() public {
        uint256 id = _createMatch();
        vm.warp(LOCK - 1);

        vm.prank(alice);
        core.placePrediction{value: 2 ether}(id, Core.PredictionOutcome.TEAM_A);

        vm.prank(bob);
        core.placePrediction{value: 2 ether}(id, Core.PredictionOutcome.TEAM_B);

        _resolveMatch(id, Core.PredictionOutcome.TEAM_A);

        uint256 before = alice.balance;
        vm.prank(alice);
        core.claimReward(id);

        // Alice staked 2 ETH of total 4 ETH. WinnerPool = 35% of 4 ETH = 1.4 ETH.
        // Alice is the only winner → gets full 1.4 ETH
        assertEq(alice.balance - before, (4 ether * 35) / 100);
    }

    function testWrongPredictionCannotClaim() public {
        uint256 id = _createMatch();
        vm.warp(LOCK - 1);

        vm.prank(bob);
        core.placePrediction{value: 1 ether}(id, Core.PredictionOutcome.TEAM_B);

        _resolveMatch(id, Core.PredictionOutcome.TEAM_A);

        vm.prank(bob);
        vm.expectRevert("Your prediction was wrong");
        core.claimReward(id);
    }

    function testRefundOnCancellation() public {
        uint256 id = _createMatch();
        vm.warp(LOCK - 1);

        vm.prank(alice);
        core.placePrediction{value: 1 ether}(id, Core.PredictionOutcome.TEAM_A);

        core.cancelMatch(id);

        uint256 before = alice.balance;
        vm.prank(alice);
        core.claimRefund(id);
        assertEq(alice.balance - before, 1 ether);
    }

    function testCorrectPredictionsTracked() public {
        uint256 id = _createMatch();
        vm.warp(LOCK - 1);

        vm.prank(alice);
        core.placePrediction{value: 1 ether}(id, Core.PredictionOutcome.TEAM_A);

        _resolveMatch(id, Core.PredictionOutcome.TEAM_A);

        vm.prank(alice);
        core.claimReward(id);

        assertEq(core.correctPredictions(alice), 1);
    }

    function testDonationReceivesETH() public {
        uint256 id = _createMatch();
        vm.warp(LOCK - 1);

        vm.prank(alice);
        core.placePrediction{value: 4 ether}(id, Core.PredictionOutcome.TEAM_A);

        uint256 beforeC1 = c1.balance;
        _resolveMatch(id, Core.PredictionOutcome.TEAM_A);

        // 65% of 4 ETH = 2.6 ETH → split among 3 charities ≈ 0.866 ETH each
        uint256 total = 4 ether;
        uint256 expected = (total * 65) / 100 / 3;
        assertApproxEqAbs(c1.balance - beforeC1, expected, 2); // allow 2 wei dust
    }
}
