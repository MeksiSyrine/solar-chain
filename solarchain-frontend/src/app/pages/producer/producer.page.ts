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
    <section class="page-enter mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header class="mb-2 border-b border-zinc-800 pb-6">
        <p class="text-xs text-zinc-600">SolarChain / Producteur</p>
        <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold text-zinc-100">Dashboard Producteur</h1>
            <p class="mt-0.5 text-sm text-zinc-500">Publier des offres et suivre la performance de vente.</p>
          </div>

          <span class="rounded border border-green-900 bg-green-950 px-2 py-0.5 text-xs text-green-400">Compte verifie</span>
        </div>

        <div *ngIf="!web3Service.currentAccount" class="mt-4 rounded-md border border-amber-900 bg-amber-950 px-3 py-2 text-xs text-amber-400">
          Connectez votre wallet pour charger vos donnees producteur.
        </div>
        <div *ngIf="errorMessage" class="mt-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-xs text-red-400">
          {{ errorMessage }}
        </div>
      </header>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">SKWH disponibles</p>
          <p class="mt-1 text-2xl font-semibold font-mono text-zinc-100">{{ skwhBalance }}</p>
          <p class="mt-2 text-xs text-zinc-500">Solde producteur</p>
        </article>

        <article class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">Offres actives</p>
          <p class="mt-1 text-2xl font-semibold font-mono text-zinc-100">{{ myOffers.length }}</p>
          <p class="mt-2 text-xs text-zinc-500">Disponibles sur le marche</p>
        </article>

        <article class="rounded-lg border border-zinc-800 bg-zinc-900 p-6 sm:col-span-2 xl:col-span-1">
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">Revenus ETH</p>
          <p class="mt-1 text-2xl font-semibold font-mono text-zinc-100">{{ totalRevenueEth | number: '1.4-6' }}</p>
          <p class="mt-2 text-xs text-zinc-500">Total cumule</p>
        </article>
      </section>

      <section class="rounded-lg border border-zinc-800 bg-zinc-900">
        <header class="border-b border-zinc-800 px-6 py-4">
          <h2 class="text-sm font-medium text-zinc-200">Nouvelle offre</h2>
        </header>

        <div class="px-6 py-4">
          <form [formGroup]="offerForm" class="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" (ngSubmit)="createOffer()">
            <div>
              <label class="form-label">Quantite (kWh)</label>
              <input class="input-field font-mono" type="number" formControlName="quantityKwh" placeholder="250" />
            </div>

            <div>
              <label class="form-label">Prix ETH / kWh</label>
              <input class="input-field font-mono" type="number" step="0.0001" formControlName="priceEth" placeholder="0.0015" />
            </div>

            <div>
              <button class="btn-primary px-4 py-2" [disabled]="offerForm.invalid || loading">Publier</button>
            </div>
          </form>

          <div class="mt-4">
            <input
              class="w-full accent-amber-500"
              type="range"
              min="1"
              [max]="maxSliderKwh"
              [value]="sliderQuantity"
              (input)="onQuantitySlider($event)"
            />
            <p class="mt-2 text-xs text-zinc-500">Total estime: {{ estimatedTotalEth | number: '1.4-6' }} ETH</p>
          </div>
        </div>
      </section>

      <section class="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <header class="border-b border-zinc-800 px-6 py-4">
          <h2 class="text-sm font-medium text-zinc-200">Mes offres actives</h2>
        </header>

        <div class="px-6 py-4">
          <div *ngIf="!loading && myOffers.length === 0" class="py-12 text-center">
            <p class="text-sm font-medium text-zinc-500">Aucune offre active</p>
            <p class="mt-1 text-xs text-zinc-600">Publiez votre premiere offre pour demarrer les ventes.</p>
          </div>

          <div *ngIf="myOffers.length > 0" class="overflow-x-auto">
            <table class="table-shell min-w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>kWh total</th>
                  <th>kWh restants</th>
                  <th>Prix / kWh</th>
                  <th>Progression</th>
                  <th>Potentiel ETH</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let offer of myOffers">
                  <td class="font-mono text-xs text-zinc-400">#{{ offer.id }}</td>
                  <td class="font-mono text-sm text-zinc-300">{{ offer.quantityKwh }}</td>
                  <td class="font-mono text-sm text-zinc-300">{{ offer.remainingKwh }}</td>
                  <td class="font-mono text-xs text-zinc-400">{{ toEth(offer.pricePerKwhWei) | number: '1.4-6' }}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 w-20 overflow-hidden rounded bg-zinc-800">
                        <div class="h-full bg-amber-500" [style.width.%]="soldPercent(offer)"></div>
                      </div>
                      <span class="text-xs text-zinc-500">{{ soldPercent(offer) }}%</span>
                    </div>
                  </td>
                  <td class="font-mono text-xs text-zinc-400">{{ remainingPotentialEth(offer) | number: '1.4-6' }}</td>
                  <td>
                    <button class="btn-danger px-3 py-1.5 text-xs" (click)="cancelOffer(offer.id)">Annuler</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
