import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateFn, Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { Web3Service } from "../services/web3.service";
import { UserRole } from "../models/role.model";
import { MeterOracleService } from "../services/meter-oracle.service";

function hasRole(account: string, role: UserRole): boolean {
  if (!account) {
    return false;
  }

  if (role === "consumer") {
    return true;
  }

  if (role === "admin") {
    return !!environment.adminAddress && account.toLowerCase() === environment.adminAddress.toLowerCase();
  }

  return account.toLowerCase() !== environment.adminAddress.toLowerCase();
}

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const web3Service = inject(Web3Service);
  const meterOracleService = inject(MeterOracleService);
  const router = inject(Router);

  const requiredRole = (route.data["role"] || "consumer") as UserRole;

  return web3Service
    .syncActiveAccountFromWallet()
    .then((account) => {
      if (!web3Service.isCorrectNetwork$.value) {
        return router.createUrlTree(["/"], {
          queryParams: {
            denied: "network",
            reason: "Mauvais reseau detecte. Basculez sur le reseau Hardhat local avant d'acceder a cette page."
          }
        });
      }

      if (requiredRole === "producer") {
        return meterOracleService
          .isProducerRegistered(account)
          .then((isRegistered) =>
            isRegistered
              ? true
              : router.createUrlTree(["/"], {
                  queryParams: {
                    denied: "role",
                    reason: "Votre adresse n'est pas enregistree comme producteur sur la blockchain."
                  }
                })
          );
      }

      const allowed = hasRole(account, requiredRole);
      return allowed
        ? true
        : router.createUrlTree(["/"], {
            queryParams: {
              denied: "role",
              reason:
                requiredRole === "admin"
                  ? "Cette page est reservee a l'admin configure dans environment.ts."
                  : "Acces refuse pour ce role."
            }
          });
    })
    .catch(() =>
      router.createUrlTree(["/"], {
        queryParams: {
          denied: "role",
          reason: "Verification du role impossible. Verifiez le reseau et les contrats."
        }
      })
    );
};
