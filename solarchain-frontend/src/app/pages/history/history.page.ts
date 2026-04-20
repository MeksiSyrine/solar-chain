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
    <section class="page-enter mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header class="mb-2 border-b border-zinc-800 pb-6">
        <p class="text-xs text-zinc-600">SolarChain / Historique</p>
        <div class="mt-2">
          <h1 class="text-xl font-semibold text-zinc-100">Historique des transactions</h1>
          <p class="mt-0.5 text-sm text-zinc-500">Suivi des volumes et des transactions on-chain.</p>
        </div>
      </header>

      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">Total trades</p>
          <p class="mt-1 text-2xl font-semibold font-mono text-zinc-100">{{ transactions.length }}</p>
        </article>

        <article class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">Volume ETH</p>
          <p class="mt-1 text-2xl font-semibold font-mono text-zinc-100">{{ totalVolumeEth | number: '1.4-6' }}</p>
        </article>

        <article class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">kWh total</p>
          <p class="mt-1 text-2xl font-semibold font-mono text-zinc-100">{{ totalKwh }}</p>
        </article>

        <article class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">Meilleure reputation</p>
          <div *ngIf="bestRatedProducerAddress; else noBestRatedProducer" class="mt-1 space-y-1">
            <p class="font-mono text-xs text-zinc-400">{{ shortAddress(bestRatedProducerAddress) }}</p>
            <div class="flex items-center gap-2">
              <app-star-rating [rating]="bestRatedAverage" [readonly]="true" size="sm"></app-star-rating>
              <span class="text-xs text-zinc-400">{{ bestRatedAverage | number: '1.2-2' }} / 5.00</span>
            </div>
          </div>
          <ng-template #noBestRatedProducer>
            <p class="mt-1 text-xs text-zinc-500">Aucun producteur note</p>
          </ng-template>
        </article>
      </section>

      <section class="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-4">
        <div class="grid gap-3 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <label class="form-label">Adresse (producteur/consommateur)</label>
            <input class="input-field font-mono" formControlName="address" [formGroup]="filters" placeholder="0x..." />
          </div>

          <div>
            <label class="form-label">Date minimale</label>
            <input class="input-field" type="date" formControlName="fromDate" [formGroup]="filters" />
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-4 border-b border-zinc-800 pb-2 text-sm">
          <button
            class="pb-2 text-zinc-400 transition-colors duration-150 hover:text-zinc-200"
            [class.border-b-2]="viewMode === 'all'"
            [class.border-amber-500]="viewMode === 'all'"
            [class.text-zinc-100]="viewMode === 'all'"
            (click)="setViewMode('all')"
          >
            Toutes
          </button>
          <button
            class="pb-2 text-zinc-400 transition-colors duration-150 hover:text-zinc-200"
            [class.border-b-2]="viewMode === 'buys'"
            [class.border-amber-500]="viewMode === 'buys'"
            [class.text-zinc-100]="viewMode === 'buys'"
            (click)="setViewMode('buys')"
          >
            Mes achats
          </button>
          <button
            class="pb-2 text-zinc-400 transition-colors duration-150 hover:text-zinc-200"
            [class.border-b-2]="viewMode === 'sales'"
            [class.border-amber-500]="viewMode === 'sales'"
            [class.text-zinc-100]="viewMode === 'sales'"
            (click)="setViewMode('sales')"
          >
            Mes ventes
          </button>
          <button class="btn-outline ml-auto px-3 py-1.5 text-xs" (click)="resetFilters()">Reset</button>
        </div>
      </section>

      <section class="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div class="px-6 py-4">
          <p *ngIf="errorMessage" class="mb-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-xs text-red-400">
            {{ errorMessage }}
          </p>

          <div *ngIf="!errorMessage && transactions.length === 0" class="py-12 text-center">
            <p class="text-sm font-medium text-zinc-500">Aucun trade</p>
            <p class="mt-1 text-xs text-zinc-600">Les transactions apparaitront ici.</p>
          </div>

          <div *ngIf="!errorMessage && transactions.length > 0 && filteredTransactions.length === 0" class="py-12 text-center">
            <p class="text-sm font-medium text-zinc-500">Aucun resultat</p>
            <p class="mt-1 text-xs text-zinc-600">Essayez avec des filtres differents.</p>
          </div>

          <div *ngIf="filteredTransactions.length > 0" class="overflow-x-auto">
            <table class="table-shell min-w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Acheteur</th>
                  <th>Vendeur</th>
                  <th>kWh</th>
                  <th>Prix ETH</th>
                  <th>Reputation</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tx of filteredTransactions">
                  <td class="font-mono text-xs text-zinc-400">{{ tx.id }}</td>
                  <td class="text-sm text-zinc-300">{{ tx.timestamp * 1000 | date: 'dd MMM y, HH:mm' }}</td>
                  <td class="font-mono text-xs text-zinc-400">{{ tx.consumer }}</td>
                  <td class="font-mono text-xs text-zinc-400">{{ tx.producer }}</td>
                  <td class="font-mono text-sm text-zinc-300">{{ tx.quantityKwh }}</td>
                  <td class="font-mono text-xs text-zinc-400">{{ toEth(tx.totalPriceWei) }}</td>
                  <td>
                    <div class="flex min-w-[180px] flex-col gap-1">
                      <app-star-rating [rating]="producerRatingByAddress[tx.producer.toLowerCase()] || 0" [readonly]="true" size="sm"></app-star-rating>
                      <button *ngIf="canRateByTrade[tx.id]" class="btn-outline w-fit px-2 py-1 text-xs" (click)="openRatePanel(tx)">
                        Noter
                      </button>
                      <span *ngIf="!canRateByTrade[tx.id] && myRatingByTrade[tx.id]" class="text-xs text-zinc-500">
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
                      class="font-mono text-xs text-zinc-400 underline decoration-zinc-700 underline-offset-2 hover:text-zinc-200"
                    >
                      {{ shortHash(txHashByTradeId[tx.id]) }}
                    </a>
                    <span *ngIf="!txHashByTradeId[tx.id]" class="text-xs text-zinc-600">N/A</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div *ngIf="showRatePanel && tradeToRate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div class="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-medium text-zinc-200">Noter cette transaction</h3>
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
