import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployCoreFixture } from "./helpers/fixtures";

describe("SolarChain Integration", function () {
  it("should run end-to-end admin -> producer -> consumer flow", async function () {
    const { admin, producer, consumer, token, oracle, market } = await loadFixture(deployCoreFixture);

    await oracle.connect(admin).registerProducer(producer.address, 800);
    await oracle.connect(admin).submitReading(producer.address, 500);

    expect(await token.balanceOf(producer.address)).to.equal(500);

    const unitPrice = ethers.parseEther("0.002");
    await token.connect(producer).approve(await market.getAddress(), 500);
    await market.connect(producer).createOffer(300, unitPrice);

    await market.connect(consumer).buyEnergy(1, 120, { value: unitPrice * 120n });

    const offer = await market.getOffer(1);
    expect(offer.remainingKwh).to.equal(180);

    expect(await token.balanceOf(consumer.address)).to.equal(120);

    const history = await market.getTradeHistory();
    expect(history.length).to.equal(1);
    expect(history[0].producer).to.equal(producer.address);
    expect(history[0].consumer).to.equal(consumer.address);
    expect(history[0].quantityKwh).to.equal(120);
  });

  it("should support multiple readings and multiple consumers", async function () {
    const { admin, producer, consumer, other, token, oracle, market } = await loadFixture(deployCoreFixture);

    await oracle.connect(admin).registerProducer(producer.address, 1000);
    await oracle.connect(admin).submitReading(producer.address, 300);
    await oracle.connect(admin).submitReading(producer.address, 200);

    expect(await token.balanceOf(producer.address)).to.equal(500);

    const unitPrice = ethers.parseEther("0.0015");
    await token.connect(producer).approve(await market.getAddress(), 500);
    await market.connect(producer).createOffer(500, unitPrice);

    await market.connect(consumer).buyEnergy(1, 100, { value: unitPrice * 100n });
    await market.connect(other).buyEnergy(1, 50, { value: unitPrice * 50n });

    expect(await token.balanceOf(consumer.address)).to.equal(100);
    expect(await token.balanceOf(other.address)).to.equal(50);

    const offer = await market.getOffer(1);
    expect(offer.remainingKwh).to.equal(350);

    const trades = await market.getTradeHistory();
    expect(trades.length).to.equal(2);
  });
});
