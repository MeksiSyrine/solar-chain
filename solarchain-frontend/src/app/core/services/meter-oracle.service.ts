import { Injectable } from "@angular/core";
import { Contract, InterfaceAbi } from "ethers";
import { environment } from "../../../environments/environment";
import meterOracleArtifact from "../../../assets/contracts/MeterOracle.json";
import { Producer } from "../models/producer.model";
import { Web3Service } from "./web3.service";
import { UiStateService } from "./ui-state.service";

@Injectable({ providedIn: "root" })
export class MeterOracleService {
	constructor(
		private readonly web3Service: Web3Service,
		private readonly uiState: UiStateService
	) {}

	private get readContract(): Contract {
		const runner = this.web3Service.signer ?? this.web3Service.provider;
		if (!runner) {
			throw new Error("Wallet non connecte");
		}

		return new Contract(
			environment.contracts.meterOracle,
			(meterOracleArtifact as { abi: InterfaceAbi }).abi,
			runner
		);
	}

	private get contract(): Contract {
		if (!this.web3Service.signer) {
			throw new Error("Wallet non connecte");
		}

		return new Contract(
			environment.contracts.meterOracle,
			(meterOracleArtifact as { abi: InterfaceAbi }).abi,
			this.web3Service.signer
		);
	}

	async registerProducer(address: string, maxCapacityKwh: bigint): Promise<void> {
		this.uiState.beginTx();
		try {
			const tx = await this.contract.registerProducer(address, maxCapacityKwh);
			await tx.wait();
			await this.web3Service.refreshBalance();
		} finally {
			this.uiState.endTx();
		}
	}

	async submitReading(address: string, kwhProduced: bigint): Promise<void> {
		this.uiState.beginTx();
		try {
			const tx = await this.contract.submitReading(address, kwhProduced);
			await tx.wait();
			await this.web3Service.refreshBalance();
		} finally {
			this.uiState.endTx();
		}
	}

	async isProducerRegistered(address: string): Promise<boolean> {
		return (await this.readContract.isProducerRegistered(address)) as boolean;
	}

	async getProducer(address: string): Promise<Producer> {
		const raw = (await this.readContract.getProducer(address)) as {
			isRegistered: boolean;
			maxCapacityKwh: bigint;
			totalMintedKwh: bigint;
			readingCount: bigint;
		};

		return {
			address,
			isRegistered: raw.isRegistered,
			maxCapacityKwh: raw.maxCapacityKwh.toString(),
			totalMintedKwh: raw.totalMintedKwh.toString(),
			readingCount: raw.readingCount.toString()
		};
	}

	async getAllProducers(): Promise<Producer[]> {
		const addresses = (await this.readContract.getAllProducers()) as string[];
		const producers = await Promise.all(addresses.map((address) => this.getProducer(address)));
		return producers;
	}
}
