import { Component, inject } from "@angular/core";
import { DecimalPipe, NgFor, NgIf } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { formatEther, parseEther } from "ethers";
import { Offer } from "../../core/models/offer.model";
import { EnergyMarketService } from "../../core/services/energy-market.service";
import { EnergyTokenService } from "../../core/services/energy-token.service";
import { Web3Service } from "../../core/services/web3.service";

@Component({
  selector: "app-producer-page",
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, NgIf, NgFor, MatSnackBarModule],
  template: `
    <section class="page-enter space-y-6">
      <header class="glass-card border border-green/30 p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="bg-gradient-to-r from-green-400 to-solar-300 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              🔋 Dashboard Producteur
            </h1>
            <p class="mt-2 text-sm text-text-secondary">Publiez des offres, suivez vos ventes et optimisez vos revenus.</p>
          </div>

          <span class="rounded-xl border border-green/40 bg-green-glow px-3 py-2 text-sm text-green-400">Producteur vérifié ✓</span>
        </div>

        <div *ngIf="!web3Service.currentAccount" class="mt-4 rounded-xl border border-amber-500/40 bg-amber-900/30 p-3 text-sm text-amber-200">
          Connecte ton wallet pour charger tes données producteur.
        </div>
        <div *ngIf="errorMessage" class="mt-4 rounded-xl border border-rose-500/40 bg-rose-900/30 p-3 text-sm text-rose-200">
          {{ errorMessage }}
        </div>
      </header>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article class="glass-card border border-green/30 p-5">
          <p class="text-sm text-text-secondary">SKWH disponibles</p>
          <p class="mt-2 text-3xl font-bold text-text-primary">{{ skwhBalance }}</p>
          <p class="mt-1 text-xs text-green-400">Token énergie producteur</p>
        </article>

        <article class="glass-card border border-solar/25 p-5">
          <p class="text-sm text-text-secondary">Offres actives</p>
          <p class="mt-2 text-3xl font-bold text-text-primary">{{ myOffers.length }}</p>
          <p class="mt-1 text-xs text-solar-300">En cours sur le marché</p>
        </article>

        <article class="glass-card border border-solar/25 p-5 sm:col-span-2 xl:col-span-1">
          <p class="text-sm text-text-secondary">Revenus totaux</p>
          <p class="mt-2 text-3xl font-bold text-text-primary">{{ totalRevenueEth | number: '1.4-6' }} ETH</p>
          <p class="mt-1 text-xs text-solar-300">Ventes cumulées</p>
        </article>
      </section>

      <section class="glass-card border border-solar/20 p-6">
        <h2 class="text-lg font-semibold text-text-primary">Créer une offre</h2>
        <p class="mt-1 text-sm text-text-secondary">Définissez votre quantité et votre prix par kWh.</p>

        <form [formGroup]="offerForm" class="mt-5 grid gap-4 md:grid-cols-2" (ngSubmit)="createOffer()">
          <div class="md:col-span-2">
            <label class="form-label">Quantité (kWh)</label>
            <input class="input-field" type="number" formControlName="quantityKwh" placeholder="Ex: 250" />
            <input
              class="mt-3 w-full accent-[#f59e0b]"
              type="range"
              min="1"
              [max]="maxSliderKwh"
              [value]="sliderQuantity"
              (input)="onQuantitySlider($event)"
            />
          </div>

          <div>
            <label class="form-label">Prix ETH / kWh</label>
            <input class="input-field" type="number" step="0.0001" formControlName="priceEth" placeholder="Ex: 0.0015" />
          </div>

          <div class="rounded-xl border border-solar/35 bg-solar-glow px-3 py-2 text-sm text-solar-300">
            Preview: {{ estimatedTotalEth | number: '1.4-6' }} ETH total si vendu
          </div>

          <div class="md:col-span-2">
            <button class="btn-primary px-6 py-3" [disabled]="offerForm.invalid || loading">Publier l'offre</button>
          </div>
        </form>
      </section>

      <section class="glass-card border border-border-subtle p-6">
        <h2 class="text-lg font-semibold text-text-primary">Mes offres actives</h2>

        <div *ngIf="!loading && myOffers.length === 0" class="mt-4 rounded-xl border border-border-subtle bg-bg-elevated p-5 text-sm text-text-secondary">
          Aucune offre active. Crée ta première offre pour vendre ton surplus.
        </div>

        <div *ngIf="myOffers.length > 0" class="mt-4 grid gap-4 md:grid-cols-2">
          <article *ngFor="let offer of myOffers" class="glass-card border border-solar/20 p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide text-text-secondary">Offre #{{ offer.id }}</p>
                <p class="mt-1 text-lg font-semibold text-text-primary">{{ offer.remainingKwh }} / {{ offer.quantityKwh }} kWh</p>
              </div>
              <span class="rounded-full border border-solar/35 bg-solar-glow px-2 py-1 text-xs text-solar-300">
                {{ toEth(offer.pricePerKwhWei) | number: '1.4-6' }} ETH/kWh
              </span>
            </div>

            <div class="mt-3">
              <div class="mb-1 flex items-center justify-between text-xs text-text-secondary">
                <span>Progression vente</span>
                <span>{{ soldPercent(offer) }}%</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-bg-elevated">
                <div class="h-full rounded-full bg-gradient-to-r from-solar-500 to-green-400" [style.width.%]="soldPercent(offer)"></div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between gap-3">
              <p class="text-sm text-text-secondary">Potentiel restant: {{ remainingPotentialEth(offer) | number: '1.4-6' }} ETH</p>
              <button class="btn-danger px-3 py-2 text-sm" (click)="cancelOffer(offer.id)">Annuler</button>
            </div>
          </article>
        </div>
      </section>
    </section>
  `
})
export class ProducerPage {
  private readonly formBuilder = inject(FormBuilder);
  readonly web3Service = inject(Web3Service);
  private readonly tokenService = inject(EnergyTokenService);
  private readonly marketService = inject(EnergyMarketService);
  private readonly snackBar = inject(MatSnackBar);

  readonly offerForm = this.formBuilder.group({
    quantityKwh: ["", [Validators.required, Validators.min(1)]],
    priceEth: ["", [Validators.required, Validators.min(0.000000001)]]
  });

  loading = false;
  errorMessage = "";
  skwhBalance = "0";
  myOffers: Offer[] = [];
  totalRevenueEth = 0;
  maxSliderKwh = 2000;

  get sliderQuantity(): number {
    const qty = Number(this.offerForm.value.quantityKwh || 1);
    return Number.isFinite(qty) && qty > 0 ? qty : 1;
  }

  get estimatedTotalEth(): number {
    const quantity = Number(this.offerForm.value.quantityKwh || 0);
    const unitPrice = Number(this.offerForm.value.priceEth || 0);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
      return 0;
    }
    return quantity * unitPrice;
  }

  constructor() {
    this.refreshView().catch(() => undefined);
  }

  async createOffer() {
    if (this.offerForm.invalid || !this.web3Service.currentAccount) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    try {
      const quantity = BigInt(this.offerForm.value.quantityKwh || 0);
      const priceEth = String(this.offerForm.value.priceEth || "0");
      const priceWei = parseEther(priceEth);

      await this.tokenService.approve(this.marketService.getAddress(), quantity);
      await this.marketService.createOffer(quantity, priceWei);

      this.snackBar.open("Offre creee", "OK", {
        duration: 2200,
        panelClass: ["solar-snackbar", "solar-snackbar--success"]
      });
      this.offerForm.reset();
      await this.refreshView();
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", {
        duration: 4000,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
    } finally {
      this.loading = false;
    }
  }

  async cancelOffer(offerId: number) {
    this.loading = true;
    this.errorMessage = "";
    try {
      await this.marketService.cancelOffer(BigInt(offerId));
      this.snackBar.open("Offre annulee", "OK", {
        duration: 2200,
        panelClass: ["solar-snackbar", "solar-snackbar--info"]
      });
      await this.refreshView();
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

  soldPercent(offer: Offer): number {
    const total = Number(offer.quantityKwh);
    const remaining = Number(offer.remainingKwh);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(remaining)) {
      return 0;
    }

    const sold = Math.max(0, total - remaining);
    return Math.min(100, Math.round((sold / total) * 100));
  }

  remainingPotentialEth(offer: Offer): number {
    const remaining = Number(offer.remainingKwh);
    const unitPrice = this.toEth(offer.pricePerKwhWei);
    return remaining * unitPrice;
  }

  onQuantitySlider(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value || 1);
    this.offerForm.patchValue({ quantityKwh: String(value) });
  }

  private async refreshView() {
    const account = this.web3Service.currentAccount;
    if (!account) {
      this.myOffers = [];
      this.skwhBalance = "0";
      return;
    }

    try {
      this.skwhBalance = await this.tokenService.getBalance(account);
      const [offers, trades] = await Promise.all([this.marketService.getAllOffers(), this.marketService.getTradeHistory()]);
      this.myOffers = offers.filter((offer) => offer.producer.toLowerCase() === account.toLowerCase() && offer.isActive);
      this.totalRevenueEth = trades
        .filter((trade) => trade.producer.toLowerCase() === account.toLowerCase())
        .reduce((sum, trade) => sum + Number(formatEther(BigInt(trade.totalPriceWei))), 0);
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.myOffers = [];
      this.totalRevenueEth = 0;
    }
  }
}
