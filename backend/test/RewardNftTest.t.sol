// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {RewardNFT} from "../src/NFTTier.sol";

contract RewardNFTTest is Test {
    RewardNFT nft;

    address coreAddr = address(0xC0);
    address user = address(0xA1);

    function setUp() public {
        nft = new RewardNFT();
        nft.setCore(coreAddr);
    }

    function testMintBronze() public {
        vm.prank(coreAddr);
        uint256 id = nft.mintNft(user, RewardNFT.NFTTier.BRONZE, 1);
        assertEq(id, 1);
        assertEq(nft.ownerOf(1), user);

        RewardNFT.NftMetadata memory meta = nft.getNftMetadata(1);
        assertEq(uint(meta.tier), uint(RewardNFT.NFTTier.BRONZE));
        assertEq(meta.predictionsAtMint, 1);
    }

    function testCannotMintSameTierTwice() public {
        vm.startPrank(coreAddr);
        nft.mintNft(user, RewardNFT.NFTTier.BRONZE, 1);

        vm.expectRevert("Tier already minted");
        nft.mintNft(user, RewardNFT.NFTTier.BRONZE, 2);
        vm.stopPrank();
    }

    function testUpgradeBronzeToSilver() public {
        vm.startPrank(coreAddr);
        uint256 id = nft.mintNft(user, RewardNFT.NFTTier.BRONZE, 1);
        nft.upgradeNft(user, id);
        vm.stopPrank();

        RewardNFT.NftMetadata memory meta = nft.getNftMetadata(id);
        assertEq(uint(meta.tier), uint(RewardNFT.NFTTier.SILVER));
    }

    function testUpgradeSilverToGold() public {
        vm.startPrank(coreAddr);
        uint256 id = nft.mintNft(user, RewardNFT.NFTTier.BRONZE, 1);
        nft.upgradeNft(user, id); // → Silver
        nft.upgradeNft(user, id); // → Gold
        vm.stopPrank();

        RewardNFT.NftMetadata memory meta = nft.getNftMetadata(id);
        assertEq(uint(meta.tier), uint(RewardNFT.NFTTier.GOLD));
    }

    function testCannotUpgradePastGold() public {
        vm.startPrank(coreAddr);
        uint256 id = nft.mintNft(user, RewardNFT.NFTTier.BRONZE, 1);
        nft.upgradeNft(user, id); // → Silver
        nft.upgradeNft(user, id); // → Gold

        vm.expectRevert("Already at max tier");
        nft.upgradeNft(user, id);
        vm.stopPrank();
    }

    function testOnlyCoreCanMint() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert("Not Core");
        nft.mintNft(user, RewardNFT.NFTTier.BRONZE, 1);
    }

    function testSetCoreOnlyOnce() public {
        vm.expectRevert("Core already set");
        nft.setCore(address(0xBEEF));
    }
}
