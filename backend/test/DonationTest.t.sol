// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {Donation} from "../src/Donation.sol";

contract DonationTest is Test {
    Donation charity;

    address c1 = address(0xC1);
    address c2 = address(0xC2);
    address c3 = address(0xC3);

    function setUp() public {
        charity = new Donation(c1, c2, c3);
    }

    function testCharitiesRegistered() public view {
        address[] memory list = charity.getAllCharities();
        assertEq(list.length, 3);
        assertEq(list[0], c1);
        assertEq(list[1], c2);
        assertEq(list[2], c3);
    }

    function testCharityDetails() public view {
        Donation.Charity memory info = charity.getCharity(c1);
        assertEq(info.name, "Edhi Foundation");
        assertTrue(info.isActive);
    }

    function testDistributeOnlyOwner() public {
        vm.deal(address(charity), 3 ether);

        // Stranger cannot call
        vm.prank(address(0xDEAD));
        vm.expectRevert("Not owner");
        charity.distributeToCharities(3 ether);
    }

    function testDistributeETH() public {
        // FIX #5 test: owner (deployer = this) calls distribute
        vm.deal(address(charity), 3 ether);

        uint256 beforeC1 = c1.balance;
        uint256 beforeC2 = c2.balance;
        uint256 beforeC3 = c3.balance;

        charity.distributeToCharities(3 ether);

        // Each gets exactly 1 ETH (no dust since 3 divides evenly)
        assertEq(c1.balance - beforeC1, 1 ether);
        assertEq(c2.balance - beforeC2, 1 ether);
        assertEq(c3.balance - beforeC3, 1 ether);
    }

    function testOwnershipTransfer() public {
        address newOwner = address(0xBEEF);
        charity.transferOwnership(newOwner);
        assertEq(charity.owner(), newOwner);

        // Old owner can no longer call
        vm.expectRevert("Not owner");
        charity.distributeToCharities(0);
    }
}
