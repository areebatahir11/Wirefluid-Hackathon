// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Predict4Good.sol";

contract PredictForGoodTest is Test {
    PredictForGood public predict;
    address owner = address(1);
    address user = address(2);

    function setUp() public {
        vm.prank(owner);
        predict = new PredictForGood();
    }

    function testCreateMatchSuccess() public {
        vm.prank(owner);

        uint256 startTime = block.timestamp + 1 days;
        uint256 lockTime = block.timestamp + 12 hours;

        uint256 matchId = predict.createMatch(
            "Team A",
            "Team B",
            startTime,
            lockTime
        );

        assertEq(matchId, 1);

        (uint256 id, , , , , , ) = predict.matches(matchId);
        assertEq(id, 1);
    }

    function testCreateMatchFail_NotOwner() public {
        vm.prank(user);

        uint256 startTime = block.timestamp + 1 days;
        uint256 lockTime = block.timestamp + 12 hours;

        vm.expectRevert(); // Ownable error
        predict.createMatch("A", "B", startTime, lockTime);
    }
}
