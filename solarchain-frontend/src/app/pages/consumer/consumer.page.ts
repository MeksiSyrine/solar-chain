import { Component, DestroyRef, inject } from "@angular/core";
import { DecimalPipe, NgIf } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { formatEther } from "ethers";
import { Offer } from "../../core/models/offer.model";
import { EnergyMarketService } from "../../core/services/energy-market.service";
import { Web3Service } from "../../core/services/web3.service";

@Component({
  selector: "app-consumer-page",
  standalone: true,
  imports: [
    NgIf,
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
        <mat-card-title>Offres disponibles</mat-card-title>
      </mat-card-header>
      <mat-card-content class="mt-4 overflow-auto">
        <p *ngIf="errorMessage" class="mb-4 rounded border border-rose-500/40 bg-rose-900/30 p-2 text-sm text-rose-200">
          {{ errorMessage }}
        </p>

        <div *ngIf="!loading && offers.length === 0" class="rounded border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-300">
          Aucune offre disponible pour le moment.
        </div>

        <table *ngIf="offers.length > 0" mat-table [dataSource]="offers" class="w-full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let offer">#{{ offer.id }}</td>
          </ng-container>
          <ng-container matColumnDef="producer">
            <th mat-header-cell *matHeaderCellDef>Producteur</th>
            <td mat-cell *matCellDef="let offer">{{ offer.producer }}</td>
          </ng-container>
          <ng-container matColumnDef="remaining">
            <th mat-header-cell *matHeaderCellDef>Disponible</th>
            <td mat-cell *matCellDef="let offer">{{ offer.remainingKwh }} kWh</td>
          </ng-container>
          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef>Prix / kWh</th>
            <td mat-cell *matCellDef="let offer">{{ toEth(offer.pricePerKwhWei) | number: '1.4-6' }} ETH</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns" (click)="selectOffer(row)" class="cursor-pointer"></tr>
        </table>
      </mat-card-content>
    </mat-card>

    <mat-card class="mt-6 border border-slate-700 bg-slate-900/60">
      <mat-card-header>
        <mat-card-title>Acheter de l'energie</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="buyForm" class="mt-4 grid gap-3 md:grid-cols-3" (ngSubmit)="buy()">
          <mat-form-field appearance="outline">
            <mat-label>Offer ID</mat-label>
            <input matInput type="number" formControlName="offerId" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Quantite kWh</mat-label>
            <input matInput type="number" formControlName="quantityKwh" />
          </mat-form-field>
          <div class="flex items-center">
            <button mat-flat-button color="primary" [disabled]="buyForm.invalid || loading">Acheter</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `
})
export class ConsumerPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly web3Service = inject(Web3Service);
  private readonly marketService = inject(EnergyMarketService);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = ["id", "producer", "remaining", "price"];
  readonly buyForm = this.formBuilder.group({
    offerId: ["", [Validators.required, Validators.min(1)]],
    quantityKwh: ["", [Validators.required, Validators.min(1)]]
  });

  offers: Offer[] = [];
  loading = false;
  errorMessage = "";

  constructor() {
    this.web3Service.account$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadOffers().catch(() => undefined);
    });

    this.web3Service.chainId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadOffers().catch(() => undefined);
    });

    this.loadOffers().catch(() => undefined);
  }

  selectOffer(offer: Offer) {
    this.buyForm.patchValue({ offerId: String(offer.id) });
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
      this.snackBar.open("Achat confirme", "OK", { duration: 2300 });
      await this.loadOffers();
      this.buyForm.reset();
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  toEth(wei: string): number {
    return Number(formatEther(wei));
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
}
