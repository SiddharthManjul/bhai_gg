// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BhaiBadge.sol";

contract DeployBhaiBadge is Script {
    function run() external {
        // Get the private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        BhaiBadge bhaiBadge = new BhaiBadge();

        console.log("BhaiBadge deployed to:", address(bhaiBadge));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));

        vm.stopBroadcast();
    }
}
