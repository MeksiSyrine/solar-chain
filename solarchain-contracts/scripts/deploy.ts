import { ethers, network } from "hardhat";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { EnergyMarket__factory, EnergyToken__factory, MeterOracle__factory } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log("Starting SolarChain deployment...");
  console.log(`Network: ${network.name} (chainId=${chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  const token = await new EnergyToken__factory(deployer).deploy();
  await token.waitForDeployment();

  const oracle = await new MeterOracle__factory(deployer).deploy(await token.getAddress());
  await oracle.waitForDeployment();

  const market = await new EnergyMarket__factory(deployer).deploy(await token.getAddress());
  await market.waitForDeployment();

  await (await token.connect(deployer).setMeterOracle(await oracle.getAddress())).wait();

  const deployment = {
    network: network.name,
    chainId: chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      energyToken: await token.getAddress(),
      meterOracle: await oracle.getAddress(),
      energyMarket: await market.getAddress()
    }
  };

  const deploymentDir = path.join(process.cwd(), "deployments");
  const deploymentFile = path.join(deploymentDir, `${network.name}.json`);
  await mkdir(deploymentDir, { recursive: true });
  await writeFile(deploymentFile, JSON.stringify(deployment, null, 2), "utf-8");

  console.log("Deployment completed.");
  console.log(`EnergyToken: ${deployment.contracts.energyToken}`);
  console.log(`MeterOracle: ${deployment.contracts.meterOracle}`);
  console.log(`EnergyMarket: ${deployment.contracts.energyMarket}`);
  console.log(`Saved deployment file: ${deploymentFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
