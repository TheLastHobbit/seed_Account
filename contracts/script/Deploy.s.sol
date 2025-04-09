// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/SeedCertifier.sol";
import "../src/ShadowVerifier.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 首先部署 SeedCertifier 合约
        SeedCertifier seedCertifier = new SeedCertifier();
        console.log("SeedCertifier 已部署到地址:", address(seedCertifier));
        
        // 然后部署 ShadowVerifier 合约，并传入 SeedCertifier 地址
        ShadowVerifier shadowVerifier = new ShadowVerifier(address(seedCertifier));
        console.log("ShadowVerifier 已部署到地址:", address(shadowVerifier));
        
        vm.stopBroadcast();
    }
}
