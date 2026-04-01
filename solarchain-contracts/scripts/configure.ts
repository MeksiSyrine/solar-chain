import { ethers, network } from "hardhat";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EnergyToken__factory } from "../typechain-types";

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
  const [admin] = await ethers.getSigners();
  const deployment = await loadDeployment();

  const token = EnergyToken__factory.connect(deployment.contracts.energyToken, admin);
  const oracleAddress = deployment.contracts.meterOracle;

  const currentOracle = await token.meterOracle();
  if (currentOracle.toLowerCase() !== oracleAddress.toLowerCase()) {
    console.log(`Updating meter oracle: ${currentOracle} -> ${oracleAddress}`);
    await (await token.connect(admin).setMeterOracle(oracleAddress)).wait();
    console.log("Meter oracle configured.");
  } else {
    console.log("Meter oracle already configured.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
