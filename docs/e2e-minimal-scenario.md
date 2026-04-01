# Scenario E2E Minimal - SolarChain

## Objectif
Valider un cycle complet:
- Admin enregistre un producteur et soumet une lecture
- Producteur cree une offre
- Consommateur achete une partie de l'offre
- Historique global affiche le trade

## Prerequis
1. MetaMask installe
2. Reseau Hardhat local actif
3. Frontend lance

## Commandes de preparation

### Terminal A (node local)
```bash
cd solarchain-contracts
npm run node
```

### Terminal B (deploy + seed + export)
```bash
cd solarchain-contracts
npm run bootstrap:local
```

### Terminal C (frontend)
```bash
cd solarchain-frontend
npm run start
```

## Comptes Hardhat utiles (MetaMask)
- Admin: premier compte Hardhat (deployer)
- Producteur: deuxieme compte Hardhat
- Consommateur: troisieme compte Hardhat

## Etapes E2E

1. Home
- Ouvrir l'app
- Cliquer sur "Connecter MetaMask"
- Verifier badge wallet + reseau OK

2. Admin
- Aller sur `/admin` avec le compte admin
- Enregistrer un producteur (adresse compte #2, capacite 1000)
- Soumettre une lecture (adresse compte #2, production 300)
- Resultat attendu: producteur visible dans tableau, total mint > 0

3. Producteur
- Basculer MetaMask sur compte #2
- Aller sur `/producer`
- Verifier solde SKWH > 0
- Creer une offre (quantite 100, prix 0.001 ETH)
- Resultat attendu: offre visible dans "Mes offres actives"

4. Consommateur
- Basculer MetaMask sur compte #3
- Aller sur `/consumer`
- Selectionner l'offre en cliquant la ligne
- Acheter 20 kWh
- Resultat attendu: toast succes, offre restante decremente

5. Historique
- Aller sur `/history`
- Resultat attendu: 1 ligne de trade minimum avec producteur/consommateur corrects

## Cas d'erreur rapide a verifier
- Mauvais reseau: navbar affiche "Mauvais reseau" + bouton "Changer reseau"
- Refus MetaMask: message d'erreur explicite
- Liste vide: message UX explicite (offres/trades/producteurs)
