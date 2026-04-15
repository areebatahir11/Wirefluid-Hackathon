// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {Core} from "../src/core.sol";

contract ResolveMatches is Script {
    function run() external {
        vm.startBroadcast();

        Core core = Core(payable(0x4c272a52FE77eBb39F5d3EFf162AdAeD277e07A7));

        uint256 totalMatches = 3; // or pass dynamically if you want

        for (uint256 matchId = 1; matchId <= totalMatches; matchId++) {
            uint256 rand = uint256(
                keccak256(
                    abi.encodePacked(block.timestamp, matchId, msg.sender)
                )
            );

            uint256 outcome = rand % 3;
            // 0 = TEAM_A, 1 = TEAM_B, 2 = DRAW

            if (outcome == 0) {
                core.resolveMatch(matchId, Core.PredictionOutcome.TEAM_A);
            } else if (outcome == 1) {
                core.resolveMatch(matchId, Core.PredictionOutcome.TEAM_B);
            } else {
                core.resolveMatch(matchId, Core.PredictionOutcome.DRAW);
            }
        }

        vm.stopBroadcast();
    }
}
