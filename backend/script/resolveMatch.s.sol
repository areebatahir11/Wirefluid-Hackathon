// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {Core} from "../src/core.sol";

contract ResolveMatches is Script {
    function run() external {
        vm.startBroadcast();

        Core core = Core(payable(0x4c272a52FE77eBb39F5d3EFf162AdAeD277e07A7));

        // ⚠️ Match results (example mapping)
        // 0 = NONE, 1 = TEAM_A, 2 = TEAM_B, 3 = DRAW

        // Resolve Match 1 → TEAM_A wins
        core.resolveMatch(1, Core.PredictionOutcome.TEAM_A);

        // Resolve Match 2 → TEAM_B wins
        core.resolveMatch(2, Core.PredictionOutcome.TEAM_B);

        // Resolve Match 3 → DRAW
        core.resolveMatch(3, Core.PredictionOutcome.DRAW);

        vm.stopBroadcast();
    }
}
