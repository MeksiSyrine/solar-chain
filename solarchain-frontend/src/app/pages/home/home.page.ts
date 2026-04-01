import { Component } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { Web3Service } from "../../core/services/web3.service";

@Component({
  selector: "app-home-page",
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatSnackBarModule],
  template: `
    <section class="grid gap-6 lg:grid-cols-2">
      <mat-card class="border border-emerald-600/30 bg-slate-900/70">
        <mat-card-header>
          <mat-card-title class="text-2xl text-emerald-300">Marche P2P d'energie solaire</mat-card-title>
        </mat-card-header>
        <mat-card-content class="mt-4 space-y-3 text-slate-300">
          <p>SolarChain permet aux producteurs de vendre leur surplus d'energie a leurs voisins sans intermediaire.</p>
          <p>Chaque SKWH represente 1 kWh tokenise, echangeable sur la marketplace Ethereum.</p>
        </mat-card-content>
        <mat-card-actions class="flex flex-wrap gap-3">
          <button mat-flat-button color="primary" (click)="connectWallet()">Connecter MetaMask</button>
          <a mat-stroked-button routerLink="/consumer">Voir le marche</a>
        </mat-card-actions>
      </mat-card>

      <div class="grid gap-4">
        <a routerLink="/admin" class="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-emerald-500">
          <h3 class="font-semibold text-emerald-300">Dashboard Admin</h3>
          <p class="mt-1 text-sm text-slate-400">Enregistrer producteurs et soumettre lectures.</p>
        </a>
        <a routerLink="/producer" class="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-emerald-500">
          <h3 class="font-semibold text-emerald-300">Dashboard Producteur</h3>
          <p class="mt-1 text-sm text-slate-400">Creer des offres et suivre les revenus.</p>
        </a>
        <a routerLink="/history" class="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-emerald-500">
          <h3 class="font-semibold text-emerald-300">Historique Global</h3>
          <p class="mt-1 text-sm text-slate-400">Explorer toutes les transactions blockchain.</p>
        </a>
      </div>
    </section>
  `
})
export class HomePage {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly web3Service: Web3Service,
    private readonly snackBar: MatSnackBar
  ) {
    this.route.queryParamMap.subscribe((params) => {
      const denied = params.get("denied");
      const reason = params.get("reason");

      if (denied && reason) {
        this.snackBar.open(reason, "OK", { duration: 3800 });

        this.router.navigate([], {
          queryParams: { denied: null, reason: null },
          queryParamsHandling: "merge",
          replaceUrl: true
        });
      }
    });
  }

  async connectWallet() {
    try {
      await this.web3Service.connectWallet();
      this.snackBar.open("Wallet connecte avec succes", "OK", { duration: 2200 });
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", { duration: 3500 });
    }
  }
}
