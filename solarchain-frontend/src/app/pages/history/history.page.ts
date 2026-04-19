import { Component, inject } from "@angular/core";
import { DatePipe, DecimalPipe, NgFor, NgIf } from "@angular/common";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { Contract, InterfaceAbi, formatEther } from "ethers";
import energyMarketArtifact from "../../../assets/contracts/EnergyMarket.json";
import { environment } from "../../../environments/environment";
import { MarketTransaction } from "../../core/models/transaction.model";
import { EnergyMarketService } from "../../core/services/energy-market.service";
import { Web3Service } from "../../core/services/web3.service";

@Component({
  selector: "app-history-page",
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, NgIf, NgFor],
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
    </section>
  `
})
export class HistoryPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly marketService = inject(EnergyMarketService);
  private readonly web3Service = inject(Web3Service);

  readonly filters = this.formBuilder.group({
    address: [""],
    fromDate: [""]
  });
  viewMode: "all" | "buys" | "sales" = "all";

  transactions: MarketTransaction[] = [];
  filteredTransactions: MarketTransaction[] = [];
  txHashByTradeId: Record<number, string> = {};
  errorMessage = "";

  get totalVolumeEth(): number {
    return this.transactions.reduce((sum, tx) => sum + Number(formatEther(BigInt(tx.totalPriceWei))), 0);
  }

  get totalKwh(): number {
    return this.transactions.reduce((sum, tx) => sum + Number(tx.quantityKwh), 0);
  }

  constructor() {
    this.filters.valueChanges.subscribe(() => this.applyFilters());
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

  private async loadHistory() {
    try {
      this.errorMessage = "";
      this.transactions = await this.marketService.getTradeHistory();
      this.filteredTransactions = [...this.transactions];
      await this.loadTradeHashes();
      this.applyFilters();
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.transactions = [];
      this.filteredTransactions = [];
      this.txHashByTradeId = {};
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
}
