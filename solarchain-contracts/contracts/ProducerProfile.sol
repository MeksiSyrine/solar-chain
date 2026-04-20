// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ProducerProfile is Ownable {
    mapping(address => string) public profileCID;
    mapping(address => uint256) public profileUpdatedAt;
    address[] private producersWithProfile;
    mapping(address => bool) private profileListed;

    event ProfileUpdated(address indexed producer, string cid, uint256 timestamp);
    event ProfileRemoved(address indexed producer);

    error EmptyCID();
    error InvalidCIDLength();
    error ProfileNotFound();

    constructor() Ownable(msg.sender) {}

    function setProfile(string memory cid) external {
        uint256 cidLength = bytes(cid).length;
        if (cidLength == 0) {
            revert EmptyCID();
        }
        if (cidLength < 10 || cidLength > 100) {
            revert InvalidCIDLength();
        }

        if (!profileListed[msg.sender]) {
            producersWithProfile.push(msg.sender);
            profileListed[msg.sender] = true;
        }

        profileCID[msg.sender] = cid;
        profileUpdatedAt[msg.sender] = block.timestamp;

        emit ProfileUpdated(msg.sender, cid, block.timestamp);
    }

    function getProfile(address producer) external view returns (string memory) {
        return profileCID[producer];
    }

    function hasProfile(address producer) external view returns (bool) {
        return bytes(profileCID[producer]).length > 0;
    }

    function getAllProducersWithProfile() external view returns (address[] memory) {
        uint256 total = producersWithProfile.length;
        uint256 activeCount;

        for (uint256 i = 0; i < total; i++) {
            if (bytes(profileCID[producersWithProfile[i]]).length > 0) {
                activeCount++;
            }
        }

        address[] memory activeProfiles = new address[](activeCount);
        uint256 index;

        for (uint256 i = 0; i < total; i++) {
            address producer = producersWithProfile[i];
            if (bytes(profileCID[producer]).length > 0) {
                activeProfiles[index] = producer;
                index++;
            }
        }

        return activeProfiles;
    }

    function removeProfile() external {
        if (bytes(profileCID[msg.sender]).length == 0) {
            revert ProfileNotFound();
        }

        profileCID[msg.sender] = "";
        profileUpdatedAt[msg.sender] = 0;

        emit ProfileRemoved(msg.sender);
    }
}
