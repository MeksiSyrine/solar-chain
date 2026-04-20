import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

async function deployProducerProfileFixture() {
  const [owner, producerA, producerB, other] = await ethers.getSigners();
  const producerProfile = await ethers.deployContract("ProducerProfile", owner);

  return { owner, producerA, producerB, other, producerProfile };
}

describe("ProducerProfile", function () {
  it("should deploy correctly", async function () {
    const { producerProfile, producerA } = await loadFixture(deployProducerProfileFixture);

    expect(await producerProfile.owner()).to.not.equal(ethers.ZeroAddress);
    expect(await producerProfile.getProfile(producerA.address)).to.equal("");
  });

  it("setProfile should store CID correctly", async function () {
    const { producerProfile, producerA } = await loadFixture(deployProducerProfileFixture);

    const cid = "bafkreigh2akiscaildcxexample111";
    await producerProfile.connect(producerA).setProfile(cid);

    expect(await producerProfile.profileCID(producerA.address)).to.equal(cid);
    expect(await producerProfile.getProfile(producerA.address)).to.equal(cid);
    expect(await producerProfile.hasProfile(producerA.address)).to.equal(true);
  });

  it("setProfile should revert if CID is empty", async function () {
    const { producerProfile, producerA } = await loadFixture(deployProducerProfileFixture);

    await expect(producerProfile.connect(producerA).setProfile("")).to.be.revertedWithCustomError(
      producerProfile,
      "EmptyCID"
    );
  });

  it("setProfile should revert if CID is too short or too long", async function () {
    const { producerProfile, producerA } = await loadFixture(deployProducerProfileFixture);

    await expect(producerProfile.connect(producerA).setProfile("too-short")).to.be.revertedWithCustomError(
      producerProfile,
      "InvalidCIDLength"
    );

    const longCid = "a".repeat(101);
    await expect(producerProfile.connect(producerA).setProfile(longCid)).to.be.revertedWithCustomError(
      producerProfile,
      "InvalidCIDLength"
    );
  });

  it("setProfile should allow update on second call", async function () {
    const { producerProfile, producerA } = await loadFixture(deployProducerProfileFixture);

    const cid1 = "bafkreigh2akiscaildcxexample222";
    const cid2 = "bafkreigh2akiscaildcxexample333";

    await producerProfile.connect(producerA).setProfile(cid1);
    await producerProfile.connect(producerA).setProfile(cid2);

    expect(await producerProfile.getProfile(producerA.address)).to.equal(cid2);

    const producers = await producerProfile.getAllProducersWithProfile();
    expect(producers.length).to.equal(1);
    expect(producers[0]).to.equal(producerA.address);
  });

  it("setProfile should emit ProfileUpdated", async function () {
    const { producerProfile, producerA } = await loadFixture(deployProducerProfileFixture);

    const cid = "bafkreigh2akiscaildcxexample444";

    await expect(producerProfile.connect(producerA).setProfile(cid))
      .to.emit(producerProfile, "ProfileUpdated")
      .withArgs(producerA.address, cid, anyValue);
  });

  it("getProfile should return correct CID", async function () {
    const { producerProfile, producerA } = await loadFixture(deployProducerProfileFixture);

    const cid = "bafkreigh2akiscaildcxexample555";
    await producerProfile.connect(producerA).setProfile(cid);

    expect(await producerProfile.getProfile(producerA.address)).to.equal(cid);
  });

  it("getProfile should return empty string if no profile", async function () {
    const { producerProfile, producerA } = await loadFixture(deployProducerProfileFixture);

    expect(await producerProfile.getProfile(producerA.address)).to.equal("");
  });

  it("hasProfile should return true/false correctly", async function () {
    const { producerProfile, producerA, producerB } = await loadFixture(deployProducerProfileFixture);

    expect(await producerProfile.hasProfile(producerA.address)).to.equal(false);

    await producerProfile.connect(producerA).setProfile("bafkreigh2akiscaildcxexample666");

    expect(await producerProfile.hasProfile(producerA.address)).to.equal(true);
    expect(await producerProfile.hasProfile(producerB.address)).to.equal(false);
  });

  it("getAllProducersWithProfile should return correct list", async function () {
    const { producerProfile, producerA, producerB } = await loadFixture(deployProducerProfileFixture);

    await producerProfile.connect(producerA).setProfile("bafkreigh2akiscaildcxexample777");
    await producerProfile.connect(producerB).setProfile("bafkreigh2akiscaildcxexample888");

    const producers = await producerProfile.getAllProducersWithProfile();

    expect(producers.length).to.equal(2);
    expect(producers[0]).to.equal(producerA.address);
    expect(producers[1]).to.equal(producerB.address);
  });

  it("removeProfile should clear CID", async function () {
    const { producerProfile, producerA } = await loadFixture(deployProducerProfileFixture);

    await producerProfile.connect(producerA).setProfile("bafkreigh2akiscaildcxexample999");
    await producerProfile.connect(producerA).removeProfile();

    expect(await producerProfile.getProfile(producerA.address)).to.equal("");
    expect(await producerProfile.hasProfile(producerA.address)).to.equal(false);
  });

  it("removeProfile should emit ProfileRemoved", async function () {
    const { producerProfile, producerA } = await loadFixture(deployProducerProfileFixture);

    await producerProfile.connect(producerA).setProfile("bafkreigh2akiscaildcxexample000");

    await expect(producerProfile.connect(producerA).removeProfile())
      .to.emit(producerProfile, "ProfileRemoved")
      .withArgs(producerA.address);
  });
});
