import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function deployCertificateFixture() {
  const [owner, minter, buyer, producer, other] = await ethers.getSigners();

  const certificate = await ethers.deployContract("EnergyCertificate");

  return { owner, minter, buyer, producer, other, certificate };
}

describe("EnergyCertificate", function () {
  it("should deploy with expected name and symbol", async function () {
    const { certificate } = await loadFixture(deployCertificateFixture);

    expect(await certificate.name()).to.equal("SolarChain Energy Certificate");
    expect(await certificate.symbol()).to.equal("SCEC");
  });

  it("should allow only owner to set authorized minter", async function () {
    const { certificate, owner, minter, other } = await loadFixture(deployCertificateFixture);

    await certificate.connect(owner).setAuthorizedMinter(minter.address);
    expect(await certificate.authorizedMinter()).to.equal(minter.address);

    await expect(certificate.connect(other).setAuthorizedMinter(other.address)).to.be.revertedWithCustomError(
      certificate,
      "OwnableUnauthorizedAccount"
    );
  });

  it("should allow only authorized minter to mint", async function () {
    const { certificate, minter, buyer, producer, other } = await loadFixture(deployCertificateFixture);

    await certificate.setAuthorizedMinter(minter.address);

    await expect(
      certificate.connect(other).mint(buyer.address, {
        buyer: buyer.address,
        producer: producer.address,
        kwhAmount: 50,
        priceWei: ethers.parseEther("0.1"),
        tradeId: 1,
        issuedAt: 1234567890
      })
    ).to.be.revertedWithCustomError(certificate, "NotAuthorizedMinter");
  });

  it("should emit CertificateIssued on mint", async function () {
    const { certificate, minter, buyer, producer } = await loadFixture(deployCertificateFixture);

    await certificate.setAuthorizedMinter(minter.address);

    await expect(
      certificate.connect(minter).mint(buyer.address, {
        buyer: buyer.address,
        producer: producer.address,
        kwhAmount: 125,
        priceWei: ethers.parseEther("0.25"),
        tradeId: 7,
        issuedAt: 1710000000
      })
    )
      .to.emit(certificate, "CertificateIssued")
      .withArgs(1, buyer.address, 125, 7);
  });

  it("should store certificate data correctly", async function () {
    const { certificate, minter, buyer, producer } = await loadFixture(deployCertificateFixture);

    await certificate.setAuthorizedMinter(minter.address);
    await certificate.connect(minter).mint(buyer.address, {
      buyer: buyer.address,
      producer: producer.address,
      kwhAmount: 80,
      priceWei: ethers.parseEther("0.12"),
      tradeId: 22,
      issuedAt: 1711111111
    });

    const cert = await certificate.getCertificate(1);
    expect(cert.buyer).to.equal(buyer.address);
    expect(cert.producer).to.equal(producer.address);
    expect(cert.kwhAmount).to.equal(80n);
    expect(cert.priceWei).to.equal(ethers.parseEther("0.12"));
    expect(cert.tradeId).to.equal(22n);
    expect(cert.issuedAt).to.equal(1711111111n);
  });

  it("should return owner certificate token ids", async function () {
    const { certificate, minter, buyer, producer } = await loadFixture(deployCertificateFixture);

    await certificate.setAuthorizedMinter(minter.address);

    await certificate.connect(minter).mint(buyer.address, {
      buyer: buyer.address,
      producer: producer.address,
      kwhAmount: 10,
      priceWei: ethers.parseEther("0.01"),
      tradeId: 1,
      issuedAt: 1
    });

    await certificate.connect(minter).mint(buyer.address, {
      buyer: buyer.address,
      producer: producer.address,
      kwhAmount: 20,
      priceWei: ethers.parseEther("0.02"),
      tradeId: 2,
      issuedAt: 2
    });

    const ids = await certificate.getCertificatesByOwner(buyer.address);
    expect(ids.length).to.equal(2);
    expect(ids[0]).to.equal(1n);
    expect(ids[1]).to.equal(2n);
  });

  it("should reject transfer because certificate is soulbound", async function () {
    const { certificate, minter, buyer, producer, other } = await loadFixture(deployCertificateFixture);

    await certificate.setAuthorizedMinter(minter.address);
    await certificate.connect(minter).mint(buyer.address, {
      buyer: buyer.address,
      producer: producer.address,
      kwhAmount: 60,
      priceWei: ethers.parseEther("0.06"),
      tradeId: 3,
      issuedAt: 3
    });

    await expect(certificate.connect(buyer).transferFrom(buyer.address, other.address, 1)).to.be.revertedWith(
      "EnergyCertificate: non transferable"
    );
  });

  it("should return a valid base64 tokenURI json", async function () {
    const { certificate, minter, buyer, producer } = await loadFixture(deployCertificateFixture);

    await certificate.setAuthorizedMinter(minter.address);
    await certificate.connect(minter).mint(buyer.address, {
      buyer: buyer.address,
      producer: producer.address,
      kwhAmount: 95,
      priceWei: ethers.parseEther("0.095"),
      tradeId: 11,
      issuedAt: 1712222222
    });

    const uri = await certificate.tokenURI(1);
    expect(uri.startsWith("data:application/json;base64,")).to.equal(true);

    const encoded = uri.substring("data:application/json;base64,".length);
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const json = JSON.parse(decoded) as {
      name: string;
      description: string;
      attributes: Array<{ trait_type: string; value: string | number }>;
    };

    expect(json.name).to.contain("Certificat Energie Verte #1");
    expect(json.description).to.contain("95 kWh");
    expect(json.attributes.some((a) => a.trait_type === "kWh")).to.equal(true);
    expect(json.attributes.some((a) => a.trait_type === "Producteur")).to.equal(true);
    expect(json.attributes.some((a) => a.trait_type === "Prix ETH")).to.equal(true);
    expect(json.attributes.some((a) => a.trait_type === "Date")).to.equal(true);
  });

  it("should mint certificate automatically when buyEnergy is called", async function () {
    const [admin, producer, consumer] = await ethers.getSigners();

    const token = await ethers.deployContract("EnergyToken", admin);
    const oracle = await ethers.deployContract("MeterOracle", [await token.getAddress()], admin);
    const market = await ethers.deployContract("EnergyMarket", [await token.getAddress()], admin);
    const certificate = await ethers.deployContract("EnergyCertificate", admin);

    await token.connect(admin).setMeterOracle(await oracle.getAddress());

    await certificate.connect(admin).setAuthorizedMinter(await market.getAddress());
    await market.connect(admin).setCertificateContract(await certificate.getAddress());

    await oracle.connect(admin).registerProducer(producer.address, 1000n);
    await oracle.connect(admin).submitReading(producer.address, 500n);

    const unitPrice = ethers.parseEther("0.001");
    await token.connect(producer).approve(await market.getAddress(), 300n);
    await market.connect(producer).createOffer(300n, unitPrice);

    const qty = 40n;
    const totalPrice = qty * unitPrice;

    await expect(market.connect(consumer).buyEnergy(1, qty, { value: totalPrice })).to.emit(certificate, "CertificateIssued");

    expect(await certificate.balanceOf(consumer.address)).to.equal(1n);

    const ids = await certificate.getCertificatesByOwner(consumer.address);
    expect(ids.length).to.equal(1);

    const cert = await certificate.getCertificate(ids[0]);
    expect(cert.buyer).to.equal(consumer.address);
    expect(cert.producer).to.equal(producer.address);
    expect(cert.kwhAmount).to.equal(qty);
    expect(cert.priceWei).to.equal(totalPrice);
    expect(cert.tradeId).to.equal(1n);
  });
});
