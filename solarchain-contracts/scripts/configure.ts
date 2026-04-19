import { ethers, network } from "hardhat";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EnergyCertificate__factory, EnergyMarket__factory, EnergyToken__factory, ReputationSystem__factory } from "../typechain-types";

type DeploymentFile = {
  contracts: {
    energyToken: string;
    meterOracle: string;
    energyMarket: string;
    energyCertificate: string;
    reputationSystem?: string;
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
  const market = EnergyMarket__factory.connect(deployment.contracts.energyMarket, admin);
  const certificate = EnergyCertificate__factory.connect(deployment.contracts.energyCertificate, admin);
  const reputationAddress = deployment.contracts.reputationSystem || ethers.ZeroAddress;
  const reputation = ReputationSystem__factory.connect(reputationAddress, admin);
  const oracleAddress = deployment.contracts.meterOracle;
  const marketAddress = deployment.contracts.energyMarket;
  const certificateAddress = deployment.contracts.energyCertificate;

  const currentOracle = await token.meterOracle();
  if (currentOracle.toLowerCase() !== oracleAddress.toLowerCase()) {
    console.log(`Updating meter oracle: ${currentOracle} -> ${oracleAddress}`);
    await (await token.connect(admin).setMeterOracle(oracleAddress)).wait();
    console.log("Meter oracle configured.");
  } else {
    console.log("Meter oracle already configured.");
  }

  const currentMinter = await certificate.authorizedMinter();
  if (currentMinter.toLowerCase() !== marketAddress.toLowerCase()) {
    console.log(`Updating certificate minter: ${currentMinter} -> ${marketAddress}`);
    await (await certificate.connect(admin).setAuthorizedMinter(marketAddress)).wait();
    console.log("Certificate minter configured.");
  } else {
    console.log("Certificate minter already configured.");
  }

  const currentCertificateContract = await market.certificateContract();
  if (currentCertificateContract.toLowerCase() !== certificateAddress.toLowerCase()) {
    console.log(`Updating market certificate contract: ${currentCertificateContract} -> ${certificateAddress}`);
    await (await market.connect(admin).setCertificateContract(certificateAddress)).wait();
    console.log("Market certificate contract configured.");
  } else {
    console.log("Market certificate contract already configured.");
  }

  if (reputationAddress !== ethers.ZeroAddress) {
    const currentAuthorizedMarket = await reputation.authorizedMarket();
    if (currentAuthorizedMarket.toLowerCase() !== marketAddress.toLowerCase()) {
      console.log(`Updating reputation authorized market: ${currentAuthorizedMarket} -> ${marketAddress}`);
      await (await reputation.connect(admin).setAuthorizedMarket(marketAddress)).wait();
      console.log("Reputation authorized market configured.");
    } else {
      console.log("Reputation authorized market already configured.");
    }

    const currentReputationSystem = await market.reputationSystem();
    if (currentReputationSystem.toLowerCase() !== reputationAddress.toLowerCase()) {
      console.log(`Updating market reputation system: ${currentReputationSystem} -> ${reputationAddress}`);
      await (await market.connect(admin).setReputationSystem(reputationAddress)).wait();
      console.log("Market reputation system configured.");
    } else {
      console.log("Market reputation system already configured.");
    }
  } else {
    console.log("No reputationSystem in deployment file, skipping reputation configuration.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
