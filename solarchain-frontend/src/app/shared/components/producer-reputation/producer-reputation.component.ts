import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from "@angular/core";
import { NgIf } from "@angular/common";
import { ReputationService, ProducerReputation } from "../../../core/services/reputation.service";
import { Web3Service } from "../../../core/services/web3.service";
import { StarRatingComponent } from "../star-rating/star-rating.component";

@Component({
  selector: "app-producer-reputation",
  standalone: true,
  imports: [NgIf, StarRatingComponent],
  templateUrl: "./producer-reputation.component.html"
})
export class ProducerReputationComponent implements OnInit, OnChanges, OnDestroy {
  @Input() producerAddress = "";

  private readonly reputationService = inject(ReputationService);
  private readonly web3Service = inject(Web3Service);

  loading = false;
  reputation: ProducerReputation = {
    totalScore: 0n,
    ratingCount: 0n,
    averageScore: 0n
  };

  private stopRatingListener: (() => void) | null = null;

  get hasRatings(): boolean {
    return this.reputation.ratingCount > 0n;
  }

  get averageLabel(): string {
    const formatted = this.reputationService.formatAverage(this.reputation.averageScore);
    if (formatted === "Pas encore note") {
      return formatted;
    }
    return `${formatted} / 5.00`;
  }

  get averageAsNumber(): number {
    return Number(this.reputation.averageScore) / 100;
  }

  async ngOnInit(): Promise<void> {
    await this.loadReputation();
    this.attachRatingListener();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (!changes["producerAddress"] || changes["producerAddress"].firstChange) {
      return;
    }
    await this.loadReputation();
  }

  ngOnDestroy(): void {
    this.detachRatingListener();
  }

  private attachRatingListener(): void {
    this.detachRatingListener();

    try {
      const contract = this.reputationService.getContract();
      const listener = (_ratingId: bigint, _consumer: string, producer: string) => {
        if (!this.producerAddress) {
          return;
        }
        if (producer.toLowerCase() !== this.producerAddress.toLowerCase()) {
          return;
        }
        this.loadReputation().catch(() => undefined);
      };

      contract.on("RatingSubmitted", listener);
      this.stopRatingListener = () => {
        contract.off("RatingSubmitted", listener);
      };
    } catch {
      this.stopRatingListener = null;
    }
  }

  private detachRatingListener(): void {
    if (this.stopRatingListener) {
      this.stopRatingListener();
      this.stopRatingListener = null;
    }
  }

  private async loadReputation(): Promise<void> {
    if (!this.producerAddress || !this.web3Service.provider || !this.web3Service.isCorrectNetwork$.value) {
      this.reputation = {
        totalScore: 0n,
        ratingCount: 0n,
        averageScore: 0n
      };
      return;
    }

    this.loading = true;
    try {
      this.reputation = await this.reputationService.getReputation(this.producerAddress);
    } catch {
      this.reputation = {
        totalScore: 0n,
        ratingCount: 0n,
        averageScore: 0n
      };
    } finally {
      this.loading = false;
    }
  }
}
