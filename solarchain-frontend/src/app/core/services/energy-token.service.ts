import { Injectable } from "@angular/core";
import { Contract, formatUnits, InterfaceAbi } from "ethers";
import { environment } from "../../../environments/environment";
import energyTokenArtifact from "../../../assets/contracts/EnergyToken.json";
import { Web3Service } from "./web3.service";
import { UiStateService } from "./ui-state.service";

@Injectable({ providedIn: "root" })
export class EnergyTokenService {
	constructor(
		private readonly web3Service: Web3Service,
		private readonly uiState: UiStateService
	) {}

	private get contract(): Contract {
		if (!this.web3Service.signer) {
			throw new Error("Wallet non connecte");
		}

		return new Contract(
			environment.contracts.energyToken,
			(energyTokenArtifact as { abi: InterfaceAbi }).abi,
			this.web3Service.signer
		);
	}

	async getBalance(address: string): Promise<string> {
		const contract = this.contract;
		const balance = await contract.balanceOf(address);
		return formatUnits(balance, 0);
	}

	async approve(spender: string, amount: bigint): Promise<void> {
		this.uiState.beginTx();
		try {
			const tx = await this.contract.approve(spender, amount);
			await tx.wait();
			await this.web3Service.refreshBalance();
		} finally {
			this.uiState.endTx();
		}
	}
}
