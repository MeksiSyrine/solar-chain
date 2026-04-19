import { Injectable } from "@angular/core";
import { Contract, InterfaceAbi } from "ethers";
import { environment } from "../../../environments/environment";
import reputationArtifact from "../../../assets/contracts/ReputationSystem.json";
import { Web3Service } from "./web3.service";

export interface ProducerReputation {
  totalScore: bigint;
  ratingCount: bigint;
  averageScore: bigint;
}

export interface Rating {
  consumer: string;
  producer: string;
  score: number;
  tradeId: bigint;
  timestamp: bigint;
}

@Injectable({ providedIn: "root" })
export class ReputationService {
  constructor(private readonly web3Service: Web3Service) {}

  getContract(): Contract {
    if (!environment.contracts.reputationSystem) {
      throw new Error("Adresse du contrat ReputationSystem non configuree.");
    }

    const runner = this.web3Service.signer ?? this.web3Service.provider;
    if (!runner) {
      throw new Error("Wallet non connecte");
    }

    return new Contract(
      environment.contracts.reputationSystem,
      (reputationArtifact as { abi: InterfaceAbi }).abi,
      runner
    );
  }

  async getReputation(producerAddress: string): Promise<ProducerReputation> {
    const contract = this.getContract();
    const rep = (await contract.reputations(producerAddress)) as {
      totalScore: bigint;
      ratingCount: bigint;
      averageScore: bigint;
    };

    return {
      totalScore: rep.totalScore,
      ratingCount: rep.ratingCount,
      averageScore: rep.averageScore
    };
  }

  async getRatingsByProducer(producerAddress: string): Promise<Rating[]> {
    const contract = this.getContract();
    const rawRatings = (await contract.getRatingsByProducer(producerAddress)) as Array<{
      consumer: string;
      producer: string;
      score: bigint;
      tradeId: bigint;
      timestamp: bigint;
    }>;

    return rawRatings.map((item) => ({
      consumer: item.consumer,
      producer: item.producer,
      score: Number(item.score),
      tradeId: item.tradeId,
      timestamp: item.timestamp
    }));
  }

  async canRate(tradeId: bigint, consumerAddress: string): Promise<boolean> {
    const contract = this.getContract();
    return (await contract.canRate(tradeId, consumerAddress)) as boolean;
  }

  async submitRating(tradeId: bigint, score: number) {
    const contract = this.getContract();
    const tx = await contract.submitRating(tradeId, score);
    return tx.wait();
  }

  formatAverage(averageScore: bigint): string {
    if (averageScore === 0n) {
      return "Pas encore note";
    }

    const value = Number(averageScore) / 100;
    return value.toFixed(2);
  }
}
