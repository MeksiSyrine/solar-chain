import { Component, inject } from "@angular/core";
import { AsyncPipe, DecimalPipe } from "@angular/common";
import { map } from "rxjs";
import { Web3Service } from "../../../core/services/web3.service";

@Component({
  selector: "app-wallet-badge",
  standalone: true,
  imports: [AsyncPipe, DecimalPipe],
  template: `
    <div class="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
      <ng-container *ngIf="(accountLabel$ | async) as label; else notConnected">
        <span>{{ label }}</span>
        <span class="ml-2 text-amber-300">{{ (web3Service.balance$ | async) | number: '1.2-4' }} ETH</span>
      </ng-container>
      <ng-template #notConnected>Non connecte</ng-template>
    </div>
  `
})
export class WalletBadgeComponent {
  readonly web3Service = inject(Web3Service);

  readonly accountLabel$ = this.web3Service.account$.pipe(
    map((account) => (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ""))
  );
}
