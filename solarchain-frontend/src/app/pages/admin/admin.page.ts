import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { Producer } from "../../core/models/producer.model";
import { MeterOracleService } from "../../core/services/meter-oracle.service";

@Component({
  selector: "app-admin-page",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatSnackBarModule
  ],
  template: `
    <div class="grid gap-6 lg:grid-cols-2">
      <mat-card class="border border-slate-700 bg-slate-900/60">
        <mat-card-header>
          <mat-card-title>Enregistrer producteur</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="registerForm" class="mt-4 grid gap-3" (ngSubmit)="registerProducer()">
            <mat-form-field appearance="outline">
              <mat-label>Adresse producteur</mat-label>
              <input matInput formControlName="address" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Capacite max (kWh)</mat-label>
              <input matInput type="number" formControlName="capacity" />
            </mat-form-field>
            <button mat-flat-button color="primary" [disabled]="registerForm.invalid || loading">Enregistrer</button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card class="border border-slate-700 bg-slate-900/60">
        <mat-card-header>
          <mat-card-title>Soumettre lecture compteur</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="readingForm" class="mt-4 grid gap-3" (ngSubmit)="submitReading()">
            <mat-form-field appearance="outline">
              <mat-label>Adresse producteur</mat-label>
              <input matInput formControlName="address" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Production (kWh)</mat-label>
              <input matInput type="number" formControlName="kwh" />
            </mat-form-field>
            <button mat-flat-button color="accent" [disabled]="readingForm.invalid || loading">Soumettre</button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>

    <mat-card class="mt-6 border border-slate-700 bg-slate-900/60">
      <mat-card-header>
        <mat-card-title>Producteurs enregistres</mat-card-title>
      </mat-card-header>
      <mat-card-content class="mt-4 overflow-auto">
        <div *ngIf="errorMessage" class="mb-4 rounded border border-rose-500/40 bg-rose-900/30 p-3 text-sm text-rose-200">
          {{ errorMessage }}
        </div>

        <div *ngIf="!loading && producers.length === 0" class="rounded border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-300">
          Aucun producteur enregistre pour le moment.
        </div>

        <table *ngIf="producers.length > 0" mat-table [dataSource]="producers" class="w-full">
          <ng-container matColumnDef="address">
            <th mat-header-cell *matHeaderCellDef>Adresse</th>
            <td mat-cell *matCellDef="let producer">{{ producer.address }}</td>
          </ng-container>
          <ng-container matColumnDef="capacity">
            <th mat-header-cell *matHeaderCellDef>Capacite max</th>
            <td mat-cell *matCellDef="let producer">{{ producer.maxCapacityKwh }}</td>
          </ng-container>
          <ng-container matColumnDef="minted">
            <th mat-header-cell *matHeaderCellDef>Total mint</th>
            <td mat-cell *matCellDef="let producer">{{ producer.totalMintedKwh }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </mat-card-content>
    </mat-card>
  `
})
export class AdminPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly meterOracleService = inject(MeterOracleService);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = ["address", "capacity", "minted"];
  readonly registerForm = this.formBuilder.group({
    address: ["", [Validators.required]],
    capacity: ["", [Validators.required, Validators.min(1)]]
  });
  readonly readingForm = this.formBuilder.group({
    address: ["", [Validators.required]],
    kwh: ["", [Validators.required, Validators.min(1)]]
  });

  loading = false;
  errorMessage = "";
  producers: Producer[] = [];

  constructor() {
    this.loadProducers().catch(() => undefined);
  }

  async registerProducer() {
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    try {
      const address = this.registerForm.value.address || "";
      const capacity = BigInt(this.registerForm.value.capacity || 0);
      await this.meterOracleService.registerProducer(address, capacity);
      this.snackBar.open("Producteur enregistre", "OK", { duration: 2200 });
      await this.loadProducers();
      this.registerForm.reset();
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  async submitReading() {
    if (this.readingForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    try {
      const address = this.readingForm.value.address || "";
      const kwh = BigInt(this.readingForm.value.kwh || 0);
      await this.meterOracleService.submitReading(address, kwh);
      this.snackBar.open("Lecture enregistree et tokens mintes", "OK", { duration: 2500 });
      await this.loadProducers();
      this.readingForm.reset();
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  private async loadProducers() {
    try {
      this.producers = await this.meterOracleService.getAllProducers();
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.producers = [];
    }
  }
}
