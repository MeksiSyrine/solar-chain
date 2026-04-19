import { ethers, network } from "hardhat";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type DeploymentFile = {
  deployer?: string;
  chainId: string;
  contracts: {
    energyToken: string;
    meterOracle: string;
    energyMarket: string;
    energyCertificate?: string;
    reputationSystem?: string;
  };
};

type ContractExport = {
  name: string;
  artifactPath: string;
  frontendFile: string;
};

async function loadDeployment(): Promise<DeploymentFile> {
  const filePath = path.join(process.cwd(), "deployments", `${network.name}.json`);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as DeploymentFile;
}

async function writeEnvironmentFile(
  filePath: string,
  content: {
    production: boolean;
    chainId: number;
    adminAddress: string;
    contracts: {
      energyToken: string;
      energyMarket: string;
      meterOracle: string;
      energyCertificate: string;
      reputationSystem: string;
    };
  }
) {
  const fileData = `export const environment = ${JSON.stringify(content, null, 2)};\n`;
  await writeFile(filePath, fileData, "utf-8");
}

async function main() {
  const deployment = await loadDeployment();
  const rootPath = path.resolve(process.cwd(), "..");
  const frontendContractsPath = path.join(rootPath, "solarchain-frontend", "src", "assets", "contracts");
  const envPath = path.join(rootPath, "solarchain-frontend", "src", "environments");

  await mkdir(frontendContractsPath, { recursive: true });

  const contractsToExport: ContractExport[] = [
    {
      name: "EnergyToken",
      artifactPath: path.join(process.cwd(), "artifacts", "contracts", "EnergyToken.sol", "EnergyToken.json"),
      frontendFile: path.join(frontendContractsPath, "EnergyToken.json")
    },
    {
      name: "EnergyMarket",
      artifactPath: path.join(process.cwd(), "artifacts", "contracts", "EnergyMarket.sol", "EnergyMarket.json"),
      frontendFile: path.join(frontendContractsPath, "EnergyMarket.json")
    },
    {
      name: "MeterOracle",
      artifactPath: path.join(process.cwd(), "artifacts", "contracts", "MeterOracle.sol", "MeterOracle.json"),
      frontendFile: path.join(frontendContractsPath, "MeterOracle.json")
    },
    {
      name: "EnergyCertificate",
      artifactPath: path.join(
        process.cwd(),
        "artifacts",
        "contracts",
        "EnergyCertificate.sol",
        "EnergyCertificate.json"
      ),
      frontendFile: path.join(frontendContractsPath, "EnergyCertificate.json")
    },
    {
      name: "ReputationSystem",
      artifactPath: path.join(
        process.cwd(),
        "artifacts",
        "contracts",
        "ReputationSystem.sol",
        "ReputationSystem.json"
      ),
      frontendFile: path.join(frontendContractsPath, "ReputationSystem.json")
    }
  ];

  for (const item of contractsToExport) {
    const artifactRaw = await readFile(item.artifactPath, "utf-8");
    const artifact = JSON.parse(artifactRaw) as { abi: unknown[] };
    await writeFile(item.frontendFile, JSON.stringify({ abi: artifact.abi }, null, 2), "utf-8");
    console.log(`Exported ABI: ${item.name} -> ${item.frontendFile}`);
  }

  const chainId = Number(deployment.chainId || (await ethers.provider.getNetwork()).chainId.toString());

  await writeEnvironmentFile(path.join(envPath, "environment.ts"), {
    production: false,
    chainId,
    adminAddress: deployment.deployer || "",
    contracts: {
      energyToken: deployment.contracts.energyToken,
      energyMarket: deployment.contracts.energyMarket,
      meterOracle: deployment.contracts.meterOracle,
      energyCertificate: deployment.contracts.energyCertificate || "",
      reputationSystem: deployment.contracts.reputationSystem || ""
    }
  });

  await writeEnvironmentFile(path.join(envPath, "environment.prod.ts"), {
    production: true,
    chainId,
    adminAddress: "",
    contracts: {
      energyToken: deployment.contracts.energyToken,
      energyMarket: deployment.contracts.energyMarket,
      meterOracle: deployment.contracts.meterOracle,
      energyCertificate: deployment.contracts.energyCertificate || "",
      reputationSystem: deployment.contracts.reputationSystem || ""
    }
  });

  console.log("Environment files updated for frontend.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
