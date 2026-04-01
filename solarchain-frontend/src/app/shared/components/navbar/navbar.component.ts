import { Component } from "@angular/core";
import { AsyncPipe, NgIf } from "@angular/common";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { map } from "rxjs/operators";
import { Web3Service } from "../../../core/services/web3.service";
import { WalletBadgeComponent } from "../wallet-badge/wallet-badge.component";

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [NgIf, AsyncPipe, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatSnackBarModule, WalletBadgeComponent],
  templateUrl: "./navbar.component.html"
})
export class NavbarComponent {
  get account$() {
    return this.web3Service.account$;
  }

  get isCorrectNetwork$() {
    return this.web3Service.isCorrectNetwork$;
  }

  get isConnected$() {
    return this.web3Service.account$.pipe(map(account => !!account));
  }

  constructor(
    public readonly web3Service: Web3Service,
    private readonly snackBar: MatSnackBar
  ) {}

  async connect() {
    try {
      const account = await this.web3Service.connectWallet();
      this.snackBar.open(`Wallet connecte: ${account.slice(0, 6)}...${account.slice(-4)}`, "OK", {
        duration: 2500
      });
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", { duration: 3500 });
    }
  }

  async switchNetwork() {
    try {
      await this.web3Service.switchToExpectedNetwork();
      this.snackBar.open("Reseau bascule avec succes", "OK", { duration: 2200 });
    } catch (error) {
      this.snackBar.open((error as Error).message, "Fermer", { duration: 3500 });
    }
  }

  disconnect(): void {
    this.web3Service.markManualDisconnected();
    this.web3Service.account$.next("");
    this.web3Service.balance$.next("0");
    this.web3Service.chainId$.next(0);
    this.web3Service.isCorrectNetwork$.next(false);
    this.web3Service.signer = null;
    this.snackBar.open("Déconnecté", "OK", { duration: 2000 });
  }
}
