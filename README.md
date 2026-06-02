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

### Deploiement local complet

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



