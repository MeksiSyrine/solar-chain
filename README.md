# SolarChain

Monorepo du projet SolarChain:
- `solarchain-contracts`: smart contracts Solidity (Hardhat)
- `solarchain-frontend`: application Angular 20 standalone

## Setup rapide

### Contracts

```bash
cd solarchain-contracts
npm install
npm run node
```

Dans un second terminal:

```bash
cd solarchain-contracts
npm run deploy:local
```

### Phase 4 - Deploiement local complet

Ordre recommande dans 2 terminaux:

1) Terminal A (laisser tourner le noeud local)

```bash
cd solarchain-contracts
npm run node
```

2) Terminal B (pipeline complet)

```bash
cd solarchain-contracts
npm run compile
npm run deploy:local
npm run configure:local
npm run seed:local
npm run export:local
```

Commande unique (equivalent):

```bash
cd solarchain-contracts
npm run bootstrap:local
```

Ce que ca produit:
- adresses des contrats dans `solarchain-contracts/deployments/localhost.json`
- ABIs frontend mises a jour dans `solarchain-frontend/src/assets/contracts/*.json`
- environnement frontend mis a jour dans:
	- `solarchain-frontend/src/environments/environment.ts`
	- `solarchain-frontend/src/environments/environment.prod.ts`

### Frontend

```bash
cd solarchain-frontend
npm install
npm run start
```

## Verification rapide

Contracts:

```bash
cd solarchain-contracts
npm run compile
npm test
```

Frontend:

```bash
cd solarchain-frontend
npm run build
```

## Phase 5 - Frontend Angular (UI + Web3)

Ce qui est implante:
- navigation complete (Home, Admin, Producteur, Consommateur, Historique)
- connexion MetaMask via `Web3Service`
- guards de connexion wallet et role
- dashboards avec formulaires Angular Material
- lecture des offres, creation/annulation d'offres, achat energie
- historique global filtrable

### Commandes necessaires

1) Lancer le noeud local Hardhat (Terminal A)

```bash
cd solarchain-contracts
npm run node
```

2) Deployer + configurer + seed + exporter les ABIs/adresses (Terminal B)

```bash
cd solarchain-contracts
npm run bootstrap:local
```

3) Lancer le frontend (Terminal C)

```bash
cd solarchain-frontend
npm install
npm run start
```

4) Verification build frontend

```bash
cd solarchain-frontend
npm run build
```

### Utilisation rapide

- Ouvrir l'application Angular
- Cliquer sur `Connecter MetaMask`
- Tester les dashboards selon le compte MetaMask selectionne
- Consulter l'historique global des trades dans la vue History

## Phase 6 - Integration Web3 avancee

Ajouts realises:
- spinner global pendant `tx.wait()` pour toutes les transactions
- refresh automatique du solde ETH apres transactions
- `RoleGuard` producteur verifie on-chain via `MeterOracle.isProducerRegistered`
- detection du mauvais reseau MetaMask + bouton de bascule vers le reseau attendu
- gestion explicite de l'annulation utilisateur (code 4001 MetaMask)

Commandes de validation:

```bash
cd solarchain-frontend
npm run build
```

## Troubleshooting rapide

Si `npm run node` echoue depuis la mauvaise racine, utiliser:

```bash
npm --prefix "D:\TPs\ICE4\blockchain\solarchain\solarchain-contracts" run node
```

## Validation finale

- Scenario E2E minimal: `docs/e2e-minimal-scenario.md`
- Checklist de recette finale: `docs/final-recipe-checklist.md`


Ordre de lancement correct (obligatoire)

Terminal A: démarrer node Hardhat et le laisser ouvert.
cd D:\TPs\ICE4\blockchain\solarchain\solarchain-contracts
npm run node
Terminal B: bootstrap sur ce même node actif.
cd D:\TPs\ICE4\blockchain\solarchain\solarchain-contracts
npm run bootstrap:local
Terminal C: frontend.
cd D:\TPs\ICE4\blockchain\solarchain\solarchain-frontend
npm start