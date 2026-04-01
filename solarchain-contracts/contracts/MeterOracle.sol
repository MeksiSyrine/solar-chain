// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IEnergyToken {
    function mint(address to, uint256 amount) external;
}

contract MeterOracle is Ownable {
    struct Producer {
        bool isRegistered;
        uint256 maxCapacityKwh;
        uint256 totalMintedKwh;
        uint256 readingCount;
    }

    IEnergyToken public immutable energyToken;
    mapping(address => Producer) private producers;
    address[] private producerList;

    event ProducerRegistered(address indexed producer, uint256 maxCapacityKwh);
    event MeterReadingSubmitted(
        address indexed producer,
        uint256 kwhProduced,
        uint256 totalMintedKwh,
        uint256 timestamp
    );

    error InvalidProducerAddress();
    error InvalidTokenAddress();
    error InvalidCapacity();
    error InvalidReading();
    error ProducerNotRegistered();

    constructor(address energyTokenAddress) Ownable(msg.sender) {
        if (energyTokenAddress == address(0)) {
            revert InvalidTokenAddress();
        }
        energyToken = IEnergyToken(energyTokenAddress);
    }

    function registerProducer(address producer, uint256 maxCapacityKwh) external onlyOwner {
        if (producer == address(0)) {
            revert InvalidProducerAddress();
        }
        if (maxCapacityKwh == 0) {
            revert InvalidCapacity();
        }

        if (!producers[producer].isRegistered) {
            producerList.push(producer);
        }

        Producer storage producerData = producers[producer];
        producerData.isRegistered = true;
        producerData.maxCapacityKwh = maxCapacityKwh;

        emit ProducerRegistered(producer, maxCapacityKwh);
    }

    function submitReading(address producer, uint256 kwhProduced) external onlyOwner {
        Producer storage producerData = producers[producer];
        if (!producerData.isRegistered) {
            revert ProducerNotRegistered();
        }
        if (kwhProduced == 0 || kwhProduced > producerData.maxCapacityKwh) {
            revert InvalidReading();
        }

        producerData.totalMintedKwh += kwhProduced;
        producerData.readingCount += 1;

        energyToken.mint(producer, kwhProduced);

        emit MeterReadingSubmitted(producer, kwhProduced, producerData.totalMintedKwh, block.timestamp);
    }

    function getProducer(address producer) external view returns (Producer memory) {
        return producers[producer];
    }

    function isProducerRegistered(address producer) external view returns (bool) {
        return producers[producer].isRegistered;
    }

    function getAllProducers() external view returns (address[] memory) {
        return producerList;
    }
}
