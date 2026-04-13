// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC721} from "../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";

contract RewardNFT is ERC721 {
    // ─────────────────────────────────────────────────────────
    //  Only Core contract can mint/upgrade — set once at deploy
    // ─────────────────────────────────────────────────────────
    address public core;

    enum NFTTier {
        NONE,
        BRONZE,
        SILVER,
        GOLD
    }

    struct NftMetadata {
        NFTTier tier;
        uint256 mintedAt;
        uint256 predictionsAtMint;
    }

    uint256 public tokenCounter;

    string public bronzeURI;
    string public silverURI;
    string public goldURI;

    mapping(uint256 => NftMetadata) public nftMetadata;
    mapping(address => uint256[]) public userNfts;
    mapping(address => mapping(NFTTier => bool)) public tierMinted;

    event NFTMinted(address indexed user, uint256 tokenId, NFTTier tier);
    event NFTUpgraded(
        address indexed user,
        uint256 tokenId,
        NFTTier oldTier,
        NFTTier newTier
    );
    event CoreSet(address indexed core);

    constructor() ERC721("PredictForGood", "P4G") {}

    // ─────────────────────────────────────────────────────────
    //  Wire Core address (called once from deploy script)
    // ─────────────────────────────────────────────────────────
    function setCore(address _core) external {
        require(core == address(0), "Core already set");
        require(_core != address(0), "Zero address");
        core = _core;
        emit CoreSet(_core);
    }

    modifier onlyCore() {
        require(msg.sender == core, "Not Core");
        _;
    }

    // ─────────────────────────────────────────────────────────
    //  ADMIN — URI setup (call after setCore, from your wallet)
    // ─────────────────────────────────────────────────────────
    function setUris(
        string calldata b,
        string calldata s,
        string calldata g
    ) external {
        // Anyone can call until you add an owner check — restrict if needed
        bronzeURI = b;
        silverURI = s;
        goldURI = g;
    }

    // ─────────────────────────────────────────────────────────
    //  MINT — only Core can call
    // ─────────────────────────────────────────────────────────
    function mintNft(
        address user,
        NFTTier tier,
        uint256 correctCount
    ) external onlyCore returns (uint256) {
        require(tier != NFTTier.NONE, "Not eligible");
        require(!tierMinted[user][tier], "Tier already minted");

        tierMinted[user][tier] = true;

        uint256 tokenId = ++tokenCounter;

        nftMetadata[tokenId] = NftMetadata({
            tier: tier,
            mintedAt: block.timestamp,
            predictionsAtMint: correctCount
        });

        userNfts[user].push(tokenId);
        _safeMint(user, tokenId);

        emit NFTMinted(user, tokenId, tier);
        return tokenId;
    }

    // ─────────────────────────────────────────────────────────
    //  UPGRADE — only Core can call
    //  FIX #4 — Core.upgradeNFT() calls this, passing msg.sender as user
    // ─────────────────────────────────────────────────────────
    function upgradeNft(address user, uint256 tokenId) external onlyCore {
        require(_ownerOf(tokenId) == user, "Not token owner");

        NftMetadata storage meta = nftMetadata[tokenId];
        NFTTier oldTier = meta.tier;
        NFTTier newTier;

        if (oldTier == NFTTier.BRONZE) newTier = NFTTier.SILVER;
        else if (oldTier == NFTTier.SILVER) newTier = NFTTier.GOLD;
        else revert("Already at max tier");

        require(!tierMinted[user][newTier], "Tier already minted");

        meta.tier = newTier;
        tierMinted[user][newTier] = true;

        emit NFTUpgraded(user, tokenId, oldTier, newTier);
    }

    // ─────────────────────────────────────────────────────────
    //  ERC721 OVERRIDE
    // ─────────────────────────────────────────────────────────
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        NFTTier tier = nftMetadata[tokenId].tier;
        if (tier == NFTTier.GOLD) return goldURI;
        if (tier == NFTTier.SILVER) return silverURI;
        if (tier == NFTTier.BRONZE) return bronzeURI;
        return "";
    }

    // ─────────────────────────────────────────────────────────
    //  VIEW
    // ─────────────────────────────────────────────────────────
    function getUserNfts(
        address user
    ) external view returns (uint256[] memory) {
        return userNfts[user];
    }

    function getNftMetadata(
        uint256 tokenId
    ) external view returns (NftMetadata memory) {
        return nftMetadata[tokenId];
    }
}
