import { Component } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { AsyncPipe, NgIf } from "@angular/common";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { map } from "rxjs/operators";
import { environment } from "../../../../environments/environment";
import { MeterOracleService } from "../../../core/services/meter-oracle.service";
import { Web3Service } from "../../../core/services/web3.service";

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [NgIf, AsyncPipe, RouterLink, RouterLinkActive, MatButtonModule, MatSnackBarModule],
  templateUrl: "./navbar.component.html"
})
export class NavbarComponent {
  readonly isProducer$ = new BehaviorSubject<boolean>(false);

  get account$() {
    return this.web3Service.account$;
  }

  get isCorrectNetwork$() {
    return this.web3Service.isCorrectNetwork$;
  }

  get isConnected$() {
    return this.web3Service.account$.pipe(map(account => !!account));
  }

  formatBalance(balance: string): string {
    const parsed = Number.parseFloat(balance || "0");
    if (!Number.isFinite(parsed)) {
      return "0";
    }

    return parsed.toFixed(4);
  }

  constructor(
    public readonly web3Service: Web3Service,
    private readonly meterOracleService: MeterOracleService,
    private readonly snackBar: MatSnackBar
  ) {
    this.web3Service.account$.subscribe(() => {
      this.refreshProducerRole().catch(() => undefined);
    });

    this.web3Service.chainId$.subscribe(() => {
      this.refreshProducerRole().catch(() => undefined);
    });

    this.refreshProducerRole().catch(() => undefined);
  }

  async connect() {
    try {
      const account = await this.web3Service.connectWallet();
      this.snackBar.open(`Wallet connecte: ${account.slice(0, 6)}...${account.slice(-4)}`, "OK", {
        duration: 2500,
        panelClass: ["solar-snackbar", "solar-snackbar--success"]
      });
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", {
        duration: 3500,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
    }
  }

  async switchNetwork() {
    try {
      await this.web3Service.switchToExpectedNetwork();
      this.snackBar.open("Reseau bascule avec succes", "OK", {
        duration: 2200,
        panelClass: ["solar-snackbar", "solar-snackbar--success"]
      });
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", {
        duration: 3500,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
    }
  }

  disconnect(): void {
    this.web3Service.markManualDisconnected();
    this.web3Service.account$.next("");
    this.web3Service.balance$.next("0");
    this.web3Service.chainId$.next(0);
    this.web3Service.isCorrectNetwork$.next(false);
    this.web3Service.signer = null;
    this.snackBar.open("Déconnecté", "OK", {
      duration: 2000,
      panelClass: ["solar-snackbar", "solar-snackbar--info"]
    });
  }

  private async refreshProducerRole(): Promise<void> {
    const account = this.web3Service.currentAccount;
    if (!account || !this.web3Service.isCorrectNetwork$.value) {
      this.isProducer$.next(false);
      return;
    }

    if (environment.adminAddress && account.toLowerCase() === environment.adminAddress.toLowerCase()) {
      this.isProducer$.next(false);
      return;
    }

    try {
      const isProducer = await this.meterOracleService.isProducerRegistered(account);
      this.isProducer$.next(isProducer);
    } catch {
      this.isProducer$.next(false);
    }
  }
}
