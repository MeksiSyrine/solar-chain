# SolarChain

Monorepo du projet SolarChain:
- `solarchain-contracts`: smart contracts Solidity (Hardhat)
- `solarchain-frontend`: application Angular 20 standalone

Contrats principaux deployes en local:
- EnergyToken (SKWH)
- MeterOracle
- EnergyMarket
- EnergyCertificate (certificats NFT non transferables)
- ReputationSystem (notation on-chain des producteurs)
- ProducerProfile (CID IPFS des profils producteurs)

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

## Phase 7 - Reputation on-chain des producteurs

Ajouts realises:
- Nouveau contrat `ReputationSystem.sol`
- Enregistrement automatique du trade apres `buyEnergy` via `EnergyMarket`
- Notation 1 a 5 etoiles par le consommateur, une seule fois par trade
- Verifications on-chain strictes:
	- seul le vrai acheteur du trade peut noter
	- notation impossible si trade non enregistre
	- notation impossible en double pour un meme trade
- Calcul de la moyenne on-chain (sur 100, ex 4.75 = 475)
- Export ABI + adresse du contrat de reputation vers le frontend

Frontend reputation:
- Service `reputation.service.ts`
- Composant reutilisable `star-rating`
- Composant `producer-reputation` (moyenne + nombre d'avis)
- Integration dans la page Consommateur:
	- reputation visible sur les offres
	- panel de notation post-achat
	- section Mes achats avec action Noter
- Integration dans la page Historique:
	- colonne Reputation dans le tableau
	- bouton Noter si applicable
	- carte Producteur le mieux note

Commandes de validation reputation:

```bash
cd solarchain-contracts
npm run compile
npm test
npm run bootstrap:local

cd ../solarchain-frontend
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
- Checkpoint projet (description, roles, permissions, lancement): `docs/project-checkpoint.md`

Scenario reputation recommande:
1. Producteur publie une offre
2. Consommateur achete une offre
3. Consommateur soumet une note 1-5
4. Verifier la mise a jour de la moyenne dans Consommateur et Historique
5. Verifier qu'une seconde note sur le meme trade est refusee

## Phase 8 - Profils Producteurs sur IPFS (Pinata)

Ajouts realises:
- Nouveau contrat `ProducerProfile.sol` (stockage on-chain du CID IPFS)
- Tests dedies `ProducerProfile.test.ts`
- Deploiement/exports mis a jour:
	- `deploy.ts` deploie ProducerProfile
	- `configure.ts` journalise l'adresse (pas de wiring requis)
	- `export-artifacts.ts` exporte `ProducerProfile.json` + adresse frontend
- Configuration Pinata frontend:
	- `src/environments/pinata.config.ts`
	- variables `NG_APP_PINATA_*` via `.env` frontend
- Services frontend:
	- `ipfs.service.ts` (upload image/JSON, fetch gateway + fallback, cache)
	- `producer-profile.service.ts` (bridge contrat + IPFS)
- Nouvelle page producteur:
	- route protegee `/producer/profile`
	- creation/edition/suppression profil
	- upload image drag & drop
	- etapes visibles: upload image, upload profil, transaction
- Composant reutilisable:
	- `app-producer-card` (mode compact/full, fallback avatar, reputation)
- Integrations UI:
	- Consumer: card producteur + modal "Voir le profil complet"
	- Admin: card producteur + colonne "Profil IPFS" (badge + lien CID)
	- Navbar: lien "Mon Profil" visible pour les producteurs

### Variables d'environnement Pinata (frontend)

Dans `solarchain-frontend/.env`:

```bash
NG_APP_PINATA_API_KEY=
NG_APP_PINATA_API_SECRET=
NG_APP_PINATA_JWT=
```

Important:
- utiliser le JWT Pinata pour l'authentification API
- ne pas commiter de token reel dans un fichier versionne

### Commandes de validation Phase 8

```bash
cd solarchain-contracts
npm run compile
npm test
npm run bootstrap:local

cd ../solarchain-frontend
npm run build
```

### Scenario rapide profils IPFS

1. Connecter un wallet producteur enregistre
2. Ouvrir `/producer/profile`
3. Creer le profil (photo + infos)
4. Sauvegarder et confirmer la transaction
5. Verifier l'affichage du profil dans Consumer et Admin
6. Verifier le lien CID depuis le dashboard Admin


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