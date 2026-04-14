// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {Core} from "../src/core.sol";

contract CreateMatches is Script {
    function run() external {
        vm.startBroadcast();

        Core core = Core(payable(0x4c272a52FE77eBb39F5d3EFf162AdAeD277e07A7));

        string[6] memory teams = [
            "Lahore Qalandars",
            "Karachi Kings",
            "Islamabad United",
            "Multan Sultans",
            "Peshawar Zalmi",
            "Quetta Gladiators",
            "Rawalpindi Pindiz"
        ];

        uint256 base = block.timestamp;

        for (uint i = 0; i < teams.length; i += 2) {
            core.createMatch(
                teams[i],
                teams[i + 1],
                base + 600 + (i * 120),
                base + 300 + (i * 120)
            );
        }

        vm.stopBroadcast();
    }
}
