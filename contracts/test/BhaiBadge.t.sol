// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BhaiBadge.sol";

contract BhaiBadgeTest is Test {
    BhaiBadge public bhaiBadge;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        bhaiBadge = new BhaiBadge();
    }

    function testMint() public {
        string memory tokenURI = "https://bhai.gg/metadata/1.json";
        string memory eventId = "event_123";

        uint256 tokenId = bhaiBadge.mint(
            user1,
            BhaiBadge.BadgeType.EVENT_ATTENDANCE,
            tokenURI,
            eventId
        );

        assertEq(tokenId, 1);
        assertEq(bhaiBadge.ownerOf(tokenId), user1);
        assertEq(bhaiBadge.tokenURI(tokenId), tokenURI);
        assertEq(
            uint256(bhaiBadge.getBadgeType(tokenId)),
            uint256(BhaiBadge.BadgeType.EVENT_ATTENDANCE)
        );
        assertEq(bhaiBadge.getEventId(tokenId), eventId);
    }

    function testBatchMint() public {
        address[] memory recipients = new address[](3);
        recipients[0] = user1;
        recipients[1] = user2;
        recipients[2] = user1;

        BhaiBadge.BadgeType[] memory badgeTypes = new BhaiBadge.BadgeType[](3);
        badgeTypes[0] = BhaiBadge.BadgeType.STARTER;
        badgeTypes[1] = BhaiBadge.BadgeType.ACTIVE;
        badgeTypes[2] = BhaiBadge.BadgeType.EVENT_ATTENDANCE;

        string[] memory tokenURIs = new string[](3);
        tokenURIs[0] = "https://bhai.gg/metadata/1.json";
        tokenURIs[1] = "https://bhai.gg/metadata/2.json";
        tokenURIs[2] = "https://bhai.gg/metadata/3.json";

        string[] memory eventIds = new string[](3);
        eventIds[0] = "";
        eventIds[1] = "";
        eventIds[2] = "event_456";

        bhaiBadge.batchMint(recipients, badgeTypes, tokenURIs, eventIds);

        assertEq(bhaiBadge.ownerOf(1), user1);
        assertEq(bhaiBadge.ownerOf(2), user2);
        assertEq(bhaiBadge.ownerOf(3), user1);
        assertEq(bhaiBadge.totalSupply(), 3);
    }

    function testOnlyOwnerCanMint() public {
        vm.prank(user1);
        vm.expectRevert();
        bhaiBadge.mint(
            user2,
            BhaiBadge.BadgeType.STARTER,
            "https://bhai.gg/metadata/1.json",
            ""
        );
    }

    function testTotalSupply() public {
        assertEq(bhaiBadge.totalSupply(), 0);

        bhaiBadge.mint(
            user1,
            BhaiBadge.BadgeType.STARTER,
            "https://bhai.gg/metadata/1.json",
            ""
        );

        assertEq(bhaiBadge.totalSupply(), 1);

        bhaiBadge.mint(
            user2,
            BhaiBadge.BadgeType.ACTIVE,
            "https://bhai.gg/metadata/2.json",
            ""
        );

        assertEq(bhaiBadge.totalSupply(), 2);
    }

    function testBadgeMetadata() public {
        string memory tokenURI = "https://bhai.gg/metadata/starter.json";
        string memory eventId = "meetup_789";

        uint256 tokenId = bhaiBadge.mint(
            user1,
            BhaiBadge.BadgeType.MEETUP,
            tokenURI,
            eventId
        );

        assertEq(bhaiBadge.name(), "Bhai Badge");
        assertEq(bhaiBadge.symbol(), "BHAI");
        assertEq(bhaiBadge.tokenURI(tokenId), tokenURI);
        assertEq(bhaiBadge.getEventId(tokenId), eventId);
    }

    function testBatchMintArrayLengthMismatch() public {
        address[] memory recipients = new address[](2);
        recipients[0] = user1;
        recipients[1] = user2;

        BhaiBadge.BadgeType[] memory badgeTypes = new BhaiBadge.BadgeType[](3);
        badgeTypes[0] = BhaiBadge.BadgeType.STARTER;
        badgeTypes[1] = BhaiBadge.BadgeType.ACTIVE;
        badgeTypes[2] = BhaiBadge.BadgeType.VETERAN;

        string[] memory tokenURIs = new string[](2);
        tokenURIs[0] = "https://bhai.gg/metadata/1.json";
        tokenURIs[1] = "https://bhai.gg/metadata/2.json";

        string[] memory eventIds = new string[](2);
        eventIds[0] = "";
        eventIds[1] = "";

        vm.expectRevert("Array lengths must match");
        bhaiBadge.batchMint(recipients, badgeTypes, tokenURIs, eventIds);
    }
}
