import { Component } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { NgIf } from "@angular/common";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { EnergyMarketService } from "../../core/services/energy-market.service";
import { MeterOracleService } from "../../core/services/meter-oracle.service";
import { Web3Service } from "../../core/services/web3.service";

@Component({
  selector: "app-home-page",
  standalone: true,
  imports: [RouterLink, NgIf, MatSnackBarModule],
  template: `
    <section class="page-enter mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div class="grid gap-6 lg:grid-cols-2 lg:items-start">
        <header class="space-y-6 rounded-lg border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          <div class="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
            Plateforme decentralisee - Ethereum
          </div>

          <div>
            <h1 class="text-4xl font-semibold tracking-tight text-zinc-100 leading-tight">Echangez votre energie solaire</h1>
            <p class="mt-4 max-w-md text-base leading-relaxed text-zinc-400">
              SolarChain connecte producteurs et consommateurs dans un marche P2P transparent et verifiable on-chain.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button class="btn-primary px-4 py-2" (click)="connectWallet()">Connecter le wallet</button>
            <a routerLink="/consumer" class="btn-secondary px-4 py-2">Explorer le marche</a>
          </div>

          <div class="grid grid-cols-1 gap-4 border-t border-zinc-800 pt-4 sm:grid-cols-3 sm:divide-x sm:divide-zinc-800">
            <div class="sm:pr-4">
              <p class="text-xs text-zinc-500">kWh echanges</p>
              <p class="mt-1 text-sm font-mono text-zinc-200">{{ totalKwhTraded }}</p>
            </div>
            <div class="sm:px-4">
              <p class="text-xs text-zinc-500">Producteurs</p>
              <p class="mt-1 text-sm font-mono text-zinc-200">{{ activeProducers }}</p>
            </div>
            <div class="sm:pl-4">
              <p class="text-xs text-zinc-500">Transactions</p>
              <p class="mt-1 text-sm font-mono text-zinc-200">{{ totalTransactions }}</p>
            </div>
          </div>
        </header>

        <section class="rounded-lg border border-zinc-800 bg-zinc-900">
          <header class="border-b border-zinc-800 px-6 py-4">
            <h2 class="text-sm font-medium text-zinc-200">Marche en direct</h2>
          </header>

          <div class="space-y-3 px-6 py-4">
            <article class="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3">
              <div class="flex items-center justify-between gap-3 text-xs">
                <span class="font-mono text-zinc-400">0x12ab...98ef</span>
                <span class="text-zinc-500">120 kWh</span>
              </div>
              <p class="mt-1 text-sm font-mono text-zinc-300">0.00120 ETH / kWh</p>
            </article>

            <article class="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3">
              <div class="flex items-center justify-between gap-3 text-xs">
                <span class="font-mono text-zinc-400">0x44cd...71aa</span>
                <span class="text-zinc-500">85 kWh</span>
              </div>
              <p class="mt-1 text-sm font-mono text-zinc-300">0.00135 ETH / kWh</p>
            </article>

            <article class="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3">
              <div class="flex items-center justify-between gap-3 text-xs">
                <span class="font-mono text-zinc-400">0x8ff0...3b1c</span>
                <span class="text-zinc-500">200 kWh</span>
              </div>
              <p class="mt-1 text-sm font-mono text-zinc-300">0.00110 ETH / kWh</p>
            </article>
          </div>
        </section>
      </div>

      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">Total kWh echanges</p>
          <p class="mt-1 text-2xl font-semibold font-mono text-zinc-100">{{ totalKwhTraded }}</p>
          <p class="mt-2 text-xs text-zinc-500">Volume on-chain</p>
        </article>

        <article class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">Producteurs actifs</p>
          <p class="mt-1 text-2xl font-semibold font-mono text-zinc-100">{{ activeProducers }}</p>
          <p class="mt-2 text-xs text-green-500">Registres valides</p>
        </article>

        <article class="rounded-lg border border-zinc-800 bg-zinc-900 p-6 sm:col-span-2 lg:col-span-1">
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">Transactions totales</p>
          <p class="mt-1 text-2xl font-semibold font-mono text-zinc-100">{{ totalTransactions }}</p>
          <p class="mt-2 text-xs text-zinc-500">Trades executes</p>
        </article>
      </section>

      <p *ngIf="loadingStats" class="text-sm text-zinc-500">Chargement des statistiques blockchain...</p>

      <section class="grid gap-4 md:grid-cols-2">
        <a routerLink="/admin" class="rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors duration-150 hover:border-zinc-700">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-medium text-zinc-200">Dashboard Admin</h3>
              <p class="mt-2 text-sm text-zinc-400">Enregistrer des producteurs et soumettre des lectures.</p>
            </div>
            <span class="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Admin</span>
          </div>
        </a>

        <a routerLink="/producer" class="rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors duration-150 hover:border-zinc-700">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-medium text-zinc-200">Dashboard Producteur</h3>
              <p class="mt-2 text-sm text-zinc-400">Publier des offres et suivre les revenus energetiques.</p>
            </div>
            <span class="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Producteur</span>
          </div>
        </a>

        <a routerLink="/consumer" class="rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors duration-150 hover:border-zinc-700">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-medium text-zinc-200">Marche Consommateur</h3>
              <p class="mt-2 text-sm text-zinc-400">Acheter l energie disponible et suivre les certificats.</p>
            </div>
            <span class="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Marche</span>
          </div>
        </a>

        <a routerLink="/history" class="rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors duration-150 hover:border-zinc-700">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-medium text-zinc-200">Historique</h3>
              <p class="mt-2 text-sm text-zinc-400">Explorer les transactions blockchain du marche SolarChain.</p>
            </div>
            <span class="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Global</span>
          </div>
        </a>
      </section>
    </section>
  `
})
export class HomePage {
  loadingStats = false;
  totalKwhTraded = 0;
  activeProducers = 0;
  totalTransactions = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly web3Service: Web3Service,
    private readonly marketService: EnergyMarketService,
    private readonly meterOracleService: MeterOracleService,
    private readonly snackBar: MatSnackBar
  ) {
    this.route.queryParamMap.subscribe((params) => {
      const denied = params.get("denied");
      const reason = params.get("reason");

      if (denied && reason) {
        this.snackBar.open(reason, "OK", {
          duration: 3800,
          panelClass: ["solar-snackbar", "solar-snackbar--info"]
        });

        this.router.navigate([], {
          queryParams: { denied: null, reason: null },
          queryParamsHandling: "merge",
          replaceUrl: true
        });
      }
    });

    this.loadStats().catch(() => undefined);
  }

  async connectWallet() {
    try {
      await this.web3Service.connectWallet();
      this.snackBar.open("Wallet connecte avec succes", "OK", {
        duration: 2200,
        panelClass: ["solar-snackbar", "solar-snackbar--success"]
      });
      await this.loadStats();
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", {
        duration: 3500,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
    }
  }

  private async loadStats(): Promise<void> {
    this.loadingStats = true;

    try {
      const [trades, producers] = await Promise.all([
        this.marketService.getTradeHistory(),
        this.meterOracleService.getAllProducers()
      ]);

      this.totalTransactions = trades.length;
      this.totalKwhTraded = trades.reduce((sum, trade) => sum + Number(trade.quantityKwh), 0);
      this.activeProducers = producers.filter((producer) => producer.isRegistered).length;
    } catch {
      this.totalTransactions = 0;
      this.totalKwhTraded = 0;
      this.activeProducers = 0;
    } finally {
      this.loadingStats = false;
    }
  }
}
