import { Component } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { UiStateService } from "./core/services/ui-state.service";
import { NavbarComponent } from "./shared/components/navbar/navbar.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [AsyncPipe, RouterOutlet, NavbarComponent, MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen text-slate-100">
      <app-navbar></app-navbar>
      <div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <router-outlet></router-outlet>
      </div>

      <div
        *ngIf="uiState.isTxPending$ | async"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm"
      >
        <div class="rounded-xl border border-emerald-500/40 bg-slate-900/90 p-6 text-center shadow-2xl">
          <mat-spinner diameter="44"></mat-spinner>
          <p class="mt-3 text-sm text-emerald-300">Transaction en cours de confirmation...</p>
        </div>
      </div>
    </div>
  `
})
export class AppComponent {
  constructor(public readonly uiState: UiStateService) {}
}
