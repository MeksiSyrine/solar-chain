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
import { ProducerReputationComponent } from "../../shared/components/producer-reputation/producer-reputation.component";
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
    ProducerReputationComponent,
    StarRatingComponent
  ],
  template: `
    <section class="page-enter space-y-6">
      <header class="glass-card border border-solar/25 p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="bg-gradient-to-r from-solar-300 to-green-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              🛒 Marché Consommateur
            </h1>
            <p class="mt-2 text-sm text-text-secondary">Achetez l’énergie disponible au meilleur prix et suivez vos certificats.</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2 text-sm text-text-secondary">
              Solde ETH: {{ web3Service.balance$.value | number: '1.4-6' }}
            </span>
            <a
              routerLink="/certificates"
              class="rounded-xl border border-green/35 bg-green-glow px-3 py-2 text-sm text-green-400 transition hover:border-green-400"
            >
              Certificats: {{ totalCertificates }}
            </a>
          </div>
        </div>
      </header>

      <section class="glass-card border border-border-subtle p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-text-primary">Énergie disponible sur le marché</h2>

          <div class="flex items-center gap-2">
            <label class="text-xs uppercase tracking-wide text-text-secondary">Tri</label>
            <select class="input-field w-auto min-w-[220px]" [value]="sortOrder" (change)="setSortOrder($event)">
              <option value="priceAsc">Prix croissant</option>
              <option value="qtyDesc">Quantité disponible</option>
            </select>
          </div>
        </div>

        <p *ngIf="errorMessage" class="mt-4 rounded-xl border border-rose-500/40 bg-rose-900/30 p-3 text-sm text-rose-200">
          {{ errorMessage }}
        </p>

        <div *ngIf="!loading && sortedOffers.length === 0" class="mt-4 rounded-xl border border-border-subtle bg-bg-elevated p-4 text-sm text-text-secondary">
          Aucune offre disponible pour le moment.
        </div>

        <div *ngIf="loading" class="mt-4 rounded-xl border border-border-subtle bg-bg-elevated p-4 text-sm text-text-secondary">
          Chargement des offres...
        </div>

        <div *ngIf="sortedOffers.length > 0" class="mt-5 grid gap-4 lg:grid-cols-2">
          <article *ngFor="let offer of sortedOffers" class="glass-card border border-solar/20 p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide text-text-secondary">Offre #{{ offer.id }}</p>
                <p class="mt-1 text-sm text-text-secondary">Producteur {{ shortAddress(offer.producer) }}</p>
                <div class="mt-2">
                  <app-producer-reputation [producerAddress]="offer.producer"></app-producer-reputation>
                </div>
              </div>
              <span class="rounded-full border border-solar/35 bg-solar-glow px-2 py-1 text-xs text-solar-300">
                {{ toEth(offer.pricePerKwhWei) | number: '1.4-6' }} ETH/kWh
              </span>
            </div>

            <div class="mt-3">
              <p class="text-lg font-semibold text-text-primary">{{ offer.remainingKwh }} kWh disponibles</p>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-bg-elevated">
                <div class="h-full rounded-full bg-gradient-to-r from-green-400 to-solar-400" [style.width.%]="availabilityPercent(offer)"></div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between gap-3">
              <p class="text-sm text-text-secondary">Total estimé (1 kWh): {{ toEth(offer.pricePerKwhWei) | number: '1.4-6' }} ETH</p>
              <button class="btn-primary px-4 py-2 text-sm" (click)="openBuyModal(offer)">Acheter</button>
            </div>
          </article>
        </div>
      </section>

      <section class="glass-card border border-border-subtle p-6">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-text-primary">Mes achats</h2>
          <span class="rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs text-text-secondary">
            {{ myTrades.length }} trade(s)
          </span>
        </div>

        <div *ngIf="myTrades.length === 0" class="rounded-xl border border-border-subtle bg-bg-elevated p-4 text-sm text-text-secondary">
          Aucun achat pour le moment.
        </div>

        <div *ngIf="myTrades.length > 0" class="space-y-3">
          <article *ngFor="let trade of myTrades" class="rounded-xl border border-border-subtle bg-bg-elevated p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide text-text-secondary">Trade #{{ trade.id }}</p>
                <p class="mt-1 text-sm text-text-secondary">Producteur {{ shortAddress(trade.producer) }} • {{ trade.quantityKwh }} kWh</p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  *ngIf="canRateByTrade[trade.id]"
                  class="btn-secondary px-3 py-1.5 text-xs"
                  (click)="openRatePanel(trade)"
                >
                  ⭐ Noter
                </button>

                <div *ngIf="!canRateByTrade[trade.id] && myRatingByTrade[trade.id]" class="flex items-center gap-2">
                  <app-star-rating [rating]="myRatingByTrade[trade.id]" [readonly]="true" size="sm"></app-star-rating>
                  <span class="text-xs text-text-secondary">Note deja soumise</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div *ngIf="showBuyModal && selectedOffer" class="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
        <div class="glass-card w-full max-w-lg border border-solar/30 p-6">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-text-primary">Confirmer l'achat</h3>
              <p class="mt-1 text-sm text-text-secondary">Offre #{{ selectedOffer.id }} - {{ shortAddress(selectedOffer.producer) }}</p>
            </div>
            <button class="btn-secondary px-3 py-1.5 text-xs" (click)="closeBuyModal()">Fermer</button>
          </div>

          <form [formGroup]="buyForm" class="grid gap-4" (ngSubmit)="buy()">
            <div>
              <label class="form-label">Offer ID</label>
              <input class="input-field" type="number" formControlName="offerId" readonly />
            </div>

            <div>
              <label class="form-label">Quantité kWh</label>
              <input class="input-field" type="number" formControlName="quantityKwh" />
            </div>

            <div class="rounded-xl border border-solar/35 bg-solar-glow px-3 py-2 text-sm text-solar-300">
              Total estimé: {{ modalEstimatedTotalEth | number: '1.4-6' }} ETH
            </div>

            <div class="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2 text-sm text-text-secondary">
              Résumé: achat de {{ buyForm.value.quantityKwh || 0 }} kWh à {{ toEth(selectedOffer.pricePerKwhWei) | number: '1.4-6' }} ETH/kWh.
            </div>

            <div class="flex items-center justify-end gap-2">
              <button type="button" class="btn-secondary px-4 py-2" (click)="closeBuyModal()">Annuler</button>
              <button class="btn-primary px-4 py-2" [disabled]="buyForm.invalid || loading">Confirmer achat</button>
            </div>
          </form>
        </div>
      </div>

      <div *ngIf="showRatePanel && tradeToRate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
        <div class="glass-card w-full max-w-lg border border-solar/30 p-6">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-text-primary">Comment evaluez-vous cet achat ?</h3>
              <p class="mt-1 text-sm text-text-secondary">Trade #{{ tradeToRate.id }} - Producteur {{ shortAddress(tradeToRate.producer) }}</p>
            </div>
            <button class="btn-secondary px-3 py-1.5 text-xs" (click)="closeRatePanel()">Fermer</button>
          </div>

          <div class="rounded-xl border border-border-subtle bg-bg-elevated p-4">
            <app-star-rating [rating]="pendingScore" size="lg" (ratingChange)="onPendingScoreChange($event)"></app-star-rating>
            <p class="mt-2 text-sm text-text-secondary">Selection actuelle: {{ pendingScore || 0 }} / 5</p>
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
