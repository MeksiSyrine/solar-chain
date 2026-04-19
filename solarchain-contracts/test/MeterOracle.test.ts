import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployCoreFixture } from "./helpers/fixtures";

describe("MeterOracle", function () {
  it("should revert on zero token address", async function () {
    const MeterOracle = await ethers.getContractFactory("MeterOracle");

    await expect(MeterOracle.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      MeterOracle,
      "InvalidTokenAddress"
    );
  });

  it("should let admin register producer", async function () {
    const { oracle, producer } = await loadFixture(deployCoreFixture);

    await expect(oracle.registerProducer(producer.address, 1000))
      .to.emit(oracle, "ProducerRegistered")
      .withArgs(producer.address, 1000n);

    const details = await oracle.getProducer(producer.address);
    expect(details.isRegistered).to.equal(true);
    expect(details.maxCapacityKwh).to.equal(1000n);

    const all = await oracle.getAllProducers();
    expect(all.length).to.equal(1);
    expect(all[0]).to.equal(producer.address);
  });

  it("should revert when non-admin registers producer", async function () {
    const { oracle, producer, consumer } = await loadFixture(deployCoreFixture);

    await expect(oracle.connect(consumer).registerProducer(producer.address, 1000)).to.be.revertedWithCustomError(
      oracle,
      "OwnableUnauthorizedAccount"
    );
  });

  it("should submit reading and mint SKWH", async function () {
    const { oracle, producer, token } = await loadFixture(deployCoreFixture);

    await oracle.registerProducer(producer.address, 1000);

    await expect(oracle.submitReading(producer.address, 350))
      .to.emit(oracle, "MeterReadingSubmitted")
      .withArgs(producer.address, 350n, 350n, anyValue);

    const details = await oracle.getProducer(producer.address);
    expect(details.totalMintedKwh).to.equal(350n);
    expect(details.readingCount).to.equal(1n);
    expect(await token.balanceOf(producer.address)).to.equal(350n);
  });

  it("should reject invalid readings", async function () {
    const { oracle, producer } = await loadFixture(deployCoreFixture);

    await oracle.registerProducer(producer.address, 1000);

    await expect(oracle.submitReading(producer.address, 0)).to.be.revertedWithCustomError(oracle, "InvalidReading");
    await expect(oracle.submitReading(producer.address, 1001)).to.be.revertedWithCustomError(
      oracle,
      "InvalidReading"
    );
  });

  it("should reject reading for unregistered producer", async function () {
    const { oracle, producer } = await loadFixture(deployCoreFixture);

    await expect(oracle.submitReading(producer.address, 100)).to.be.revertedWithCustomError(
      oracle,
      "ProducerNotRegistered"
    );
  });
});

const anyValue = (value: unknown) => value !== undefined;
