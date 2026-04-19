// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IEnergyCertificate {
    struct CertificateData {
        address buyer;
        address producer;
        uint256 kwhAmount;
        uint256 priceWei;
        uint256 tradeId;
        uint256 issuedAt;
    }

    function mint(address to, CertificateData calldata data) external returns (uint256);
}

interface IReputationSystem {
    function recordTrade(uint256 tradeId, address consumer, address producer) external;
}

contract EnergyMarket is ReentrancyGuard, Ownable {
    struct Offer {
        uint256 id;
        address producer;
        uint256 quantityKwh;
        uint256 pricePerKwhWei;
        uint256 remainingKwh;
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Trade {
        uint256 id;
        uint256 offerId;
        address producer;
        address consumer;
        uint256 quantityKwh;
        uint256 unitPriceWei;
        uint256 totalPriceWei;
        uint256 timestamp;
    }

    IERC20 public immutable energyToken;
    IEnergyCertificate public certificateContract;
    IReputationSystem public reputationSystem;

    uint256 private nextOfferId = 1;
    uint256 private nextTradeId = 1;

    mapping(uint256 => Offer) private offers;
    uint256[] private offerIds;
    Trade[] private tradeHistory;

    event OfferCreated(
        uint256 indexed offerId,
        address indexed producer,
        uint256 quantityKwh,
        uint256 pricePerKwhWei
    );
    event EnergySold(
        uint256 indexed offerId,
        uint256 indexed tradeId,
        address indexed consumer,
        address producer,
        uint256 quantityKwh,
        uint256 totalPriceWei
    );
    event OfferCancelled(uint256 indexed offerId, address indexed producer, uint256 remainingKwh);
    event CertificateContractUpdated(address indexed previousCertificateContract, address indexed newCertificateContract);

    error InvalidTokenAddress();
    error InvalidAmount();
    error InvalidPrice();
    error OfferNotFound();
    error OfferNotActive();
    error UnauthorizedOfferOwner();
    error InsufficientOfferQuantity();
    error IncorrectEthAmount();
    error TokenTransferFailed();
    error EthTransferFailed();

    constructor(address energyTokenAddress) Ownable(msg.sender) {
        if (energyTokenAddress == address(0)) {
            revert InvalidTokenAddress();
        }
        energyToken = IERC20(energyTokenAddress);
    }

    function setCertificateContract(address certificateAddress) external onlyOwner {
        address previous = address(certificateContract);
        certificateContract = IEnergyCertificate(certificateAddress);
        emit CertificateContractUpdated(previous, certificateAddress);
    }

    function setReputationSystem(address reputationAddress) external onlyOwner {
        reputationSystem = IReputationSystem(reputationAddress);
    }

    function createOffer(uint256 quantityKwh, uint256 pricePerKwhWei) external {
        if (quantityKwh == 0) {
            revert InvalidAmount();
        }
        if (pricePerKwhWei == 0) {
            revert InvalidPrice();
        }

        bool success = energyToken.transferFrom(msg.sender, address(this), quantityKwh);
        if (!success) {
            revert TokenTransferFailed();
        }

        uint256 offerId = nextOfferId++;
        offers[offerId] = Offer({
            id: offerId,
            producer: msg.sender,
            quantityKwh: quantityKwh,
            pricePerKwhWei: pricePerKwhWei,
            remainingKwh: quantityKwh,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        offerIds.push(offerId);

        emit OfferCreated(offerId, msg.sender, quantityKwh, pricePerKwhWei);
    }

    function buyEnergy(uint256 offerId, uint256 quantityKwh) external payable nonReentrant {
        if (quantityKwh == 0) {
            revert InvalidAmount();
        }

        Offer storage offer = offers[offerId];
        if (offer.id == 0) {
            revert OfferNotFound();
        }
        if (!offer.isActive) {
            revert OfferNotActive();
        }
        if (quantityKwh > offer.remainingKwh) {
            revert InsufficientOfferQuantity();
        }

        uint256 totalPriceWei = quantityKwh * offer.pricePerKwhWei;
        if (msg.value != totalPriceWei) {
            revert IncorrectEthAmount();
        }

        offer.remainingKwh -= quantityKwh;
        if (offer.remainingKwh == 0) {
            offer.isActive = false;
        }
        offer.updatedAt = block.timestamp;

        bool tokenTransferSuccess = energyToken.transfer(msg.sender, quantityKwh);
        if (!tokenTransferSuccess) {
            revert TokenTransferFailed();
        }

        (bool ethSent, ) = payable(offer.producer).call{value: totalPriceWei}("");
        if (!ethSent) {
            revert EthTransferFailed();
        }

        uint256 tradeId = nextTradeId++;
        tradeHistory.push(
            Trade({
                id: tradeId,
                offerId: offerId,
                producer: offer.producer,
                consumer: msg.sender,
                quantityKwh: quantityKwh,
                unitPriceWei: offer.pricePerKwhWei,
                totalPriceWei: totalPriceWei,
                timestamp: block.timestamp
            })
        );

        if (address(certificateContract) != address(0)) {
            certificateContract.mint(
                msg.sender,
                IEnergyCertificate.CertificateData({
                    buyer: msg.sender,
                    producer: offer.producer,
                    kwhAmount: quantityKwh,
                    priceWei: totalPriceWei,
                    tradeId: tradeId,
                    issuedAt: block.timestamp
                })
            );
        }

        emit EnergySold(offerId, tradeId, msg.sender, offer.producer, quantityKwh, totalPriceWei);

        if (address(reputationSystem) != address(0)) {
            reputationSystem.recordTrade(tradeId, msg.sender, offer.producer);
        }
    }

    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        if (offer.id == 0) {
            revert OfferNotFound();
        }
        if (!offer.isActive) {
            revert OfferNotActive();
        }
        if (offer.producer != msg.sender) {
            revert UnauthorizedOfferOwner();
        }

        uint256 remainingKwh = offer.remainingKwh;
        offer.remainingKwh = 0;
        offer.isActive = false;
        offer.updatedAt = block.timestamp;

        bool success = energyToken.transfer(offer.producer, remainingKwh);
        if (!success) {
            revert TokenTransferFailed();
        }

        emit OfferCancelled(offerId, offer.producer, remainingKwh);
    }

    function getOffer(uint256 offerId) external view returns (Offer memory) {
        Offer memory offer = offers[offerId];
        if (offer.id == 0) {
            revert OfferNotFound();
        }
        return offer;
    }

    function getAllOffers() external view returns (Offer[] memory) {
        uint256 count = offerIds.length;
        Offer[] memory result = new Offer[](count);

        for (uint256 i = 0; i < count; i++) {
            result[i] = offers[offerIds[i]];
        }

        return result;
    }

    function getActiveOffers() external view returns (Offer[] memory) {
        uint256 total = offerIds.length;
        uint256 activeCount = 0;

        for (uint256 i = 0; i < total; i++) {
            if (offers[offerIds[i]].isActive) {
                activeCount++;
            }
        }

        Offer[] memory activeOffers = new Offer[](activeCount);
        uint256 cursor = 0;

        for (uint256 i = 0; i < total; i++) {
            Offer memory offer = offers[offerIds[i]];
            if (offer.isActive) {
                activeOffers[cursor] = offer;
                cursor++;
            }
        }

        return activeOffers;
    }

    function getTradeHistory() external view returns (Trade[] memory) {
        return tradeHistory;
    }

    function getTradesByAddress(address user) external view returns (Trade[] memory) {
        uint256 total = tradeHistory.length;
        uint256 matchingCount = 0;

        for (uint256 i = 0; i < total; i++) {
            Trade memory trade = tradeHistory[i];
            if (trade.producer == user || trade.consumer == user) {
                matchingCount++;
            }
        }

        Trade[] memory userTrades = new Trade[](matchingCount);
        uint256 cursor = 0;

        for (uint256 i = 0; i < total; i++) {
            Trade memory trade = tradeHistory[i];
            if (trade.producer == user || trade.consumer == user) {
                userTrades[cursor] = trade;
                cursor++;
            }
        }

        return userTrades;
    }

    function getOfferCount() external view returns (uint256) {
        return offerIds.length;
    }

    function getTradeCount() external view returns (uint256) {
        return tradeHistory.length;
    }
}
