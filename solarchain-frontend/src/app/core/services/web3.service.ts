import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { BrowserProvider, JsonRpcSigner, formatEther } from "ethers";
import { environment } from "../../../environments/environment";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
};

@Injectable({ providedIn: "root" })
export class Web3Service {
  private static readonly MANUAL_DISCONNECT_KEY = "solarchain:manual-disconnect";

  readonly account$ = new BehaviorSubject<string>("");
  readonly balance$ = new BehaviorSubject<string>("0");
  readonly chainId$ = new BehaviorSubject<number>(0);
  readonly isCorrectNetwork$ = new BehaviorSubject<boolean>(false);

  provider: BrowserProvider | null = null;
  signer: JsonRpcSigner | null = null;

  private readonly onAccountsChanged = async (...args: unknown[]) => {
    const accounts = Array.isArray(args[0]) ? (args[0] as unknown[]) : [];
    const emittedAccount = typeof accounts[0] === "string" ? accounts[0] : "";
    const account = await this.resolveActiveAccount(emittedAccount);
    this.account$.next(account);
    if (account && this.provider) {
      this.signer = await this.provider.getSigner(account);
      this.setManualDisconnected(false);
    } else {
      this.signer = null;
    }
    await this.refreshBalance();
  };

  private readonly onChainChanged = async () => {
    await this.refreshNetworkState();
  };

  constructor() {
    this.setupProvider();
  }

  get isConnected(): boolean {
    return !!this.account$.value;
  }

  get currentAccount(): string {
    return this.account$.value;
  }

  get ethereum(): EthereumProvider | null {
    if (typeof window === "undefined") {
      return null;
    }
    return (window as Window & { ethereum?: EthereumProvider }).ethereum || null;
  }

  async connectWallet(): Promise<string> {
    if (!this.ethereum) {
      throw new Error("MetaMask n'est pas detecte. Installez-le puis rechargez la page.");
    }

    this.provider = new BrowserProvider(this.ethereum);
    let accounts: string[];
    try {
      accounts = (await this.ethereum.request({ method: "eth_requestAccounts" })) as string[];
    } catch (error) {
      const maybeError = error as { code?: number; message?: string };
      if (maybeError?.code === 4001) {
        throw new Error("Connexion annulee dans MetaMask.");
      }
      throw new Error(maybeError?.message || "Echec de connexion a MetaMask.");
    }
    const account = await this.resolveActiveAccount(accounts[0] || "");
    this.signer = account ? await this.provider.getSigner(account) : null;
    this.account$.next(account);
    this.setManualDisconnected(false);

    await this.refreshNetworkState();
    return account;
  }

  async getBalance(address?: string): Promise<string> {
    const target = address || this.account$.value;
    if (!target || !this.provider) {
      return "0";
    }
    const wei = await this.provider.getBalance(target);
    return formatEther(wei);
  }

  async refreshBalance(): Promise<void> {
    const balance = await this.getBalance();
    this.balance$.next(balance);
  }

  async switchToExpectedNetwork(): Promise<void> {
    if (!this.ethereum) {
      throw new Error("MetaMask n'est pas detecte.");
    }

    const expectedChainHex = `0x${environment.chainId.toString(16)}`;

    try {
      await this.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expectedChainHex }]
      });
    } catch (error) {
      const maybeError = error as { code?: number; message?: string };
      if (maybeError?.code === 4902) {
        await this.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: expectedChainHex,
              chainName: "Hardhat Local",
              nativeCurrency: {
                name: "Ether",
                symbol: "ETH",
                decimals: 18
              },
              rpcUrls: ["http://127.0.0.1:8545"]
            }
          ]
        });
      } else {
        throw new Error(maybeError?.message || "Impossible de changer de reseau.");
      }
    }

    await this.refreshNetworkState();
  }

  async syncActiveAccountFromWallet(): Promise<string> {
    if (!this.ethereum || this.isManualDisconnected()) {
      this.account$.next("");
      this.balance$.next("0");
      this.chainId$.next(0);
      this.isCorrectNetwork$.next(false);
      this.signer = null;
      return "";
    }

    this.provider = new BrowserProvider(this.ethereum);

    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);
    this.chainId$.next(chainId);
    this.isCorrectNetwork$.next(chainId === environment.chainId);

    const accounts = (await this.ethereum.request({ method: "eth_accounts" })) as string[];
    const account = await this.resolveActiveAccount(accounts?.[0] || "");
    this.account$.next(account);
    this.signer = account ? await this.provider.getSigner(account) : null;
    await this.refreshBalance();
    return account;
  }

  private setupProvider() {
    if (!this.ethereum) {
      return;
    }

    this.provider = new BrowserProvider(this.ethereum);
    this.ethereum.on("accountsChanged", this.onAccountsChanged);
    this.ethereum.on("chainChanged", this.onChainChanged);
    if (this.isManualDisconnected()) {
      return;
    }
    this.refreshNetworkState().catch(() => undefined);
  }

  private async refreshNetworkState(): Promise<void> {
    if (!this.provider) {
      return;
    }

    if (this.isManualDisconnected()) {
      this.account$.next("");
      this.balance$.next("0");
      this.chainId$.next(0);
      this.isCorrectNetwork$.next(false);
      this.signer = null;
      return;
    }

    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);
    this.chainId$.next(chainId);
    this.isCorrectNetwork$.next(chainId === environment.chainId);

    const accounts = (await this.ethereum?.request({ method: "eth_accounts" })) as string[] | undefined;
    const account = await this.resolveActiveAccount(accounts?.[0] || "");
    this.account$.next(account);
    this.signer = account ? await this.provider.getSigner(account) : null;
    await this.refreshBalance();
  }

  private async resolveActiveAccount(fallback: string): Promise<string> {
    if (!this.provider) {
      return fallback;
    }

    try {
      const signer = await this.provider.getSigner();
      const signerAddress = await signer.getAddress();
      return signerAddress || fallback;
    } catch {
      return fallback;
    }
  }

  private isManualDisconnected(): boolean {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(Web3Service.MANUAL_DISCONNECT_KEY) === "1";
  }

  private setManualDisconnected(value: boolean): void {
    if (typeof window === "undefined") {
      return;
    }
    if (value) {
      window.localStorage.setItem(Web3Service.MANUAL_DISCONNECT_KEY, "1");
      return;
    }
    window.localStorage.removeItem(Web3Service.MANUAL_DISCONNECT_KEY);
  }

  markManualDisconnected(): void {
    this.setManualDisconnected(true);
  }
}
