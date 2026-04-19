import { Routes } from "@angular/router";
import { roleGuard } from "./core/guards/role.guard";
import { walletConnectedGuard } from "./core/guards/wallet-connected.guard";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./pages/home/home.page").then((m) => m.HomePage)
  },
  {
    path: "admin",
    canActivate: [walletConnectedGuard, roleGuard],
    data: { role: "admin" },
    loadComponent: () => import("./pages/admin/admin.page").then((m) => m.AdminPage)
  },
  {
    path: "producer",
    canActivate: [walletConnectedGuard, roleGuard],
    data: { role: "producer" },
    loadComponent: () => import("./pages/producer/producer.page").then((m) => m.ProducerPage)
  },
  {
    path: "consumer",
    canActivate: [walletConnectedGuard, roleGuard],
    data: { role: "consumer" },
    loadComponent: () => import("./pages/consumer/consumer.page").then((m) => m.ConsumerPage)
  },
  {
    path: "history",
    canActivate: [walletConnectedGuard],
    loadComponent: () => import("./pages/history/history.page").then((m) => m.HistoryPage)
  },
  {
    path: "certificates",
    canActivate: [walletConnectedGuard],
    loadComponent: () =>
      import("./pages/certificates/certificates.component").then((m) => m.CertificatesComponent)
  },
  {
    path: "**",
    redirectTo: ""
  }
];
