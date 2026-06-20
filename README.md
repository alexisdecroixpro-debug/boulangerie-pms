# Application de gestion de boulangerie

Application web modulaire pour piloter progressivement les activites d'une boulangerie: hygiene/PMS, production, vente, snacking, patisserie, stock, gestion, OCR d'etiquettes et exports de controle.

## Etat actuel

- Frontend React + Vite + TypeScript.
- Module hygiene disponible.
- OCR d'etiquettes matieres premieres cote navigateur avec validation humaine obligatoire.
- Stockage local hors-ligne et synchronisation Supabase.
- Exports CSV/PDF pour les registres et controles.
- Modules boulangerie, vente, snacking, patisserie, stock et gestion prepares dans la navigation, a developper par etapes.

## Modules prevus

| Module | Objectif | Statut |
| --- | --- | --- |
| Hygiene | PMS, HACCP, tracabilite, temperatures, nettoyages, non-conformites, registres | Disponible |
| Boulangerie | Recettes pain, petrins, fournils, pousse, previsions de production | En developpement |
| Vente | Prix, vitrine, promotions, ventes, indicateurs commerciaux | A venir |
| Snacking | Production salee, DLC courtes, etiquettes, previsions | A venir |
| Patisserie | Recettes, productions, DLC internes, couts de revient | A venir |
| Stock | Matieres premieres, fournisseurs, lots, mouvements, inventaires | A venir |
| Gestion | Couts, marges, charges, CA, rentabilite | A venir |

## Lancer le projet localement

Prerequis:

- Node.js 20 ou plus recent.
- npm.
- Un projet Supabase si la synchronisation distante est activee.

Installation:

```powershell
npm install
```

Configuration:

```powershell
Copy-Item .env.example .env.local
```

Puis renseigner les variables Vite/Supabase dans `.env.local` selon l'environnement cible.

Demarrage:

```powershell
npm run dev
```

Verification:

```powershell
npm test
npm run lint
npm run build
```

## Organisation actuelle

```text
api/                 Fonctions API serveur pour compte, utilisateurs, OCR historique
public/              Icones PWA et assets publics
scripts/             Scripts d'administration locale
src/
  components/        Composants reutilisables
  config/            Declaration des modules metier
  data/              Stockage local et acces Supabase
  domain/            Regles metier et types
  hooks/             Hooks React applicatifs
  lib/               Clients techniques partages
  pages/             Ecrans et parcours utilisateur
  utils/             Exports, OCR image, pieces jointes, filtres
supabase/            Documentation et migrations SQL
docs/                Documentation projet et backlog
```

## Principes de developpement

- Ne jamais enregistrer une donnee OCR sans validation humaine.
- Conserver l'historique des donnees utiles au controle sanitaire.
- Preferer l'archivage ou le statut a la suppression definitive.
- Garder les parcours employes simples, lisibles et utilisables sur tablette.
- Separarer les ecrans operateur, les vues administrateur et les historiques/export.
- Ajouter les modules progressivement sans casser le module hygiene existant.

## Documentation projet

- [Arborescence cible](docs/ARCHITECTURE.md)
- [Backlog propose sous forme d'issues GitHub](docs/BACKLOG_ISSUES.md)
