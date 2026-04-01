# Checklist Finale de Recette - SolarChain

## A. Build et tests
- [ ] `cd solarchain-contracts && npm run compile`
- [ ] `cd solarchain-contracts && npm test`
- [ ] `cd solarchain-frontend && npm run build`

## B. Deploiement local
- [ ] Node Hardhat actif (`npm run node`)
- [ ] Deploiement OK (`npm run deploy:local`)
- [ ] Configuration OK (`npm run configure:local`)
- [ ] Seed OK (`npm run seed:local`)
- [ ] Export ABIs/env OK (`npm run export:local`)

## C. Contrats / donnees
- [ ] `deployments/localhost.json` present et coherent
- [ ] `src/assets/contracts/*.json` presents cote frontend
- [ ] `src/environments/environment.ts` contient addresses + adminAddress

## D. UX Wallet / reseau
- [ ] Connexion MetaMask fonctionne
- [ ] Changement compte pris en charge
- [ ] Mauvais reseau detecte
- [ ] Bouton "Changer reseau" fonctionne
- [ ] Refus utilisateur MetaMask affiche un message clair

## E. Flux metier
- [ ] Admin enregistre producteur
- [ ] Admin soumet lecture
- [ ] Producteur cree offre
- [ ] Consommateur achete energie
- [ ] Producteur annule offre
- [ ] Historique global affiche les trades

## F. Etats vides et erreurs UX
- [ ] Admin: message "aucun producteur"
- [ ] Producteur: message "aucune offre active"
- [ ] Consommateur: message "aucune offre disponible"
- [ ] Historique: message "aucun trade" ou "aucun resultat filtre"
- [ ] Erreurs RPC/MetaMask remontees en message utilisateur

## G. Ready to demo
- [ ] Parcours E2E minimal valide (voir `docs/e2e-minimal-scenario.md`)
- [ ] Aucun blocage critique restant
- [ ] README a jour
