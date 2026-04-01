import { ethers } from "hardhat";
import {
  EnergyMarket,
  EnergyMarket__factory,
  EnergyToken,
  EnergyToken__factory,
  MeterOracle,
  MeterOracle__factory
} from "../../typechain-types";

export async function deployCoreFixture() {
  const [admin, producer, consumer, other] = await ethers.getSigners();

  const token: EnergyToken = await new EnergyToken__factory(admin).deploy();

  const oracle: MeterOracle = await new MeterOracle__factory(admin).deploy(await token.getAddress());

  const market: EnergyMarket = await new EnergyMarket__factory(admin).deploy(await token.getAddress());

  await token.connect(admin).setMeterOracle(await oracle.getAddress());

  return { admin, producer, consumer, other, token, oracle, market };
}

export async function deployWithProducerAndEnergyFixture() {
  const fixture = await deployCoreFixture();
  const { admin, producer, oracle } = fixture;

  await oracle.connect(admin).registerProducer(producer.address, 1000n);
  await oracle.connect(admin).submitReading(producer.address, 500n);

  return fixture;
}
