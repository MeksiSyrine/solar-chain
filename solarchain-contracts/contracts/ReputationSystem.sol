// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ReputationSystem is Ownable {
    struct Rating {
        address consumer;
        address producer;
        uint8 score;
        uint256 tradeId;
        uint256 timestamp;
    }

    struct ProducerReputation {
        uint256 totalScore;
        uint256 ratingCount;
        uint256 averageScore;
    }

    address public authorizedMarket;
    uint256 public ratingCounter;

    mapping(address => ProducerReputation) public reputations;
    mapping(uint256 => bool) public tradeRated;
    mapping(uint256 => Rating) public ratings;
    mapping(address => uint256[]) public ratingsByProducer;
    mapping(address => uint256[]) public ratingsByConsumer;

    mapping(uint256 => address) public tradeConsumer;
    mapping(uint256 => address) public tradeProducer;

    event RatingSubmitted(
        uint256 indexed ratingId,
        address indexed consumer,
        address indexed producer,
        uint8 score,
        uint256 tradeId
    );
    event TradeRecorded(uint256 indexed tradeId, address indexed consumer, address indexed producer);

    error UnauthorizedMarket();
    error InvalidAddress();
    error InvalidScore();
    error TradeAlreadyRated();
    error TradeNotRecorded();
    error NotTradeConsumer();
    error ProducerNotFound();

    modifier onlyMarket() {
        if (msg.sender != authorizedMarket) {
            revert UnauthorizedMarket();
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setAuthorizedMarket(address market) external onlyOwner {
        if (market == address(0)) {
            revert InvalidAddress();
        }
        authorizedMarket = market;
    }

    function recordTrade(uint256 tradeId, address consumer, address producer) external onlyMarket {
        if (consumer == address(0) || producer == address(0)) {
            revert InvalidAddress();
        }

        tradeConsumer[tradeId] = consumer;
        tradeProducer[tradeId] = producer;

        emit TradeRecorded(tradeId, consumer, producer);
    }

    function submitRating(uint256 tradeId, uint8 score) external {
        if (score < 1 || score > 5) {
            revert InvalidScore();
        }
        if (tradeRated[tradeId]) {
            revert TradeAlreadyRated();
        }

        address consumer = tradeConsumer[tradeId];
        address producer = tradeProducer[tradeId];

        if (consumer == address(0)) {
            revert TradeNotRecorded();
        }
        if (msg.sender != consumer) {
            revert NotTradeConsumer();
        }
        if (producer == address(0)) {
            revert ProducerNotFound();
        }

        uint256 ratingId = ++ratingCounter;
        ratings[ratingId] = Rating({
            consumer: msg.sender,
            producer: producer,
            score: score,
            tradeId: tradeId,
            timestamp: block.timestamp
        });

        ratingsByProducer[producer].push(ratingId);
        ratingsByConsumer[msg.sender].push(ratingId);
        tradeRated[tradeId] = true;

        ProducerReputation storage rep = reputations[producer];
        rep.totalScore += score;
        rep.ratingCount += 1;
        rep.averageScore = (rep.totalScore * 100) / rep.ratingCount;

        emit RatingSubmitted(ratingId, msg.sender, producer, score, tradeId);
    }

    function getReputation(address producer) external view returns (ProducerReputation memory) {
        return reputations[producer];
    }

    function getRatingsByProducer(address producer) external view returns (Rating[] memory) {
        uint256[] storage ids = ratingsByProducer[producer];
        uint256 count = ids.length;
        Rating[] memory result = new Rating[](count);

        for (uint256 i = 0; i < count; i++) {
            result[i] = ratings[ids[i]];
        }

        return result;
    }

    function canRate(uint256 tradeId, address consumer) external view returns (bool) {
        address tradeConsumerAddress = tradeConsumer[tradeId];
        address tradeProducerAddress = tradeProducer[tradeId];

        return
            tradeConsumerAddress != address(0) &&
            tradeProducerAddress != address(0) &&
            !tradeRated[tradeId] &&
            tradeConsumerAddress == consumer;
    }
}
