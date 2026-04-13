// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {Core} from "../src/core.sol";
import {Donation} from "../src/Donation.sol";
import {RewardNFT} from "../src/NFTTier.sol";

contract DeployPredict4Good is Script {
    // ── Charity wallets (replace with real addresses on mainnet) ──
    address constant C1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address constant C2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address constant C3 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // ── Step 1: Deploy RewardNFT ──────────────────────────
        RewardNFT nft = new RewardNFT();
        console.log("RewardNFT deployed at:", address(nft));

        // ── Step 2: Deploy Donation ───────────────────────────
        Donation donation = new Donation(C1, C2, C3);
        console.log("Donation  deployed at:", address(donation));

        // ── Step 3: Deploy Core (needs NFT address) ───────────
        Core core = new Core(address(nft));
        console.log("Core deployed at:", address(core));

        // ── Step 4: Wire Core → Donation ──────────────────────
        // FIX #3: setDonation is now onlyOwner — deployer calls it here
        core.setDonation(payable(address(donation)));

        // ── Step 5: FIX #5 — transfer Donation ownership to Core
        // Now Core is the only address allowed to call distributeToCharities
        donation.transferOwnership(address(core));

        // ── Step 6: Wire NFT → Core ───────────────────────────
        // Now Core is the only address allowed to mintNft / upgradeNft
        nft.setCore(address(core));

        vm.stopBroadcast();

        // ── Summary ───────────────────────────────────────────

        console.log("Deployment complete on WireFluid");
        console.log("Core:      ", address(core));
        console.log("Donation:  ", address(donation));
        console.log("RewardNFT: ", address(nft));

        console.log("Next steps:");
        console.log("1. Call core.createMatch() to add matches");
        console.log("2. Call nft.setUris(bronzeURI, silverURI, goldURI)");
    }
}
