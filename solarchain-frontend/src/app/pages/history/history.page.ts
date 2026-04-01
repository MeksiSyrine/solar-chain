import { Component, inject } from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatTableModule } from "@angular/material/table";
import { formatEther } from "ethers";
import { MarketTransaction } from "../../core/models/transaction.model";
import { EnergyMarketService } from "../../core/services/energy-market.service";

@Component({
  selector: "app-history-page",
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule
  ],
  template: `
    <mat-card class="border border-slate-700 bg-slate-900/60">
      <mat-card-header>
        <mat-card-title>Historique global des transactions</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="filters" class="mt-4 grid gap-3 md:grid-cols-3">
          <mat-form-field appearance="outline">
            <mat-label>Filtre adresse</mat-label>
            <input matInput formControlName="address" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Date min (timestamp sec)</mat-label>
            <input matInput type="number" formControlName="from" />
          </mat-form-field>
          <div class="flex items-center gap-2">
            <button mat-flat-button color="primary" type="button" (click)="applyFilters()">Filtrer</button>
            <button mat-stroked-button type="button" (click)="resetFilters()">Reset</button>
          </div>
        </form>

        <div class="mt-4 overflow-auto">
          <p *ngIf="errorMessage" class="mb-4 rounded border border-rose-500/40 bg-rose-900/30 p-2 text-sm text-rose-200">
            {{ errorMessage }}
          </p>

          <div
            *ngIf="!errorMessage && transactions.length === 0"
            class="rounded border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-300"
          >
            Aucun trade enregistre pour le moment.
          </div>

          <div
            *ngIf="!errorMessage && transactions.length > 0 && filteredTransactions.length === 0"
            class="rounded border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-300"
          >
            Aucun resultat avec les filtres actuels.
          </div>

          <table *ngIf="filteredTransactions.length > 0" mat-table [dataSource]="filteredTransactions" class="w-full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>Trade</th>
              <td mat-cell *matCellDef="let tx">#{{ tx.id }}</td>
            </ng-container>
            <ng-container matColumnDef="offer">
              <th mat-header-cell *matHeaderCellDef>Offer</th>
              <td mat-cell *matCellDef="let tx">#{{ tx.offerId }}</td>
            </ng-container>
            <ng-container matColumnDef="producer">
              <th mat-header-cell *matHeaderCellDef>Producteur</th>
              <td mat-cell *matCellDef="let tx">{{ tx.producer }}</td>
            </ng-container>
            <ng-container matColumnDef="consumer">
              <th mat-header-cell *matHeaderCellDef>Consommateur</th>
              <td mat-cell *matCellDef="let tx">{{ tx.consumer }}</td>
            </ng-container>
            <ng-container matColumnDef="qty">
              <th mat-header-cell *matHeaderCellDef>kWh</th>
              <td mat-cell *matCellDef="let tx">{{ tx.quantityKwh }}</td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>Total ETH</th>
              <td mat-cell *matCellDef="let tx">{{ toEth(tx.totalPriceWei) }}</td>
            </ng-container>
            <ng-container matColumnDef="time">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let tx">{{ tx.timestamp * 1000 | date: 'short' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  `
})
export class HistoryPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly marketService = inject(EnergyMarketService);

  readonly columns = ["id", "offer", "producer", "consumer", "qty", "total", "time"];
  readonly filters = this.formBuilder.group({
    address: [""],
    from: [""]
  });

  transactions: MarketTransaction[] = [];
  filteredTransactions: MarketTransaction[] = [];
  errorMessage = "";

  constructor() {
    this.loadHistory().catch(() => undefined);
  }

  toEth(wei: string): string {
    return Number(formatEther(wei)).toFixed(5);
  }

  applyFilters() {
    const addressFilter = (this.filters.value.address || "").toLowerCase();
    const from = Number(this.filters.value.from || 0);

    this.filteredTransactions = this.transactions.filter((tx) => {
      const addressMatch =
        !addressFilter || tx.producer.toLowerCase().includes(addressFilter) || tx.consumer.toLowerCase().includes(addressFilter);
      const dateMatch = !from || tx.timestamp >= from;
      return addressMatch && dateMatch;
    });
  }

  resetFilters() {
    this.filters.reset({ address: "", from: "" });
    this.filteredTransactions = [...this.transactions];
  }

  private async loadHistory() {
    try {
      this.errorMessage = "";
      this.transactions = await this.marketService.getTradeHistory();
      this.filteredTransactions = [...this.transactions];
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.transactions = [];
      this.filteredTransactions = [];
    }
  }
}
