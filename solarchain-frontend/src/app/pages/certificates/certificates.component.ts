import { Component, DestroyRef, inject } from "@angular/core";
import { DatePipe, NgFor, NgIf } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { formatEther } from "ethers";
import { CertificateData, EnergyCertificateService } from "../../core/services/energy-certificate.service";
import { Web3Service } from "../../core/services/web3.service";

@Component({
  selector: "app-certificates-page",
  standalone: true,
  imports: [NgIf, NgFor, DatePipe],
  templateUrl: "./certificates.component.html"
})
export class CertificatesComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly web3Service = inject(Web3Service);
  private readonly certificateService = inject(EnergyCertificateService);

  account = "";
  certificates: CertificateData[] = [];
  loading = false;
  errorMessage = "";

  constructor() {
    this.web3Service.account$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((account) => {
      this.account = account;
      this.loadCertificates().catch(() => undefined);
    });

    this.loadCertificates().catch(() => undefined);
  }

  shortAddress(address: string): string {
    if (!address) {
      return "-";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatEth(wei: bigint): string {
    return `${Number(formatEther(wei)).toFixed(6)} ETH`;
  }

  trackByTokenId(_: number, cert: CertificateData): string {
    return cert.tokenId.toString();
  }

  private async loadCertificates(): Promise<void> {
    this.errorMessage = "";

    if (!this.account) {
      this.certificates = [];
      return;
    }

    if (!this.web3Service.isCorrectNetwork$.value) {
      this.certificates = [];
      this.errorMessage = "Mauvais reseau detecte. Basculez sur Hardhat Local pour consulter vos certificats.";
      return;
    }

    this.loading = true;
    try {
      this.certificates = await this.certificateService.getMyCertificates(this.account);
      this.certificates.sort((a, b) => Number(b.issuedAt - a.issuedAt));
    } catch (error) {
      this.certificates = [];
      this.errorMessage = (error as Error).message;
    } finally {
      this.loading = false;
    }
  }
}
