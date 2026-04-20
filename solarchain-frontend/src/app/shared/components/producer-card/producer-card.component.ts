import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from "@angular/core";
import { NgIf } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { ProducerProfileData, IpfsService } from "../../../core/services/ipfs.service";
import { ProducerProfileService } from "../../../core/services/producer-profile.service";
import { ReputationService } from "../../../core/services/reputation.service";
import { pinataConfig } from "../../../../environments/pinata.config";

@Component({
  selector: "app-producer-card",
  standalone: true,
  imports: [NgIf, MatIconModule],
  templateUrl: "./producer-card.component.html"
})
export class ProducerCardComponent implements OnInit, OnChanges {
  @Input() producerAddress = "";
  @Input() compact = false;

  private readonly producerProfileService = inject(ProducerProfileService);
  private readonly reputationService = inject(ReputationService);
  private readonly ipfsService = inject(IpfsService);

  loading = false;
  hasProfile = false;
  profile: ProducerProfileData | null = null;
  averageLabel = "Pas encore note";
  averageValue = 0;
  ratingCount = 0;
  imageUrl = "";
  usingFallbackImage = false;

  async ngOnInit(): Promise<void> {
    await this.loadCardData();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    const addressChanged = !!changes["producerAddress"];
    const compactChanged = !!changes["compact"];

    if (!addressChanged && !compactChanged) {
      return;
    }

    await this.loadCardData();
  }

  shortAddress(address: string): string {
    if (!address) {
      return "-";
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  fallbackInitials(): string {
    const trimmed = this.producerAddress.trim();
    if (!trimmed) {
      return "SC";
    }

    const core = trimmed.replace("0x", "").toUpperCase();
    return core.slice(0, 2) || "SC";
  }

  onImageError(): void {
    if (!this.profile?.imageHash) {
      this.imageUrl = "";
      return;
    }

    if (!this.usingFallbackImage) {
      this.imageUrl = `${pinataConfig.fallbackGateway}${this.profile.imageHash}`;
      this.usingFallbackImage = true;
      return;
    }

    this.imageUrl = "";
  }

  private async loadCardData(): Promise<void> {
    const address = this.producerAddress.trim();
    this.profile = null;
    this.hasProfile = false;
    this.averageLabel = "Pas encore note";
    this.averageValue = 0;
    this.ratingCount = 0;
    this.imageUrl = "";
    this.usingFallbackImage = false;

    if (!address) {
      return;
    }

    this.loading = true;

    try {
      const [profile, reputation] = await Promise.all([
        this.producerProfileService.getFullProfile(address),
        this.reputationService.getReputation(address).catch(() => ({ totalScore: 0n, ratingCount: 0n, averageScore: 0n }))
      ]);

      this.profile = profile;
      this.hasProfile = !!profile;

      if (profile?.imageHash) {
        this.imageUrl = this.ipfsService.getImageUrl(profile.imageHash);
      }

      this.ratingCount = Number(reputation.ratingCount);
      this.averageLabel = this.reputationService.formatAverage(reputation.averageScore);
      this.averageValue = Number(reputation.averageScore) / 100;
    } finally {
      this.loading = false;
    }
  }
}
