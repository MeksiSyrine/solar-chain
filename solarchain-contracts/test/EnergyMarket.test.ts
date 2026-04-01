import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployWithProducerAndEnergyFixture } from "./helpers/fixtures";

describe("EnergyMarket", function () {
  it("should revert on zero token address", async function () {
    const EnergyMarket = await ethers.getContractFactory("EnergyMarket");

    await expect(EnergyMarket.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      EnergyMarket,
      "InvalidTokenAddress"
    );
  });

  it("should create offer and lock producer tokens", async function () {
    const { market, token, producer } = await loadFixture(deployWithProducerAndEnergyFixture);

    await token.connect(producer).approve(await market.getAddress(), 200);

    await expect(market.connect(producer).createOffer(200, ethers.parseEther("0.001")))
      .to.emit(market, "OfferCreated")
      .withArgs(1, producer.address, 200, ethers.parseEther("0.001"));

    const offer = await market.getOffer(1);
    expect(offer.producer).to.equal(producer.address);
    expect(offer.remainingKwh).to.equal(200);

    expect(await token.balanceOf(producer.address)).to.equal(300);
    expect(await token.balanceOf(await market.getAddress())).to.equal(200);
  });

  it("should reject invalid offer inputs", async function () {
    const { market, token, producer } = await loadFixture(deployWithProducerAndEnergyFixture);

    await token.connect(producer).approve(await market.getAddress(), 100);

    await expect(market.connect(producer).createOffer(0, 1)).to.be.revertedWithCustomError(market, "InvalidAmount");
    await expect(market.connect(producer).createOffer(100, 0)).to.be.revertedWithCustomError(market, "InvalidPrice");
  });

  it("should buy energy atomically and append trade history", async function () {
    const { market, token, producer, consumer } = await loadFixture(deployWithProducerAndEnergyFixture);

    const unitPrice = ethers.parseEther("0.001");
    await token.connect(producer).approve(await market.getAddress(), 100);
    await market.connect(producer).createOffer(100, unitPrice);

    const buyQty = 40n;
    const totalPrice = buyQty * unitPrice;
    const producerBalanceBefore = await ethers.provider.getBalance(producer.address);

    await expect(market.connect(consumer).buyEnergy(1, buyQty, { value: totalPrice }))
      .to.emit(market, "EnergySold")
      .withArgs(1, 1, consumer.address, producer.address, buyQty, totalPrice);

    const offer = await market.getOffer(1);
    expect(offer.remainingKwh).to.equal(60);
    expect(offer.isActive).to.equal(true);

    expect(await token.balanceOf(consumer.address)).to.equal(40);

    const producerBalanceAfter = await ethers.provider.getBalance(producer.address);
    expect(producerBalanceAfter - producerBalanceBefore).to.equal(totalPrice);

    const history = await market.getTradeHistory();
    expect(history.length).to.equal(1);
    expect(history[0].offerId).to.equal(1);
    expect(history[0].quantityKwh).to.equal(40);
  });

  it("should revert buy when ETH amount is wrong", async function () {
    const { market, token, producer, consumer } = await loadFixture(deployWithProducerAndEnergyFixture);

    const unitPrice = ethers.parseEther("0.001");
    await token.connect(producer).approve(await market.getAddress(), 100);
    await market.connect(producer).createOffer(100, unitPrice);

    await expect(market.connect(consumer).buyEnergy(1, 10, { value: unitPrice })).to.be.revertedWithCustomError(
      market,
      "IncorrectEthAmount"
    );
  });

  it("should cancel offer and return remaining tokens", async function () {
    const { market, token, producer, consumer } = await loadFixture(deployWithProducerAndEnergyFixture);

    const unitPrice = ethers.parseEther("0.001");
    await token.connect(producer).approve(await market.getAddress(), 100);
    await market.connect(producer).createOffer(100, unitPrice);
    await market.connect(consumer).buyEnergy(1, 20, { value: unitPrice * 20n });

    const producerTokenBefore = await token.balanceOf(producer.address);

    await expect(market.connect(producer).cancelOffer(1))
      .to.emit(market, "OfferCancelled")
      .withArgs(1, producer.address, 80);

    const producerTokenAfter = await token.balanceOf(producer.address);
    expect(producerTokenAfter - producerTokenBefore).to.equal(80);

    const offer = await market.getOffer(1);
    expect(offer.isActive).to.equal(false);
    expect(offer.remainingKwh).to.equal(0);
  });

  it("should reject cancel by non-owner of offer", async function () {
    const { market, token, producer, consumer } = await loadFixture(deployWithProducerAndEnergyFixture);

    await token.connect(producer).approve(await market.getAddress(), 100);
    await market.connect(producer).createOffer(100, ethers.parseEther("0.001"));

    await expect(market.connect(consumer).cancelOffer(1)).to.be.revertedWithCustomError(
      market,
      "UnauthorizedOfferOwner"
    );
  });

  it("should expose active offers and user trades", async function () {
    const { market, token, producer, consumer } = await loadFixture(deployWithProducerAndEnergyFixture);

    const unitPrice = ethers.parseEther("0.001");
    await token.connect(producer).approve(await market.getAddress(), 150);

    await market.connect(producer).createOffer(100, unitPrice);
    await market.connect(producer).createOffer(50, unitPrice);

    await market.connect(consumer).buyEnergy(1, 100, { value: unitPrice * 100n });

    const active = await market.getActiveOffers();
    expect(active.length).to.equal(1);
    expect(active[0].id).to.equal(2);

    const consumerTrades = await market.getTradesByAddress(consumer.address);
    expect(consumerTrades.length).to.equal(1);
    expect(consumerTrades[0].consumer).to.equal(consumer.address);
  });
});
