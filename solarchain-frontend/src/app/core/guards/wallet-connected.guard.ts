import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { Web3Service } from "../services/web3.service";

export const walletConnectedGuard: CanActivateFn = () => {
  const web3Service = inject(Web3Service);
  const router = inject(Router);

  return web3Service.syncActiveAccountFromWallet().then((account) => {
    if (!account) {
      return router.createUrlTree(["/"], {
        queryParams: {
          denied: "wallet",
          reason: "Connectez votre wallet MetaMask pour acceder a cette page."
        }
      });
    }

    if (!web3Service.isCorrectNetwork$.value) {
      return router.createUrlTree(["/"], {
        queryParams: {
          denied: "network",
          reason: "Mauvais reseau detecte. Basculez sur le reseau Hardhat local avant d'acceder a cette page."
        }
      });
    }

    return true;
  });
};
