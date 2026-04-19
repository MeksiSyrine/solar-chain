import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { EnergyToken, EnergyToken__factory } from "../typechain-types";

describe("EnergyToken", function () {
  async function deployTokenFixture() {
    const [admin, oracleSigner, producer, other] = await ethers.getSigners();
    const token: EnergyToken = await new EnergyToken__factory(admin).deploy();

    return { admin, oracleSigner, producer, other, token };
  }

  it("should deploy with expected metadata", async function () {
    const { token } = await loadFixture(deployTokenFixture);

    expect(await token.name()).to.equal("SolarToken");
    expect(await token.symbol()).to.equal("SKWH");
    expect(await token.decimals()).to.equal(0n);
  });

  it("should let owner set meter oracle", async function () {
    const { token, oracleSigner } = await loadFixture(deployTokenFixture);

    await expect(token.setMeterOracle(oracleSigner.address))
      .to.emit(token, "MeterOracleUpdated")
      .withArgs(ethers.ZeroAddress, oracleSigner.address);

    expect(await token.meterOracle()).to.equal(oracleSigner.address);
  });

  it("should revert when non-owner sets meter oracle", async function () {
    const { token, oracleSigner, other } = await loadFixture(deployTokenFixture);

    await expect(token.connect(other).setMeterOracle(oracleSigner.address)).to.be.revertedWithCustomError(
      token,
      "OwnableUnauthorizedAccount"
    );
  });

  it("should let only oracle mint", async function () {
    const { token, oracleSigner, producer, other } = await loadFixture(deployTokenFixture);

    await token.setMeterOracle(oracleSigner.address);

    await expect(token.connect(other).mint(producer.address, 10)).to.be.revertedWithCustomError(
      token,
      "NotMeterOracle"
    );

    await token.connect(oracleSigner).mint(producer.address, 10);
    expect(await token.balanceOf(producer.address)).to.equal(10n);
  });

  it("should support transfer and burn after mint", async function () {
    const { token, oracleSigner, producer, other } = await loadFixture(deployTokenFixture);

    await token.setMeterOracle(oracleSigner.address);
    await token.connect(oracleSigner).mint(producer.address, 25);

    await token.connect(producer).transfer(other.address, 5);
    expect(await token.balanceOf(other.address)).to.equal(5n);

    await token.connect(producer).burn(10);
    expect(await token.balanceOf(producer.address)).to.equal(10n);
  });
});
