import { Component, inject } from "@angular/core";
import { NgFor, NgIf } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { Producer } from "../../core/models/producer.model";
import { MeterOracleService } from "../../core/services/meter-oracle.service";
import { ProducerProfileService } from "../../core/services/producer-profile.service";
import { ProducerCardComponent } from "../../shared/components/producer-card/producer-card.component";
import { environment } from "../../../environments/environment";
import { pinataConfig } from "../../../environments/pinata.config";

@Component({
  selector: "app-admin-page",
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgFor, MatSnackBarModule, ProducerCardComponent],
  template: `
    <section class="page-enter mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header class="mb-2 border-b border-zinc-800 pb-6">
        <p class="text-xs text-zinc-600">SolarChain / Admin</p>
        <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold text-zinc-100">Dashboard Admin</h1>
            <p class="mt-0.5 text-sm text-zinc-500">Gerer les producteurs et soumettre les lectures compteur.</p>
          </div>
          <div class="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300">
            {{ shortAddress(adminAddress) }}
          </div>
        </div>
      </header>

      <div class="grid gap-6 xl:grid-cols-2">
        <article class="rounded-lg border border-zinc-800 bg-zinc-900">
          <header class="border-b border-zinc-800 px-6 py-4">
            <h2 class="text-sm font-medium text-zinc-200">Nouveau producteur</h2>
          </header>

          <div class="px-6 py-4">
            <form [formGroup]="registerForm" class="grid gap-4" (ngSubmit)="registerProducer()">
              <div>
                <label class="form-label">Adresse producteur</label>
                <input class="input-field font-mono" formControlName="address" placeholder="0x..." />
              </div>

              <div>
                <label class="form-label">Capacite max (kWh)</label>
                <input class="input-field font-mono" type="number" formControlName="capacity" placeholder="1200" />
              </div>

              <div>
                <button class="btn-primary px-4 py-2" [disabled]="registerForm.invalid || loading">Enregistrer</button>
              </div>
            </form>
          </div>
        </article>

        <article class="rounded-lg border border-zinc-800 bg-zinc-900">
          <header class="border-b border-zinc-800 px-6 py-4">
            <h2 class="text-sm font-medium text-zinc-200">Lecture compteur</h2>
          </header>

          <div class="px-6 py-4">
            <form [formGroup]="readingForm" class="grid gap-4" (ngSubmit)="submitReading()">
              <div>
                <label class="form-label">Adresse producteur</label>
                <input class="input-field font-mono" formControlName="address" placeholder="0x..." />
              </div>

              <div>
                <label class="form-label">Production (kWh)</label>
                <input class="input-field font-mono" type="number" formControlName="kwh" placeholder="85" />
              </div>

              <p class="text-xs text-zinc-500">{{ readingForm.value.kwh || 0 }} SKWH seront emis.</p>

              <div>
                <button class="btn-primary px-4 py-2" [disabled]="readingForm.invalid || loading">Soumettre</button>
              </div>
            </form>
          </div>
        </article>
      </div>

      <section class="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <header class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-6 py-4">
          <h2 class="text-sm font-medium text-zinc-200">Producteurs enregistres</h2>
          <span class="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{{ producers.length }}</span>
        </header>

        <div class="px-6 py-4">
          <div *ngIf="errorMessage" class="mb-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-xs text-red-400">
            {{ errorMessage }}
          </div>

          <div *ngIf="!loading && producers.length === 0" class="py-12 text-center">
            <p class="text-sm font-medium text-zinc-500">Aucun producteur</p>
            <p class="mt-1 text-xs text-zinc-600">Les producteurs enregistres apparaitront ici.</p>
          </div>

          <div *ngIf="producers.length > 0" class="overflow-x-auto">
            <table class="table-shell min-w-full">
              <thead>
                <tr>
                  <th>Producteur</th>
                  <th>Capacite max</th>
                  <th>Total produit</th>
                  <th>Statut</th>
                  <th>Profil IPFS</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let producer of producers">
                  <td>
                    <app-producer-card [producerAddress]="producer.address" [compact]="true"></app-producer-card>
                  </td>
                  <td class="font-mono text-sm text-zinc-300">{{ producer.maxCapacityKwh }}</td>
                  <td class="font-mono text-sm text-zinc-300">{{ producer.totalMintedKwh }}</td>
                  <td>
                    <span
                      class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                      [class.bg-green-950]="producer.isRegistered"
                      [class.text-green-400]="producer.isRegistered"
                      [class.border]="true"
                      [class.border-green-900]="producer.isRegistered"
                      [class.bg-zinc-800]="!producer.isRegistered"
                      [class.text-zinc-500]="!producer.isRegistered"
                      [class.border-zinc-700]="!producer.isRegistered"
                    >
                      {{ producer.isRegistered ? 'Actif' : 'Inactif' }}
                    </span>
                  </td>
                  <td>
                    <ng-container *ngIf="hasProfileByAddress[producer.address.toLowerCase()]; else noProfile">
                      <div class="space-y-1">
                        <span class="inline-flex items-center rounded border border-green-900 bg-green-950 px-2 py-0.5 text-xs text-green-400">
                          Profil configure
                        </span>
                        <a
                          *ngIf="profileCidByAddress[producer.address.toLowerCase()]"
                          [href]="profileUrl(profileCidByAddress[producer.address.toLowerCase()])"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="block font-mono text-[11px] text-amber-400 hover:text-amber-300"
                        >
                          {{ shortCid(profileCidByAddress[producer.address.toLowerCase()]) }}
                        </a>
                      </div>
                    </ng-container>
                    <ng-template #noProfile>
                      <span class="inline-flex items-center rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                        Pas de profil
                      </span>
                    </ng-template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  `
})
export class AdminPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly meterOracleService = inject(MeterOracleService);
  private readonly producerProfileService = inject(ProducerProfileService);
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
  profileCidByAddress: Record<string, string> = {};
  hasProfileByAddress: Record<string, boolean> = {};

  shortAddress(address: string): string {
    if (!address) {
      return "-";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  shortCid(cid: string): string {
    if (!cid) {
      return "";
    }

    return `${cid.slice(0, 10)}...${cid.slice(-6)}`;
  }

  profileUrl(cid: string): string {
    return `${pinataConfig.gateway}${cid}`;
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
      const address = String(this.registerForm.value.address || "").trim();
      const alreadyRegistered = await this.meterOracleService.isProducerRegistered(address);
      if (alreadyRegistered) {
        this.snackBar.open("Ce producteur existe deja", "Fermer", {
          duration: 3500,
          panelClass: ["solar-snackbar", "solar-snackbar--error"]
        });
        return;
      }

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
      const address = String(this.readingForm.value.address || "").trim();
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
      await this.loadProfileStatus(this.producers);
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.producers = [];
      this.profileCidByAddress = {};
      this.hasProfileByAddress = {};
    }
  }

  private async loadProfileStatus(producers: Producer[]): Promise<void> {
    const entries = await Promise.all(
      producers.map(async (producer) => {
        const key = producer.address.toLowerCase();
        try {
          const [hasProfile, cid] = await Promise.all([
            this.producerProfileService.hasProfile(producer.address),
            this.producerProfileService.getProfileCID(producer.address)
          ]);

          return {
            key,
            hasProfile,
            cid
          };
        } catch {
          return {
            key,
            hasProfile: false,
            cid: ""
          };
        }
      })
    );

    const hasMap: Record<string, boolean> = {};
    const cidMap: Record<string, string> = {};

    for (const item of entries) {
      hasMap[item.key] = item.hasProfile;
      cidMap[item.key] = item.cid;
    }

    this.hasProfileByAddress = hasMap;
    this.profileCidByAddress = cidMap;
  }
}
