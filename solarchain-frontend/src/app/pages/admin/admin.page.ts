import { Component, inject } from "@angular/core";
import { NgFor, NgIf } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { Producer } from "../../core/models/producer.model";
import { MeterOracleService } from "../../core/services/meter-oracle.service";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-admin-page",
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgFor, MatSnackBarModule],
  template: `
    <section class="page-enter space-y-6">
      <header class="glass-card border border-solar/25 p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="bg-gradient-to-r from-solar-300 to-solar-500 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              🛡️ Dashboard Admin
            </h1>
            <p class="mt-2 text-sm text-text-secondary">
              Gérez les producteurs enregistrés et soumettez les lectures on-chain.
            </p>
          </div>

          <div class="rounded-xl border border-solar/35 bg-solar-glow px-3 py-2 text-sm text-solar-300">
            Admin: {{ shortAddress(adminAddress) }}
          </div>
        </div>
      </header>

      <div class="grid gap-6 xl:grid-cols-2">
        <article class="glass-card border border-solar/20 p-6">
          <h2 class="text-lg font-semibold text-text-primary">Enregistrer un producteur</h2>
          <p class="mt-1 text-sm text-text-secondary">Ajoutez un nouveau producteur avec sa capacité maximale.</p>

          <form [formGroup]="registerForm" class="mt-5 grid gap-4" (ngSubmit)="registerProducer()">
            <div>
              <label class="form-label">Adresse producteur</label>
              <input class="input-field" formControlName="address" placeholder="0x..." />
            </div>

            <div>
              <label class="form-label">Capacité max (kWh)</label>
              <input class="input-field" type="number" formControlName="capacity" placeholder="Ex: 1200" />
            </div>

            <button class="btn-primary mt-1 px-6 py-3" [disabled]="registerForm.invalid || loading">Enregistrer le producteur</button>
          </form>
        </article>

        <article class="glass-card border border-green/25 p-6">
          <h2 class="text-lg font-semibold text-text-primary">Soumettre une lecture compteur</h2>
          <p class="mt-1 text-sm text-text-secondary">Chaque lecture valide le mint de SKWH correspondant.</p>

          <form [formGroup]="readingForm" class="mt-5 grid gap-4" (ngSubmit)="submitReading()">
            <div>
              <label class="form-label">Adresse producteur</label>
              <input class="input-field" formControlName="address" placeholder="0x..." />
            </div>

            <div>
              <label class="form-label">Production (kWh)</label>
              <input class="input-field" type="number" formControlName="kwh" placeholder="Ex: 85" />
            </div>

            <div class="rounded-xl border border-green/35 bg-green-glow px-3 py-2 text-sm text-green-400">
              Preview: {{ readingForm.value.kwh || 0 }} SKWH seront mintés.
            </div>

            <button class="btn-primary mt-1 px-6 py-3" [disabled]="readingForm.invalid || loading">Soumettre la lecture</button>
          </form>
        </article>
      </div>

      <section class="glass-card border border-border-subtle p-6">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-lg font-semibold text-text-primary">Producteurs enregistrés</h2>
          <span class="rounded-full border border-solar/35 bg-solar-glow px-3 py-1 text-xs text-solar-300">
            Total: {{ producers.length }}
          </span>
        </div>

        <div *ngIf="errorMessage" class="mb-4 rounded-xl border border-rose-500/40 bg-rose-900/30 p-3 text-sm text-rose-200">
          {{ errorMessage }}
        </div>

        <div *ngIf="!loading && producers.length === 0" class="rounded-xl border border-border-subtle bg-bg-elevated p-4 text-sm text-text-secondary">
          Aucun producteur enregistré pour le moment.
        </div>

        <div *ngIf="producers.length > 0" class="overflow-x-auto">
          <table class="table-shell min-w-full">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Adresse</th>
                <th>Capacité max</th>
                <th>Total produit</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let producer of producers">
                <td class="font-medium text-text-primary">Producteur {{ shortAddress(producer.address) }}</td>
                <td class="text-text-secondary">{{ shortAddress(producer.address) }}</td>
                <td>{{ producer.maxCapacityKwh }} kWh</td>
                <td>{{ producer.totalMintedKwh }} SKWH</td>
                <td>
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [class.bg-green-glow]="producer.isRegistered"
                    [class.text-green-400]="producer.isRegistered"
                    [class.border]="true"
                    [class.border-green/40]="producer.isRegistered"
                    [class.bg-rose-900/30]="!producer.isRegistered"
                    [class.text-rose-300]="!producer.isRegistered"
                    [class.border-rose-500/40]="!producer.isRegistered"
                  >
                    {{ producer.isRegistered ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `
})
export class AdminPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly meterOracleService = inject(MeterOracleService);
  private readonly snackBar = inject(MatSnackBar);
  readonly adminAddress = environment.adminAddress;

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

  shortAddress(address: string): string {
    if (!address) {
      return "-";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

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
      this.snackBar.open("Producteur enregistre", "OK", {
        duration: 2200,
        panelClass: ["solar-snackbar", "solar-snackbar--success"]
      });
      await this.loadProducers();
      this.registerForm.reset();
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", {
        duration: 4000,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
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
      this.snackBar.open("Lecture enregistree et tokens mintes", "OK", {
        duration: 2500,
        panelClass: ["solar-snackbar", "solar-snackbar--success"]
      });
      await this.loadProducers();
      this.readingForm.reset();
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", {
        duration: 4000,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
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
