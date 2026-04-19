import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function deployReputationFixture() {
  const [owner, market, producer, consumer, other] = await ethers.getSigners();
  const reputation = await ethers.deployContract("ReputationSystem", owner);

  return { owner, market, producer, consumer, other, reputation };
}

async function deployMarketWithReputationFixture() {
  const [admin, producer, consumer, other] = await ethers.getSigners();

  const token = await ethers.deployContract("EnergyToken", admin);
  const oracle = await ethers.deployContract("MeterOracle", [await token.getAddress()], admin);
  const market = await ethers.deployContract("EnergyMarket", [await token.getAddress()], admin);
  const reputation = await ethers.deployContract("ReputationSystem", admin);

  await token.connect(admin).setMeterOracle(await oracle.getAddress());
  await reputation.connect(admin).setAuthorizedMarket(await market.getAddress());
  await market.connect(admin).setReputationSystem(await reputation.getAddress());

  await oracle.connect(admin).registerProducer(producer.address, 1000n);
  await oracle.connect(admin).submitReading(producer.address, 500n);

  return { admin, producer, consumer, other, token, market, reputation };
}

describe("ReputationSystem", function () {
  it("should deploy correctly", async function () {
    const { reputation } = await loadFixture(deployReputationFixture);

    expect(await reputation.ratingCounter()).to.equal(0n);
    expect(await reputation.authorizedMarket()).to.equal(ethers.ZeroAddress);
  });

  it("setAuthorizedMarket should be owner-only", async function () {
    const { reputation, owner, market, other } = await loadFixture(deployReputationFixture);

    await reputation.connect(owner).setAuthorizedMarket(market.address);
    expect(await reputation.authorizedMarket()).to.equal(market.address);

    await expect(reputation.connect(other).setAuthorizedMarket(other.address)).to.be.revertedWithCustomError(
      reputation,
      "OwnableUnauthorizedAccount"
    );
  });

  it("recordTrade should be callable only by authorized market", async function () {
    const { reputation, owner, market, consumer, producer, other } = await loadFixture(deployReputationFixture);

    await reputation.connect(owner).setAuthorizedMarket(market.address);

    await expect(
      reputation.connect(other).recordTrade(1n, consumer.address, producer.address)
    ).to.be.revertedWithCustomError(reputation, "UnauthorizedMarket");

    await expect(reputation.connect(market).recordTrade(1n, consumer.address, producer.address))
      .to.emit(reputation, "TradeRecorded")
      .withArgs(1n, consumer.address, producer.address);
  });

  it("submitRating should accept valid score in range 1-5", async function () {
    const { reputation, owner, market, consumer, producer } = await loadFixture(deployReputationFixture);

    await reputation.connect(owner).setAuthorizedMarket(market.address);
    await reputation.connect(market).recordTrade(1n, consumer.address, producer.address);

    await expect(reputation.connect(consumer).submitRating(1n, 5))
      .to.emit(reputation, "RatingSubmitted")
      .withArgs(1n, consumer.address, producer.address, 5n, 1n);
  });

  it("submitRating should revert when score is 0 or > 5", async function () {
    const { reputation, owner, market, consumer, producer } = await loadFixture(deployReputationFixture);

    await reputation.connect(owner).setAuthorizedMarket(market.address);
    await reputation.connect(market).recordTrade(1n, consumer.address, producer.address);

    await expect(reputation.connect(consumer).submitRating(1n, 0)).to.be.revertedWithCustomError(
      reputation,
      "InvalidScore"
    );

    await expect(reputation.connect(consumer).submitRating(1n, 6)).to.be.revertedWithCustomError(
      reputation,
      "InvalidScore"
    );
  });

  it("submitRating should revert if trade is not recorded", async function () {
    const { reputation, consumer } = await loadFixture(deployReputationFixture);

    await expect(reputation.connect(consumer).submitRating(42n, 4)).to.be.revertedWithCustomError(
      reputation,
      "TradeNotRecorded"
    );
  });

  it("submitRating should revert on double rating for same trade", async function () {
    const { reputation, owner, market, consumer, producer } = await loadFixture(deployReputationFixture);

    await reputation.connect(owner).setAuthorizedMarket(market.address);
    await reputation.connect(market).recordTrade(1n, consumer.address, producer.address);

    await reputation.connect(consumer).submitRating(1n, 4);

    await expect(reputation.connect(consumer).submitRating(1n, 5)).to.be.revertedWithCustomError(
      reputation,
      "TradeAlreadyRated"
    );
  });

  it("submitRating should revert if caller is not trade consumer", async function () {
    const { reputation, owner, market, consumer, producer, other } = await loadFixture(deployReputationFixture);

    await reputation.connect(owner).setAuthorizedMarket(market.address);
    await reputation.connect(market).recordTrade(1n, consumer.address, producer.address);

    await expect(reputation.connect(other).submitRating(1n, 3)).to.be.revertedWithCustomError(
      reputation,
      "NotTradeConsumer"
    );
  });

  it("submitRating should update averageScore correctly", async function () {
    const { reputation, owner, market, producer, consumer, other } = await loadFixture(deployReputationFixture);

    await reputation.connect(owner).setAuthorizedMarket(market.address);
    await reputation.connect(market).recordTrade(1n, consumer.address, producer.address);
    await reputation.connect(market).recordTrade(2n, other.address, producer.address);

    await reputation.connect(consumer).submitRating(1n, 5);
    await reputation.connect(other).submitRating(2n, 4);

    const rep = await reputation.reputations(producer.address);
    expect(rep.totalScore).to.equal(9n);
    expect(rep.ratingCount).to.equal(2n);
    expect(rep.averageScore).to.equal(450n);
  });

  it("getReputation should return expected values", async function () {
    const { reputation, owner, market, producer, consumer } = await loadFixture(deployReputationFixture);

    await reputation.connect(owner).setAuthorizedMarket(market.address);
    await reputation.connect(market).recordTrade(1n, consumer.address, producer.address);
    await reputation.connect(consumer).submitRating(1n, 5);

    const rep = await reputation.getReputation(producer.address);
    expect(rep.totalScore).to.equal(5n);
    expect(rep.ratingCount).to.equal(1n);
    expect(rep.averageScore).to.equal(500n);
  });

  it("canRate should return true/false correctly", async function () {
    const { reputation, owner, market, producer, consumer, other } = await loadFixture(deployReputationFixture);

    await reputation.connect(owner).setAuthorizedMarket(market.address);
    await reputation.connect(market).recordTrade(1n, consumer.address, producer.address);

    expect(await reputation.canRate(1n, consumer.address)).to.equal(true);
    expect(await reputation.canRate(1n, other.address)).to.equal(false);

    await reputation.connect(consumer).submitRating(1n, 4);

    expect(await reputation.canRate(1n, consumer.address)).to.equal(false);
  });

  it("integration: buyEnergy should auto-record trade in reputation", async function () {
    const { producer, consumer, token, market, reputation } = await loadFixture(deployMarketWithReputationFixture);

    const unitPrice = ethers.parseEther("0.001");
    await token.connect(producer).approve(await market.getAddress(), 300n);
    await market.connect(producer).createOffer(300n, unitPrice);

    await market.connect(consumer).buyEnergy(1n, 40n, { value: 40n * unitPrice });

    expect(await reputation.tradeConsumer(1n)).to.equal(consumer.address);
    expect(await reputation.tradeProducer(1n)).to.equal(producer.address);
    expect(await reputation.canRate(1n, consumer.address)).to.equal(true);
  });

  it("integration: consumer can rate after successful purchase", async function () {
    const { producer, consumer, token, market, reputation } = await loadFixture(deployMarketWithReputationFixture);

    const unitPrice = ethers.parseEther("0.001");
    await token.connect(producer).approve(await market.getAddress(), 300n);
    await market.connect(producer).createOffer(300n, unitPrice);

    await market.connect(consumer).buyEnergy(1n, 20n, { value: 20n * unitPrice });
    await reputation.connect(consumer).submitRating(1n, 5);

    const rep = await reputation.getReputation(producer.address);
    expect(rep.averageScore).to.equal(500n);
  });

  it("integration: average should update after multiple ratings", async function () {
    const { producer, consumer, other, token, market, reputation } = await loadFixture(deployMarketWithReputationFixture);

    const unitPrice = ethers.parseEther("0.001");
    await token.connect(producer).approve(await market.getAddress(), 500n);
    await market.connect(producer).createOffer(500n, unitPrice);

    await market.connect(consumer).buyEnergy(1n, 30n, { value: 30n * unitPrice });
    await market.connect(other).buyEnergy(1n, 40n, { value: 40n * unitPrice });

    await reputation.connect(consumer).submitRating(1n, 5);
    await reputation.connect(other).submitRating(2n, 3);

    const rep = await reputation.getReputation(producer.address);
    expect(rep.totalScore).to.equal(8n);
    expect(rep.ratingCount).to.equal(2n);
    expect(rep.averageScore).to.equal(400n);
  });
});
