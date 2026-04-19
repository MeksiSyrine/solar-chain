import { Component, inject } from "@angular/core";
import { DatePipe, DecimalPipe, NgFor, NgIf } from "@angular/common";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { Contract, InterfaceAbi, formatEther } from "ethers";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DestroyRef } from "@angular/core";
import energyMarketArtifact from "../../../assets/contracts/EnergyMarket.json";
import { environment } from "../../../environments/environment";
import { MarketTransaction } from "../../core/models/transaction.model";
import { EnergyMarketService } from "../../core/services/energy-market.service";
import { ReputationService } from "../../core/services/reputation.service";
import { Web3Service } from "../../core/services/web3.service";
import { StarRatingComponent } from "../../shared/components/star-rating/star-rating.component";

@Component({
  selector: "app-history-page",
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, NgIf, NgFor, MatSnackBarModule, StarRatingComponent],
  template: `
    <section class="page-enter space-y-6">
      <header class="glass-card border border-solar/25 p-6">
        <h1 class="bg-gradient-to-r from-solar-300 to-green-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
          📜 Historique des transactions
        </h1>
        <p class="mt-2 text-sm text-text-secondary">Suivez les échanges on-chain et analysez les volumes du marché.</p>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-xl border border-solar/30 bg-solar-glow px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-solar-300">Total trades</p>
            <p class="mt-1 text-2xl font-bold text-text-primary">{{ transactions.length }}</p>
          </div>
          <div class="rounded-xl border border-green/30 bg-green-glow px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-green-400">Volume ETH</p>
            <p class="mt-1 text-2xl font-bold text-text-primary">{{ totalVolumeEth | number: '1.4-6' }}</p>
          </div>
          <div class="rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-text-secondary">kWh échangés</p>
            <p class="mt-1 text-2xl font-bold text-text-primary">{{ totalKwh }}</p>
          </div>

          <div class="rounded-xl border border-solar/30 bg-bg-elevated px-4 py-3 sm:col-span-2 lg:col-span-3">
            <p class="text-xs uppercase tracking-wide text-text-secondary">Producteur le mieux noté</p>
            <div *ngIf="bestRatedProducerAddress; else noBestRatedProducer" class="mt-2 flex flex-wrap items-center gap-2">
              <span class="text-sm text-text-secondary">{{ shortAddress(bestRatedProducerAddress) }}</span>
              <app-star-rating [rating]="bestRatedAverage" [readonly]="true" size="sm"></app-star-rating>
              <span class="text-sm text-solar-300">{{ bestRatedAverage | number: '1.2-2' }} / 5.00</span>
            </div>
            <ng-template #noBestRatedProducer>
              <p class="mt-2 text-sm text-text-secondary">Aucun producteur note pour le moment.</p>
            </ng-template>
          </div>
        </div>
      </header>

      <section class="glass-card border border-border-subtle p-6">
        <div class="grid gap-3 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <label class="form-label">Adresse (producteur/consommateur)</label>
            <input class="input-field" formControlName="address" [formGroup]="filters" placeholder="0x..." />
          </div>

          <div>
            <label class="form-label">Date minimale</label>
            <input class="input-field" type="date" formControlName="fromDate" [formGroup]="filters" />
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <button class="btn-secondary px-4 py-2 text-sm" [class.btn-primary]="viewMode === 'all'" (click)="setViewMode('all')">Tous</button>
          <button class="btn-secondary px-4 py-2 text-sm" [class.btn-primary]="viewMode === 'buys'" (click)="setViewMode('buys')">Mes achats</button>
          <button class="btn-secondary px-4 py-2 text-sm" [class.btn-primary]="viewMode === 'sales'" (click)="setViewMode('sales')">Mes ventes</button>
          <button class="btn-secondary ml-auto px-4 py-2 text-sm" (click)="resetFilters()">Reset</button>
        </div>
      </section>

      <section class="glass-card border border-border-subtle p-6">
        <p *ngIf="errorMessage" class="mb-4 rounded-xl border border-rose-500/40 bg-rose-900/30 p-3 text-sm text-rose-200">
          {{ errorMessage }}
        </p>

        <div *ngIf="!errorMessage && transactions.length === 0" class="rounded-xl border border-border-subtle bg-bg-elevated p-4 text-sm text-text-secondary">
          Aucun trade enregistré pour le moment.
        </div>

        <div *ngIf="!errorMessage && transactions.length > 0 && filteredTransactions.length === 0" class="rounded-xl border border-border-subtle bg-bg-elevated p-4 text-sm text-text-secondary">
          Aucun résultat avec les filtres actuels.
        </div>

        <div *ngIf="filteredTransactions.length > 0" class="overflow-x-auto">
          <table class="table-shell min-w-full">
            <thead>
              <tr>
                <th>#ID</th>
                <th>Date</th>
                <th>Acheteur</th>
                <th>Vendeur</th>
                <th>kWh</th>
                <th>Prix ETH</th>
                <th>Réputation</th>
                <th>TX Hash</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of filteredTransactions">
                <td>#{{ tx.id }}</td>
                <td>{{ tx.timestamp * 1000 | date: 'short' }}</td>
                <td>{{ shortAddress(tx.consumer) }}</td>
                <td>{{ shortAddress(tx.producer) }}</td>
                <td>{{ tx.quantityKwh }}</td>
                <td>{{ toEth(tx.totalPriceWei) }}</td>
                <td>
                  <div class="flex min-w-[180px] flex-col gap-1">
                    <app-star-rating [rating]="producerRatingByAddress[tx.producer.toLowerCase()] || 0" [readonly]="true" size="sm"></app-star-rating>
                    <button
                      *ngIf="canRateByTrade[tx.id]"
                      class="inline-flex w-fit items-center rounded-md border border-solar/35 bg-solar-glow px-2 py-1 text-xs text-solar-300 hover:border-solar-400"
                      (click)="openRatePanel(tx)"
                    >
                      ⭐ Noter
                    </button>
                    <span *ngIf="!canRateByTrade[tx.id] && myRatingByTrade[tx.id]" class="text-xs text-text-secondary">
                      Votre note: {{ myRatingByTrade[tx.id] }}/5
                    </span>
                  </div>
                </td>
                <td>
                  <a
                    *ngIf="txHashByTradeId[tx.id]"
                    [href]="txLink(txHashByTradeId[tx.id])"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-solar-300 underline decoration-solar/40 underline-offset-2 hover:text-solar-400"
                  >
                    {{ shortHash(txHashByTradeId[tx.id]) }}
                  </a>
                  <span *ngIf="!txHashByTradeId[tx.id]" class="text-text-muted">N/A</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div *ngIf="showRatePanel && tradeToRate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
        <div class="glass-card w-full max-w-lg border border-solar/30 p-6">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-text-primary">Noter cette transaction</h3>
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
    </section>
  `
})
export class HistoryPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly marketService = inject(EnergyMarketService);
  private readonly reputationService = inject(ReputationService);
  private readonly web3Service = inject(Web3Service);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly filters = this.formBuilder.group({
    address: [""],
    fromDate: [""]
  });
  viewMode: "all" | "buys" | "sales" = "all";

  transactions: MarketTransaction[] = [];
  filteredTransactions: MarketTransaction[] = [];
  txHashByTradeId: Record<number, string> = {};
  producerRatingByAddress: Record<string, number> = {};
  canRateByTrade: Record<number, boolean> = {};
  myRatingByTrade: Record<number, number> = {};
  bestRatedProducerAddress = "";
  bestRatedAverage = 0;
  showRatePanel = false;
  tradeToRate: MarketTransaction | null = null;
  pendingScore = 0;
  ratingLoading = false;
  errorMessage = "";

  get totalVolumeEth(): number {
    return this.transactions.reduce((sum, tx) => sum + Number(formatEther(BigInt(tx.totalPriceWei))), 0);
  }

  get totalKwh(): number {
    return this.transactions.reduce((sum, tx) => sum + Number(tx.quantityKwh), 0);
  }

  constructor() {
    this.filters.valueChanges.subscribe(() => this.applyFilters());

    this.web3Service.account$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadReputationData().catch(() => undefined);
    });

    this.web3Service.chainId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadReputationData().catch(() => undefined);
    });

    this.loadHistory().catch(() => undefined);
  }

  toEth(wei: string): string {
    return Number(formatEther(wei)).toFixed(5);
  }

  shortAddress(address: string): string {
    if (!address) {
      return "-";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  shortHash(hash: string): string {
    if (!hash) {
      return "N/A";
    }
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  }

  txLink(hash: string): string {
    return `https://sepolia.etherscan.io/tx/${hash}`;
  }

  setViewMode(mode: "all" | "buys" | "sales") {
    this.viewMode = mode;
    this.applyFilters();
  }

  applyFilters() {
    const addressFilter = (this.filters.value.address || "").toLowerCase();
    const fromDate = this.filters.value.fromDate || "";
    const fromTimestamp = fromDate ? Math.floor(new Date(fromDate).getTime() / 1000) : 0;
    const currentAccount = this.web3Service.currentAccount.toLowerCase();

    this.filteredTransactions = this.transactions.filter((tx) => {
      const addressMatch =
        !addressFilter || tx.producer.toLowerCase().includes(addressFilter) || tx.consumer.toLowerCase().includes(addressFilter);

      const dateMatch = !fromTimestamp || tx.timestamp >= fromTimestamp;

      if (this.viewMode === "buys") {
        return addressMatch && dateMatch && !!currentAccount && tx.consumer.toLowerCase() === currentAccount;
      }

      if (this.viewMode === "sales") {
        return addressMatch && dateMatch && !!currentAccount && tx.producer.toLowerCase() === currentAccount;
      }

      return addressMatch && dateMatch;
    });
  }

  resetFilters() {
    this.filters.reset({ address: "", fromDate: "" });
    this.viewMode = "all";
    this.filteredTransactions = [...this.transactions];
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

  async submitRating(): Promise<void> {
    if (!this.tradeToRate || this.pendingScore < 1) {
      return;
    }

    this.ratingLoading = true;
    try {
      await this.reputationService.submitRating(BigInt(this.tradeToRate.id), this.pendingScore);
      this.snackBar.open("Note soumise avec succes", "OK", {
        duration: 2300,
        panelClass: ["solar-snackbar", "solar-snackbar--success"]
      });
      await this.loadReputationData();
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

  private async loadHistory() {
    try {
      this.errorMessage = "";
      this.transactions = await this.marketService.getTradeHistory();
      this.filteredTransactions = [...this.transactions];
      await this.loadTradeHashes();
      await this.loadReputationData();
      this.applyFilters();
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.transactions = [];
      this.filteredTransactions = [];
      this.txHashByTradeId = {};
      this.producerRatingByAddress = {};
      this.canRateByTrade = {};
      this.myRatingByTrade = {};
      this.bestRatedProducerAddress = "";
      this.bestRatedAverage = 0;
    }
  }

  private async loadTradeHashes() {
    const runner = this.web3Service.provider;
    if (!runner) {
      this.txHashByTradeId = {};
      return;
    }

    try {
      const contract = new Contract(
        environment.contracts.energyMarket,
        (energyMarketArtifact as { abi: InterfaceAbi }).abi,
        runner
      );

      const events = await contract.queryFilter(contract.filters.EnergySold());
      const tradeMap: Record<number, string> = {};

      for (const event of events) {
        if (!("args" in event) || !event.args) {
          continue;
        }

        const tradeId = Number((event.args[1] ?? 0n).toString());
        if (tradeId > 0 && event.transactionHash) {
          tradeMap[tradeId] = event.transactionHash;
        }
      }

      this.txHashByTradeId = tradeMap;
    } catch {
      this.txHashByTradeId = {};
    }
  }

  private async loadReputationData() {
    if (!this.web3Service.provider) {
      this.producerRatingByAddress = {};
      this.canRateByTrade = {};
      this.myRatingByTrade = {};
      this.bestRatedProducerAddress = "";
      this.bestRatedAverage = 0;
      return;
    }

    const account = this.web3Service.currentAccount;
    const hasWalletContext = !!account && this.web3Service.isCorrectNetwork$.value;

    const producers = Array.from(new Set(this.transactions.map((tx) => tx.producer.toLowerCase())));
    const producerRatingMap: Record<string, number> = {};
    const myRatingMap: Record<number, number> = {};

    await Promise.all(
      producers.map(async (producerLower) => {
        const original = this.transactions.find((tx) => tx.producer.toLowerCase() === producerLower)?.producer;
        if (!original) {
          return;
        }

        try {
          const rep = await this.reputationService.getReputation(original);
          producerRatingMap[producerLower] = Number(rep.averageScore) / 100;
        } catch {
          producerRatingMap[producerLower] = 0;
        }

        if (hasWalletContext) {
          try {
            const ratings = await this.reputationService.getRatingsByProducer(original);
            for (const rating of ratings) {
              if (rating.consumer.toLowerCase() !== account.toLowerCase()) {
                continue;
              }
              myRatingMap[Number(rating.tradeId)] = rating.score;
            }
          } catch {
            return;
          }
        }
      })
    );

    const canRateMap: Record<number, boolean> = {};

    if (hasWalletContext) {
      const canRateEntries = await Promise.all(
        this.transactions.map(async (tx) => {
          try {
            const canRate = await this.reputationService.canRate(BigInt(tx.id), account);
            return [tx.id, canRate] as const;
          } catch {
            return [tx.id, false] as const;
          }
        })
      );

      for (const [tradeId, canRate] of canRateEntries) {
        canRateMap[tradeId] = canRate;
      }
    } else {
      for (const tx of this.transactions) {
        canRateMap[tx.id] = false;
      }
    }

    for (const tradeId of Object.keys(myRatingMap)) {
      canRateMap[Number(tradeId)] = false;
    }

    let bestProducer = "";
    let bestScore = 0;
    for (const producerLower of Object.keys(producerRatingMap)) {
      const score = producerRatingMap[producerLower] || 0;
      if (score > bestScore) {
        bestScore = score;
        bestProducer = this.transactions.find((tx) => tx.producer.toLowerCase() === producerLower)?.producer || "";
      }
    }

    this.producerRatingByAddress = producerRatingMap;
    this.myRatingByTrade = myRatingMap;
    this.canRateByTrade = canRateMap;
    this.bestRatedProducerAddress = bestProducer;
    this.bestRatedAverage = bestScore;
  }
}
