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
    <section class="page-enter relative space-y-8">
      <div class="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div class="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-solar-glow blur-3xl"></div>
        <div class="absolute right-16 top-10 h-2 w-2 rounded-full bg-solar-400/70"></div>
        <div class="absolute left-14 top-28 h-1.5 w-1.5 rounded-full bg-green-400/70"></div>
        <div class="absolute bottom-16 right-1/3 h-1.5 w-1.5 rounded-full bg-solar-300/70"></div>
      </div>

      <header class="glass-card relative overflow-hidden border border-solar/30 p-8 sm:p-10">
        <div class="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-solar-glow blur-3xl"></div>
        <div class="relative z-10">
          <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-solar/40 bg-solar-glow px-4 py-1.5 text-xs text-solar-300">
            <span class="pulse-green-dot inline-block h-2 w-2 rounded-full bg-green-400"></span>
            ⚡ Réseau Ethereum • Décentralisé • Transparent
          </div>

          <h1 class="max-w-4xl bg-gradient-to-r from-solar-300 to-green-400 bg-clip-text text-4xl font-black leading-tight text-transparent sm:text-6xl lg:text-7xl">
            Échangez votre énergie solaire
          </h1>

          <p class="mt-5 max-w-2xl text-base text-text-secondary sm:text-xl">
            SolarChain connecte producteurs et consommateurs dans un marché P2P propre, traçable et sans intermédiaire.
          </p>

          <div class="mt-7 flex flex-wrap items-center gap-3">
            <button class="btn-primary solar-glow-hover px-6 py-3" (click)="connectWallet()">Connecter MetaMask</button>
            <a routerLink="/consumer" class="btn-secondary px-6 py-3">Voir le marché</a>
          </div>
        </div>
      </header>

      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article class="glass-card border border-solar/20 p-5">
          <p class="text-sm text-text-secondary">Total kWh échangés</p>
          <p class="mt-2 text-3xl font-bold text-text-primary">{{ totalKwhTraded }}</p>
          <p class="mt-1 text-xs text-solar-300">Volume on-chain</p>
        </article>

        <article class="glass-card border border-green/30 p-5">
          <p class="text-sm text-text-secondary">Producteurs actifs</p>
          <p class="mt-2 text-3xl font-bold text-text-primary">{{ activeProducers }}</p>
          <p class="mt-1 text-xs text-green-400">Registres validés</p>
        </article>

        <article class="glass-card border border-solar/20 p-5 sm:col-span-2 lg:col-span-1">
          <p class="text-sm text-text-secondary">Transactions totales</p>
          <p class="mt-2 text-3xl font-bold text-text-primary">{{ totalTransactions }}</p>
          <p class="mt-1 text-xs text-solar-300">Trades exécutés</p>
        </article>
      </section>

      <p *ngIf="loadingStats" class="text-sm text-text-secondary">Chargement des statistiques blockchain...</p>

      <section class="grid gap-4 md:grid-cols-2">
        <a routerLink="/admin" class="glass-card group border border-border-subtle p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-3xl">🛡️</p>
              <h3 class="mt-2 text-lg font-semibold text-text-primary">Dashboard Admin</h3>
              <p class="mt-1 text-sm text-text-secondary">Enregistrer des producteurs et soumettre des lectures.</p>
            </div>
            <span class="rounded-full border border-solar/40 bg-solar-glow px-2 py-1 text-xs text-solar-300">Admin</span>
          </div>
          <p class="mt-4 text-sm text-solar-300 transition group-hover:translate-x-1">Accéder →</p>
        </a>

        <a routerLink="/producer" class="glass-card group border border-border-subtle p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-3xl">🔋</p>
              <h3 class="mt-2 text-lg font-semibold text-text-primary">Dashboard Producteur</h3>
              <p class="mt-1 text-sm text-text-secondary">Publier des offres et suivre vos revenus énergétiques.</p>
            </div>
            <span class="rounded-full border border-green/40 bg-green-glow px-2 py-1 text-xs text-green-400">Producteur</span>
          </div>
          <p class="mt-4 text-sm text-solar-300 transition group-hover:translate-x-1">Accéder →</p>
        </a>

        <a routerLink="/consumer" class="glass-card group border border-border-subtle p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-3xl">🛒</p>
              <h3 class="mt-2 text-lg font-semibold text-text-primary">Marché Consommateur</h3>
              <p class="mt-1 text-sm text-text-secondary">Acheter l’énergie disponible et suivre vos certificats.</p>
            </div>
            <span class="rounded-full border border-border-subtle bg-bg-elevated px-2 py-1 text-xs text-text-secondary">Tous</span>
          </div>
          <p class="mt-4 text-sm text-solar-300 transition group-hover:translate-x-1">Accéder →</p>
        </a>

        <a routerLink="/history" class="glass-card group border border-border-subtle p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-3xl">📜</p>
              <h3 class="mt-2 text-lg font-semibold text-text-primary">Historique Global</h3>
              <p class="mt-1 text-sm text-text-secondary">Explorer les transactions blockchain du marché SolarChain.</p>
            </div>
            <span class="rounded-full border border-border-subtle bg-bg-elevated px-2 py-1 text-xs text-text-secondary">Tous</span>
          </div>
          <p class="mt-4 text-sm text-solar-300 transition group-hover:translate-x-1">Accéder →</p>
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
