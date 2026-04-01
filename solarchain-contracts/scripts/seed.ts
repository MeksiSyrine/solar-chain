import { ethers, network } from "hardhat";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EnergyMarket__factory, EnergyToken__factory, MeterOracle__factory } from "../typechain-types";

type DeploymentFile = {
  contracts: {
    energyToken: string;
    meterOracle: string;
    energyMarket: string;
  };
};

async function loadDeployment(): Promise<DeploymentFile> {
  const filePath = path.join(process.cwd(), "deployments", `${network.name}.json`);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as DeploymentFile;
}

async function main() {
  const [admin, producerA, producerB, consumerA] = await ethers.getSigners();
  const deployment = await loadDeployment();

  const token = EnergyToken__factory.connect(deployment.contracts.energyToken, admin);
  const oracle = MeterOracle__factory.connect(deployment.contracts.meterOracle, admin);
  const market = EnergyMarket__factory.connect(deployment.contracts.energyMarket, admin);

  console.log("Seeding producer registry...");
  await (await oracle.connect(admin).registerProducer(producerA.address, 1200)).wait();
  await (await oracle.connect(admin).registerProducer(producerB.address, 900)).wait();

  console.log("Submitting meter readings...");
  await (await oracle.connect(admin).submitReading(producerA.address, 600)).wait();
  await (await oracle.connect(admin).submitReading(producerB.address, 450)).wait();

  console.log("Creating initial market offers...");
  const marketAddress = await market.getAddress();
  await (await token.connect(producerA).approve(marketAddress, 300)).wait();
  await (await market.connect(producerA).createOffer(300, ethers.parseEther("0.0015"))).wait();

  await (await token.connect(producerB).approve(marketAddress, 200)).wait();
  await (await market.connect(producerB).createOffer(200, ethers.parseEther("0.0012"))).wait();

  console.log("Creating one sample consumer purchase...");
  await (
    await market.connect(consumerA).buyEnergy(1, 50, {
      value: ethers.parseEther("0.075")
    })
  ).wait();

  console.log("Seed completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
