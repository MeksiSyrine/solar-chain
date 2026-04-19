import { Injectable } from "@angular/core";
import { Contract, InterfaceAbi } from "ethers";
import { environment } from "../../../environments/environment";
import energyCertificateArtifact from "../../../assets/contracts/EnergyCertificate.json";
import { Web3Service } from "./web3.service";

export interface CertificateData {
	tokenId: bigint;
	buyer: string;
	producer: string;
	kwhAmount: bigint;
	priceWei: bigint;
	tradeId: bigint;
	issuedAt: bigint;
}

type CertificateIssuedCallback = (payload: {
	tokenId: bigint;
	buyer: string;
	kwhAmount: bigint;
	tradeId: bigint;
}) => void;

@Injectable({ providedIn: "root" })
export class EnergyCertificateService {
	constructor(private readonly web3Service: Web3Service) {}

	getContract(): Contract {
		if (!environment.contracts.energyCertificate) {
			throw new Error("Adresse du contrat EnergyCertificate non configuree.");
		}

		const runner = this.web3Service.signer ?? this.web3Service.provider;
		if (!runner) {
			throw new Error("Wallet non connecte");
		}

		return new Contract(
			environment.contracts.energyCertificate,
			(energyCertificateArtifact as { abi: InterfaceAbi }).abi,
			runner
		);
	}

	async getMyCertificates(address: string): Promise<CertificateData[]> {
		const contract = this.getContract();
		const tokenIds = (await contract.getCertificatesByOwner(address)) as bigint[];

		const certificates = await Promise.all(
			tokenIds.map(async (tokenId) => {
				const raw = (await contract.getCertificate(tokenId)) as {
					buyer: string;
					producer: string;
					kwhAmount: bigint;
					priceWei: bigint;
					tradeId: bigint;
					issuedAt: bigint;
				};

				return {
					tokenId,
					buyer: raw.buyer,
					producer: raw.producer,
					kwhAmount: raw.kwhAmount,
					priceWei: raw.priceWei,
					tradeId: raw.tradeId,
					issuedAt: raw.issuedAt
				} satisfies CertificateData;
			})
		);

		return certificates;
	}

	async getTotalCertificates(address: string): Promise<number> {
		const contract = this.getContract();
		const tokenIds = (await contract.getCertificatesByOwner(address)) as bigint[];
		return tokenIds.length;
	}

	listenToCertificateIssued(callback: CertificateIssuedCallback): () => void {
		const contract = this.getContract();

		const listener = (tokenId: bigint, buyer: string, kwhAmount: bigint, tradeId: bigint) => {
			callback({ tokenId, buyer, kwhAmount, tradeId });
		};

		contract.on("CertificateIssued", listener);

		return () => {
			contract.off("CertificateIssued", listener);
		};
	}
}
