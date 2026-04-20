import { Component, DestroyRef, inject } from "@angular/core";
import { DecimalPipe, NgFor, NgIf } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { RouterLink } from "@angular/router";
import { formatEther } from "ethers";
import { Offer } from "../../core/models/offer.model";
import { MarketTransaction } from "../../core/models/transaction.model";
import { EnergyCertificateService } from "../../core/services/energy-certificate.service";
import { EnergyMarketService } from "../../core/services/energy-market.service";
import { ReputationService } from "../../core/services/reputation.service";
import { Web3Service } from "../../core/services/web3.service";
import { ProducerCardComponent } from "../../shared/components/producer-card/producer-card.component";
import { StarRatingComponent } from "../../shared/components/star-rating/star-rating.component";

@Component({
  selector: "app-consumer-page",
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatSnackBarModule,
    ProducerCardComponent,
    StarRatingComponent
  ],
  template: `
    <section class="page-enter mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header class="mb-2 border-b border-zinc-800 pb-6">
        <p class="text-xs text-zinc-600">SolarChain / Consommateur</p>
        <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold text-zinc-100">Marche Consommateur</h1>
            <p class="mt-0.5 text-sm text-zinc-500">Acheter l energie disponible et suivre les certificats.</p>
          </div>

          <div class="flex items-center gap-2">
            <span class="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300">
              {{ web3Service.balance$.value | number: '1.4-6' }} ETH
            </span>
            <a routerLink="/certificates" class="btn-outline px-3 py-1.5 text-xs">Certificats: {{ totalCertificates }}</a>
          </div>
        </div>
      </header>

      <section class="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-6 py-4">
          <h2 class="text-sm font-medium text-zinc-200">Offres disponibles</h2>

          <div class="flex items-center gap-2">
            <label class="text-xs text-zinc-500">Tri</label>
            <select class="input-field w-auto min-w-[220px]" [value]="sortOrder" (change)="setSortOrder($event)">
              <option value="priceAsc">Prix croissant</option>
              <option value="qtyDesc">Quantite disponible</option>
            </select>
          </div>
        </header>

        <div class="px-6 py-4">
          <p *ngIf="errorMessage" class="mb-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-xs text-red-400">
            {{ errorMessage }}
          </p>

          <div *ngIf="!loading && sortedOffers.length === 0" class="py-12 text-center">
            <p class="text-sm font-medium text-zinc-500">Aucune offre disponible</p>
            <p class="mt-1 text-xs text-zinc-600">Les nouvelles offres apparaitront ici.</p>
          </div>

          <div *ngIf="loading" class="py-8">
            <div class="skeleton h-10 w-full"></div>
          </div>

          <div *ngIf="sortedOffers.length > 0" class="overflow-x-auto">
            <table class="table-shell min-w-full">
              <thead>
                <tr>
                  <th>Producteur</th>
                  <th>kWh disponibles</th>
                  <th>Prix / kWh</th>
                  <th>Total min</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let offer of sortedOffers">
                  <td>
                    <app-producer-card [producerAddress]="offer.producer" [compact]="true"></app-producer-card>
                  </td>
                  <td class="font-mono text-sm text-zinc-300">{{ offer.remainingKwh }}</td>
                  <td class="font-mono text-xs text-zinc-400">{{ toEth(offer.pricePerKwhWei) | number: '1.4-6' }}</td>
                  <td class="font-mono text-xs text-zinc-400">{{ toEth(offer.pricePerKwhWei) | number: '1.4-6' }} ETH</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <button class="btn-outline px-3 py-1.5 text-xs" (click)="openProfileModal(offer.producer)">Voir le profil complet</button>
                      <button class="btn-primary px-3 py-1.5 text-xs" (click)="openBuyModal(offer)">Acheter</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <header class="flex items-center justify-between gap-3 border-b border-zinc-800 px-6 py-4">
          <h2 class="text-sm font-medium text-zinc-200">Mes achats</h2>
          <span class="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{{ myTrades.length }}</span>
        </header>

        <div class="px-6 py-4">
          <div *ngIf="myTrades.length === 0" class="py-12 text-center">
            <p class="text-sm font-medium text-zinc-500">Aucun achat</p>
            <p class="mt-1 text-xs text-zinc-600">Vos achats apparaitront dans cette section.</p>
          </div>

          <div *ngIf="myTrades.length > 0" class="overflow-x-auto">
            <table class="table-shell min-w-full">
              <thead>
                <tr>
                  <th>Trade</th>
                  <th>Producteur</th>
                  <th>kWh</th>
                  <th>Notation</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let trade of myTrades">
                  <td class="font-mono text-xs text-zinc-400">#{{ trade.id }}</td>
                  <td class="font-mono text-xs text-zinc-400">{{ trade.producer }}</td>
                  <td class="font-mono text-sm text-zinc-300">{{ trade.quantityKwh }}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <button *ngIf="canRateByTrade[trade.id]" class="btn-outline px-3 py-1.5 text-xs" (click)="openRatePanel(trade)">
                        Noter
                      </button>

                      <div *ngIf="!canRateByTrade[trade.id] && myRatingByTrade[trade.id]" class="flex items-center gap-2">
                        <app-star-rating [rating]="myRatingByTrade[trade.id]" [readonly]="true" size="sm"></app-star-rating>
                        <span class="text-xs text-zinc-500">Note soumise</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div *ngIf="showBuyModal && selectedOffer" class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
        <div class="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-medium text-zinc-200">Confirmer l achat</h3>
              <p class="mt-1 text-xs text-zinc-500">Offre #{{ selectedOffer.id }} - {{ shortAddress(selectedOffer.producer) }}</p>
            </div>
            <button class="btn-outline px-3 py-1.5 text-xs" (click)="closeBuyModal()">Fermer</button>
          </div>

          <form [formGroup]="buyForm" class="grid gap-4" (ngSubmit)="buy()">
            <div>
              <label class="form-label">Offer ID</label>
              <input class="input-field font-mono" type="number" formControlName="offerId" readonly />
            </div>

            <div>
              <label class="form-label">Quantite kWh</label>
              <input class="input-field font-mono" type="number" formControlName="quantityKwh" />
            </div>

            <div class="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
              Total estime: <span class="font-mono text-zinc-300">{{ modalEstimatedTotalEth | number: '1.4-6' }} ETH</span>
            </div>

            <div class="flex items-center justify-end gap-2">
              <button type="button" class="btn-secondary px-4 py-2" (click)="closeBuyModal()">Annuler</button>
              <button class="btn-primary px-4 py-2" [disabled]="buyForm.invalid || loading">Confirmer</button>
            </div>
          </form>
        </div>
      </div>

      <div *ngIf="showProfileModal && selectedProducerAddress" class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
        <div class="w-full max-w-2xl rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-medium text-zinc-200">Profil producteur</h3>
              <p class="mt-1 text-xs text-zinc-500">Vue complete du profil IPFS et de la reputation.</p>
            </div>
            <button class="btn-outline px-3 py-1.5 text-xs" (click)="closeProfileModal()">Fermer</button>
          </div>

          <app-producer-card [producerAddress]="selectedProducerAddress" [compact]="false"></app-producer-card>
        </div>
      </div>

      <div *ngIf="showRatePanel && tradeToRate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div class="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-medium text-zinc-200">Evaluer cette transaction</h3>
              <p class="mt-1 text-xs text-zinc-500">Trade #{{ tradeToRate.id }} - {{ shortAddress(tradeToRate.producer) }}</p>
            </div>
            <button class="btn-outline px-3 py-1.5 text-xs" (click)="closeRatePanel()">Fermer</button>
          </div>

          <div class="rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <app-star-rating [rating]="pendingScore" size="lg" (ratingChange)="onPendingScoreChange($event)"></app-star-rating>
            <p class="mt-2 text-xs text-zinc-500">Selection actuelle: {{ pendingScore || 0 }} / 5</p>
          </div>

          <div class="mt-4 flex items-center justify-end gap-2">
            <button class="btn-secondary px-4 py-2" (click)="closeRatePanel()">Plus tard</button>
            <button class="btn-primary px-4 py-2" [disabled]="pendingScore < 1 || ratingLoading" (click)="submitRating()">
              Soumettre ma note
            </button>
          </div>
        </div>
      </div>
  `
})
export class ConsumerPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly web3Service = inject(Web3Service);
  private readonly marketService = inject(EnergyMarketService);
  private readonly certificateService = inject(EnergyCertificateService);
  private readonly reputationService = inject(ReputationService);
  private readonly snackBar = inject(MatSnackBar);

  readonly buyForm = this.formBuilder.group({
    offerId: ["", [Validators.required, Validators.min(1)]],
    quantityKwh: ["", [Validators.required, Validators.min(1)]]
  });

  offers: Offer[] = [];
  sortOrder: "priceAsc" | "qtyDesc" = "priceAsc";
  selectedOffer: Offer | null = null;
  showBuyModal = false;
  selectedProducerAddress = "";
  showProfileModal = false;
  totalCertificates = 0;
  myTrades: MarketTransaction[] = [];
  canRateByTrade: Record<number, boolean> = {};
  myRatingByTrade: Record<number, number> = {};
  showRatePanel = false;
  tradeToRate: MarketTransaction | null = null;
  pendingScore = 0;
  ratingLoading = false;
  loading = false;
  errorMessage = "";

  get sortedOffers(): Offer[] {
    const cloned = [...this.offers];
    if (this.sortOrder === "priceAsc") {
      return cloned.sort((a, b) => Number(a.pricePerKwhWei) - Number(b.pricePerKwhWei));
    }
    return cloned.sort((a, b) => Number(b.remainingKwh) - Number(a.remainingKwh));
  }

  get modalEstimatedTotalEth(): number {
    if (!this.selectedOffer) {
      return 0;
    }
    const qty = Number(this.buyForm.value.quantityKwh || 0);
    return qty * this.toEth(this.selectedOffer.pricePerKwhWei);
  }

  constructor() {
    this.web3Service.account$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadOffers().catch(() => undefined);
      this.loadCertificatesCount().catch(() => undefined);
      this.loadMyTrades().catch(() => undefined);
    });

    this.web3Service.chainId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadOffers().catch(() => undefined);
      this.loadCertificatesCount().catch(() => undefined);
      this.loadMyTrades().catch(() => undefined);
    });

    this.loadOffers().catch(() => undefined);
    this.loadCertificatesCount().catch(() => undefined);
    this.loadMyTrades().catch(() => undefined);
  }

  selectOffer(offer: Offer) {
    this.buyForm.patchValue({ offerId: String(offer.id) });
  }

  shortAddress(address: string): string {
    if (!address) {
      return "-";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  availabilityPercent(offer: Offer): number {
    const total = Number(offer.quantityKwh);
    const remaining = Number(offer.remainingKwh);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(remaining)) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round((remaining / total) * 100)));
  }

  setSortOrder(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortOrder = target.value === "qtyDesc" ? "qtyDesc" : "priceAsc";
  }

  openBuyModal(offer: Offer): void {
    this.selectedOffer = offer;
    this.selectOffer(offer);
    this.buyForm.patchValue({ quantityKwh: "" });
    this.showBuyModal = true;
  }

  closeBuyModal(): void {
    this.showBuyModal = false;
    this.selectedOffer = null;
  }

  openProfileModal(producerAddress: string): void {
    this.selectedProducerAddress = producerAddress;
    this.showProfileModal = true;
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
    this.selectedProducerAddress = "";
  }

  openRatePanel(trade: MarketTransaction): void {
    this.tradeToRate = trade;
    this.pendingScore = this.myRatingByTrade[trade.id] || 0;
    this.showRatePanel = true;
  }

  closeRatePanel(): void {
    this.showRatePanel = false;
    this.tradeToRate = null;
    this.pendingScore = 0;
  }

  onPendingScoreChange(score: number): void {
    this.pendingScore = score;
  }

  async buy() {
    if (this.buyForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    try {
      const offerId = BigInt(this.buyForm.value.offerId || 0);
      const quantityKwh = BigInt(this.buyForm.value.quantityKwh || 0);
      const selected = this.offers.find((offer) => offer.id === Number(offerId));
      if (!selected) {
        throw new Error("Offre introuvable");
      }

      const totalPriceWei = BigInt(selected.pricePerKwhWei) * quantityKwh;
      await this.marketService.buyEnergy(offerId, quantityKwh, totalPriceWei);
      this.snackBar.open("Achat confirme", "OK", {
        duration: 2300,
        panelClass: ["solar-snackbar", "solar-snackbar--success"]
      });
      await this.loadOffers();
      await this.loadCertificatesCount();
      await this.loadMyTrades();
      this.buyForm.reset();
      this.closeBuyModal();

      const latest = this.myTrades.length > 0 ? this.myTrades[0] : null;
      if (latest && this.canRateByTrade[latest.id]) {
        this.openRatePanel(latest);
      }
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", {
        duration: 4000,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
    } finally {
      this.loading = false;
    }
  }

  toEth(wei: string): number {
    return Number(formatEther(wei));
  }

  async submitRating(): Promise<void> {
    if (!this.tradeToRate || this.pendingScore < 1) {
      return;
    }

    this.ratingLoading = true;
    try {
      await this.reputationService.submitRating(BigInt(this.tradeToRate.id), this.pendingScore);
      this.snackBar.open("Merci, votre note a ete soumise", "OK", {
        duration: 2500,
        panelClass: ["solar-snackbar", "solar-snackbar--success"]
      });
      await this.loadMyTrades();
      this.closeRatePanel();
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", {
        duration: 4000,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
    } finally {
      this.ratingLoading = false;
    }
  }

  private async loadOffers() {
    this.loading = true;
    this.errorMessage = "";

    try {
      if (!this.web3Service.currentAccount) {
        this.offers = [];
        return;
      }

      if (!this.web3Service.isCorrectNetwork$.value) {
        this.offers = [];
        this.errorMessage = "Mauvais reseau detecte. Basculez sur le reseau Hardhat local.";
        return;
      }

      this.offers = await this.marketService.getActiveOffers();
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.offers = [];
    } finally {
      this.loading = false;
    }
  }

  private async loadCertificatesCount() {
    const account = this.web3Service.currentAccount;
    if (!account || !this.web3Service.isCorrectNetwork$.value) {
      this.totalCertificates = 0;
      return;
    }

    try {
      this.totalCertificates = await this.certificateService.getTotalCertificates(account);
    } catch {
      this.totalCertificates = 0;
    }
  }

  private async loadMyTrades() {
    const account = this.web3Service.currentAccount;
    if (!account || !this.web3Service.isCorrectNetwork$.value) {
      this.myTrades = [];
      this.canRateByTrade = {};
      this.myRatingByTrade = {};
      return;
    }

    try {
      const trades = await this.marketService.getTradeHistory();
      const accountLower = account.toLowerCase();
      this.myTrades = trades
        .filter((trade) => trade.consumer.toLowerCase() === accountLower)
        .sort((a, b) => b.id - a.id);

      const canRateEntries = await Promise.all(
        this.myTrades.map(async (trade) => {
          try {
            const allowed = await this.reputationService.canRate(BigInt(trade.id), account);
            return [trade.id, allowed] as const;
          } catch {
            return [trade.id, false] as const;
          }
        })
      );

      const canRateMap: Record<number, boolean> = {};
      for (const [tradeId, allowed] of canRateEntries) {
        canRateMap[tradeId] = allowed;
      }

      const ratingMap: Record<number, number> = {};
      const producerMap = new Map<string, string>();
      for (const trade of this.myTrades) {
        const key = trade.producer.toLowerCase();
        if (!producerMap.has(key)) {
          producerMap.set(key, trade.producer);
        }
      }

      const producerList = Array.from(producerMap.values());
      await Promise.all(
        producerList.map(async (producerAddress) => {
          try {
            const ratings = await this.reputationService.getRatingsByProducer(producerAddress);
            for (const rating of ratings) {
              if (rating.consumer.toLowerCase() !== accountLower) {
                continue;
              }
              ratingMap[Number(rating.tradeId)] = rating.score;
            }
          } catch {
            return;
          }
        })
      );

      for (const tradeId of Object.keys(ratingMap)) {
        canRateMap[Number(tradeId)] = false;
      }

      this.canRateByTrade = canRateMap;
      this.myRatingByTrade = ratingMap;
    } catch {
      this.myTrades = [];
      this.canRateByTrade = {};
      this.myRatingByTrade = {};
    }
  }
}
