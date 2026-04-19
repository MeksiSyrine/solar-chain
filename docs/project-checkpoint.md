# SolarChain - Checkpoint Projet

## 1. Description du projet
SolarChain est une dApp de marche local d'energie solaire.
Le projet permet de tokeniser des kWh (SKWH), publier des offres de vente, acheter de l'energie, emettre un certificat d'achat et noter les producteurs on-chain.

Architecture:
- Backend blockchain: smart contracts Solidity (Hardhat)
- Frontend: Angular 20 standalone + Angular Material + Tailwind
- Wallet: MetaMask (reseau Hardhat Local, chainId 31337)

## 2. Fonctionnalites principales
- Gestion des producteurs (enregistrement, capacite, lectures)
- Mint de tokens SKWH a partir des lectures compteurs
- Creation d'offres de vente d'energie
- Achat d'energie par les consommateurs
- Emission de certificat NFT d'energie verte apres achat
- Reputation on-chain des producteurs (1 a 5 etoiles)
- Annulation d'offres actives par leur proprietaire
- Historique global des trades
- Gestion de la connexion wallet, du role et du reseau

## 3. Roles et permissions
### Admin
Droits:
- Acces a la page Admin
- Enregistrer un producteur
- Soumettre une lecture producteur

Restrictions:
- Ne passe pas automatiquement le role Producteur (sauf s'il est aussi enregistre on-chain)

### Producteur
Droits:
- Acces a la page Producteur (si enregistre on-chain)
- Consulter son solde SKWH
- Creer et annuler ses offres
- Acces a Consommateur et Historique (wallet connecte)

Restrictions:
- Pas d'acces Admin si l'adresse n'est pas admin

### Consommateur
Droits:
- Acces a la page Consommateur
- Acheter de l'energie depuis les offres actives
- Noter un producteur apres achat (1 fois par trade)
- Acces a Historique

Restrictions:
- Pas d'acces Admin
- Pas d'acces Producteur s'il n'est pas enregistre comme producteur

## 4. Regles de controle d'acces (guards)
- Wallet guard: bloque les routes protegees si wallet non connecte
- Network check: bloque les routes protegees si reseau != 31337
- Role guard:
  - Admin: egal a adminAddress
  - Producteur: verifie on-chain via MeterOracle.isProducerRegistered
  - Consommateur: autorise pour wallet connecte

Regles reputation on-chain:
- Un trade doit etre enregistre par EnergyMarket avant notation
- Seul le consumer du trade peut soumettre la note
- Une seule note par trade
- Score autorise: 1 a 5
- Moyenne producteur calculee on-chain

## 5. Etapes de lancement (ordre obligatoire)
### Terminal A - Lancer le node Hardhat
cd solarchain-contracts
npm run node

### Terminal B - Deploiement + seed + export
cd solarchain-contracts
npm run bootstrap:local

### Terminal C - Lancer le frontend
cd solarchain-frontend
npm install
npm run start

Important:
- Si le node Hardhat est redemarre, relancer npm run bootstrap:local
- Sinon le frontend peut pointer vers des adresses sans contrat actif

## 6. Verification rapide
### Contrats
cd solarchain-contracts
npm run compile
npm test

### Frontend
cd solarchain-frontend
npm run build

## 7. Scenario de validation recommande
1. Admin enregistre un producteur
2. Admin soumet une lecture
3. Producteur cree une offre
4. Consommateur achete une quantite
5. Consommateur note le producteur
6. Historique affiche le trade et la reputation

References:
- docs/e2e-minimal-scenario.md
- docs/final-recipe-checklist.md
