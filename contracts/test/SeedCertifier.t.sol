// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/SeedCertifier.sol";

contract SeedCertifierTest is Test {
    SeedCertifier certifier;
    address seedAddr = address(0x789);

    function setUp() public {
        certifier = new SeedCertifier();
    }

    function testCertifySeed() public {
        bytes[] memory ring = new bytes[](2);
        ring[0] = hex"01";
        ring[1] = hex"02";
        bytes memory signature = "signature";
        bytes32 keyImage = keccak256("keyImage");

        certifier.certifySeed(seedAddr, ring, signature, keyImage);
        assertTrue(certifier.certifiedSeeds(seedAddr));
        assertTrue(certifier.usedKeyImages(keyImage));
    }

    function testDuplicateKeyImage() public {
        bytes[] memory ring = new bytes[](2);
        ring[0] = hex"01";
        ring[1] = hex"02";
        bytes32 keyImage = keccak256("keyImage");

        certifier.certifySeed(seedAddr, ring, "sig1", keyImage);
        vm.expectRevert("SeedCertifier: Key image already used");
        certifier.certifySeed(seedAddr, ring, "sig2", keyImage);
    }
}
