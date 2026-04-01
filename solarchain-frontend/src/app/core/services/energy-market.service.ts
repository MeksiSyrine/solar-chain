import { Injectable } from "@angular/core";
import { Contract, InterfaceAbi } from "ethers";
import { environment } from "../../../environments/environment";
import energyMarketArtifact from "../../../assets/contracts/EnergyMarket.json";
import { Offer } from "../models/offer.model";
import { MarketTransaction } from "../models/transaction.model";
import { Web3Service } from "./web3.service";
import { UiStateService } from "./ui-state.service";

@Injectable({ providedIn: "root" })
export class EnergyMarketService {
	constructor(
		private readonly web3Service: Web3Service,
		private readonly uiState: UiStateService
	) {}

	getAddress(): string {
		return environment.contracts.energyMarket;
	}

	private get contract(): Contract {
		if (!this.web3Service.signer) {
			throw new Error("Wallet non connecte");
		}

		return new Contract(
			environment.contracts.energyMarket,
			(energyMarketArtifact as { abi: InterfaceAbi }).abi,
			this.web3Service.signer
		);
	}

	async createOffer(quantityKwh: bigint, pricePerKwhWei: bigint): Promise<void> {
		this.uiState.beginTx();
		try {
			const tx = await this.contract.createOffer(quantityKwh, pricePerKwhWei);
			await tx.wait();
			await this.web3Service.refreshBalance();
		} finally {
			this.uiState.endTx();
		}
	}

	async buyEnergy(offerId: bigint, quantityKwh: bigint, totalPriceWei: bigint): Promise<void> {
		this.uiState.beginTx();
		try {
			const tx = await this.contract.buyEnergy(offerId, quantityKwh, { value: totalPriceWei });
			await tx.wait();
			await this.web3Service.refreshBalance();
		} finally {
			this.uiState.endTx();
		}
	}

	async cancelOffer(offerId: bigint): Promise<void> {
		this.uiState.beginTx();
		try {
			const tx = await this.contract.cancelOffer(offerId);
			await tx.wait();
			await this.web3Service.refreshBalance();
		} finally {
			this.uiState.endTx();
		}
	}

	async getAllOffers(): Promise<Offer[]> {
		const rawOffers = (await this.contract.getAllOffers()) as Array<Record<string, bigint | string | boolean>>;
		return rawOffers.map((offer) => ({
			id: Number(offer.id),
			producer: String(offer.producer),
			quantityKwh: String(offer.quantityKwh),
			pricePerKwhWei: String(offer.pricePerKwhWei),
			remainingKwh: String(offer.remainingKwh),
			isActive: Boolean(offer.isActive),
			createdAt: Number(offer.createdAt),
			updatedAt: Number(offer.updatedAt)
		}));
	}

	async getActiveOffers(): Promise<Offer[]> {
		const rawOffers = (await this.contract.getActiveOffers()) as Array<Record<string, bigint | string | boolean>>;
		return rawOffers.map((offer) => ({
			id: Number(offer.id),
			producer: String(offer.producer),
			quantityKwh: String(offer.quantityKwh),
			pricePerKwhWei: String(offer.pricePerKwhWei),
			remainingKwh: String(offer.remainingKwh),
			isActive: Boolean(offer.isActive),
			createdAt: Number(offer.createdAt),
			updatedAt: Number(offer.updatedAt)
		}));
	}

	async getTradeHistory(): Promise<MarketTransaction[]> {
		const trades = (await this.contract.getTradeHistory()) as Array<Record<string, bigint | string>>;
		return trades.map((trade) => ({
			id: Number(trade.id),
			offerId: Number(trade.offerId),
			producer: String(trade.producer),
			consumer: String(trade.consumer),
			quantityKwh: String(trade.quantityKwh),
			unitPriceWei: String(trade.unitPriceWei),
			totalPriceWei: String(trade.totalPriceWei),
			timestamp: Number(trade.timestamp)
		}));
	}
}
