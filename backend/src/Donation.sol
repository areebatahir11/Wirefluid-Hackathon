// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract Donation is ReentrancyGuard {
    // ─────────────────────────────────────────────────────────
    //  FIX #5 — owner starts as deployer, then transferred to Core
    // ─────────────────────────────────────────────────────────
    address public owner;

    struct Charity {
        string name;
        string description;
        bool isActive;
        uint256 totalReceived;
    }

    address[] public charityList;
    mapping(address => Charity) public charities;
    uint256 public totalCharityRaised;

    event CharityRegistered(address indexed wallet, string name);
    event DonationReleased(address indexed charity, uint256 amount);
    event OwnershipTransferred(
        address indexed oldOwner,
        address indexed newOwner
    );

    constructor(address c1, address c2, address c3) {
        owner = msg.sender; // deployer initially; transfer to Core after deploy

        _registerCharity(
            c1,
            "Edhi Foundation",
            "Pakistan's largest welfare organization"
        );
        _registerCharity(
            c2,
            "Shaukat Khanum",
            "Cancer hospital and research centre"
        );
        _registerCharity(
            c3,
            "Namal University",
            "Education for underprivileged students"
        );
    }

    // ─────────────────────────────────────────────────────────
    //  FIX #5 — transferOwnership so Core becomes the allowed caller
    // ─────────────────────────────────────────────────────────
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL
    // ─────────────────────────────────────────────────────────

    function _onlyOwner() internal view {
        require(msg.sender == owner, "Not owner");
    }

    function _registerCharity(
        address wallet,
        string memory name,
        string memory desc
    ) internal {
        require(wallet != address(0), "Invalid address");

        charities[wallet] = Charity({
            name: name,
            description: desc,
            isActive: true,
            totalReceived: 0
        });

        charityList.push(wallet);
        emit CharityRegistered(wallet, name);
    }

    // ─────────────────────────────────────────────────────────
    //  CORE-ONLY FUNCTION
    //  FIX #1 — ETH must already be in this contract before calling
    //           (Core forwards ETH via .call{value: donationAmt} first)
    // ─────────────────────────────────────────────────────────
    function distributeToCharities(
        uint256 totalAmount
    ) external onlyOwner nonReentrant {
        uint256 len = charityList.length;
        if (len == 0) return;

        uint256 share = totalAmount / len;
        uint256 dust = totalAmount - (share * len);

        for (uint256 i = 0; i < len; i++) {
            address c = charityList[i];
            if (!charities[c].isActive) continue;

            // Last charity gets rounding dust
            uint256 amt = (i == len - 1) ? share + dust : share;

            charities[c].totalReceived += amt;
            totalCharityRaised += amt;

            (bool sent, ) = payable(c).call{value: amt}("");
            require(sent, "Charity transfer failed");

            emit DonationReleased(c, amt);
        }
    }

    // ─────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────
    function getAllCharities() external view returns (address[] memory) {
        return charityList;
    }

    function getCharity(address wallet) external view returns (Charity memory) {
        return charities[wallet];
    }

    receive() external payable {}
}
