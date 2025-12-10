// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BhaiBadge
 * @dev ERC-721 NFT contract for Bhai.gg badges and POAPs
 * @notice Supports event attendance badges, contribution badges, and meetup POAPs
 */
contract BhaiBadge is ERC721URIStorage, Ownable {
    using Strings for uint256;

    // Badge type enumeration
    enum BadgeType {
        STARTER,
        ACTIVE,
        VETERAN,
        ELITE,
        EVENT_ATTENDANCE,
        MEETUP
    }

    // Counter for token IDs
    uint256 private _tokenIdCounter;

    // Mapping from token ID to badge type
    mapping(uint256 => BadgeType) public tokenBadgeType;

    // Mapping from token ID to event/meetup ID (optional tracking)
    mapping(uint256 => string) public tokenEventId;

    // Events
    event BadgeMinted(
        address indexed to,
        uint256 indexed tokenId,
        BadgeType badgeType,
        string tokenURI,
        string eventId
    );

    constructor() ERC721("Bhai Badge", "BHAI") Ownable(msg.sender) {
        _tokenIdCounter = 1; // Start from 1
    }

    /**
     * @dev Mint a new badge NFT
     * @param to Address to mint the badge to
     * @param badgeType Type of badge being minted
     * @param tokenURI Metadata URI for the badge
     * @param eventId Optional event/meetup ID for tracking (can be empty string)
     * @return tokenId The ID of the newly minted token
     */
    function mint(
        address to,
        BadgeType badgeType,
        string memory tokenURI,
        string memory eventId
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        tokenBadgeType[tokenId] = badgeType;
        tokenEventId[tokenId] = eventId;

        emit BadgeMinted(to, tokenId, badgeType, tokenURI, eventId);

        return tokenId;
    }

    /**
     * @dev Batch mint multiple badges to different addresses
     * @param recipients Array of addresses to mint badges to
     * @param badgeTypes Array of badge types
     * @param tokenURIs Array of metadata URIs
     * @param eventIds Array of event/meetup IDs
     */
    function batchMint(
        address[] calldata recipients,
        BadgeType[] calldata badgeTypes,
        string[] calldata tokenURIs,
        string[] calldata eventIds
    ) external onlyOwner {
        require(
            recipients.length == badgeTypes.length &&
            recipients.length == tokenURIs.length &&
            recipients.length == eventIds.length,
            "Array lengths must match"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            mint(recipients[i], badgeTypes[i], tokenURIs[i], eventIds[i]);
        }
    }

    /**
     * @dev Get the badge type for a token
     * @param tokenId The token ID to query
     * @return The badge type
     */
    function getBadgeType(uint256 tokenId) external view returns (BadgeType) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenBadgeType[tokenId];
    }

    /**
     * @dev Get the event ID for a token
     * @param tokenId The token ID to query
     * @return The event/meetup ID
     */
    function getEventId(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenEventId[tokenId];
    }

    /**
     * @dev Get total supply of badges
     * @return The total number of badges minted
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }

    /**
     * @dev Override to prevent token transfers (soulbound option - comment out if transferable)
     * @notice Uncomment this function to make badges non-transferable (soulbound)
     */
    /*
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0))
        // Prevent transfers (from != address(0) && to != address(0))
        require(
            from == address(0) || to == address(0),
            "Badges are soulbound and cannot be transferred"
        );

        return super._update(to, tokenId, auth);
    }
    */
}
