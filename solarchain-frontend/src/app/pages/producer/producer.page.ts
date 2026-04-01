import { Component, inject } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { formatEther, parseEther } from "ethers";
import { Offer } from "../../core/models/offer.model";
import { EnergyMarketService } from "../../core/services/energy-market.service";
import { EnergyTokenService } from "../../core/services/energy-token.service";
import { Web3Service } from "../../core/services/web3.service";

@Component({
  selector: "app-producer-page",
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatSnackBarModule
  ],
  template: `
    <mat-card class="border border-slate-700 bg-slate-900/60">
      <mat-card-header>
        <mat-card-title>Dashboard Producteur</mat-card-title>
      </mat-card-header>
      <mat-card-content class="mt-3 text-slate-300">
        <p *ngIf="!web3Service.currentAccount" class="mb-2 rounded border border-amber-500/40 bg-amber-900/30 p-2 text-amber-200">
          Connecte ton wallet pour charger tes donnees producteur.
        </p>
        <p *ngIf="errorMessage" class="mb-2 rounded border border-rose-500/40 bg-rose-900/30 p-2 text-rose-200">
          {{ errorMessage }}
        </p>
        <p>Solde SKWH: <strong class="text-emerald-300">{{ skwhBalance }}</strong></p>
      </mat-card-content>
    </mat-card>

    <mat-card class="mt-6 border border-slate-700 bg-slate-900/60">
      <mat-card-header>
        <mat-card-title>Creer une offre</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="offerForm" class="mt-4 grid gap-3 md:grid-cols-3" (ngSubmit)="createOffer()">
          <mat-form-field appearance="outline">
            <mat-label>Quantite (kWh)</mat-label>
            <input matInput type="number" formControlName="quantityKwh" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Prix ETH / kWh</mat-label>
            <input matInput type="number" step="0.0001" formControlName="priceEth" />
          </mat-form-field>
          <div class="flex items-center">
            <button mat-flat-button color="primary" [disabled]="offerForm.invalid || loading">Publier</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    <mat-card class="mt-6 border border-slate-700 bg-slate-900/60">
      <mat-card-header>
        <mat-card-title>Mes offres actives</mat-card-title>
      </mat-card-header>
      <mat-card-content class="mt-4 overflow-auto">
        <div *ngIf="!loading && myOffers.length === 0" class="rounded border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-300">
          Aucune offre active. Cree ta premiere offre pour vendre ton surplus.
        </div>

        <table *ngIf="myOffers.length > 0" mat-table [dataSource]="myOffers" class="w-full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let offer">#{{ offer.id }}</td>
          </ng-container>
          <ng-container matColumnDef="remaining">
            <th mat-header-cell *matHeaderCellDef>Restant</th>
            <td mat-cell *matCellDef="let offer">{{ offer.remainingKwh }} kWh</td>
          </ng-container>
          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef>Prix</th>
            <td mat-cell *matCellDef="let offer">{{ toEth(offer.pricePerKwhWei) | number: '1.4-6' }} ETH</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let offer">
              <button mat-stroked-button color="warn" (click)="cancelOffer(offer.id)">Annuler</button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </mat-card-content>
    </mat-card>
  `
})
export class ProducerPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly web3Service = inject(Web3Service);
  private readonly tokenService = inject(EnergyTokenService);
  private readonly marketService = inject(EnergyMarketService);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = ["id", "remaining", "price", "actions"];
  readonly offerForm = this.formBuilder.group({
    quantityKwh: ["", [Validators.required, Validators.min(1)]],
    priceEth: ["", [Validators.required, Validators.min(0.000000001)]]
  });

  loading = false;
  errorMessage = "";
  skwhBalance = "0";
  myOffers: Offer[] = [];

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

      this.snackBar.open("Offre creee", "OK", { duration: 2200 });
      this.offerForm.reset();
      await this.refreshView();
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  async cancelOffer(offerId: number) {
    this.loading = true;
    this.errorMessage = "";
    try {
      await this.marketService.cancelOffer(BigInt(offerId));
      this.snackBar.open("Offre annulee", "OK", { duration: 2200 });
      await this.refreshView();
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  toEth(wei: string): number {
    return Number(formatEther(wei));
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
      const offers = await this.marketService.getAllOffers();
      this.myOffers = offers.filter((offer) => offer.producer.toLowerCase() === account.toLowerCase() && offer.isActive);
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.myOffers = [];
    }
  }
}
