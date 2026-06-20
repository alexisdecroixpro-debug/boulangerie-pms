# Arborescence cible

Cette proposition garde le code existant stable et sert de direction pour les prochains modules. Elle peut etre appliquee progressivement, module par module, sans refonte brutale.

## Structure recommandee

```text
src/
  app/
    App.tsx
    main.tsx
    router/
    shell/
  modules/
    hygiene/
      components/
      domain/
      pages/
      data/
      exports/
      tests/
    boulangerie/
      components/
      domain/
      pages/
      data/
      tests/
    vente/
    snacking/
    patisserie/
    stock/
    gestion/
  shared/
    components/
    hooks/
    lib/
    utils/
    types/
  config/
    modules.ts
api/
  account.ts
  users.ts
  hygiene/
supabase/
  migrations/
  seed/
docs/
  ARCHITECTURE.md
  BACKLOG_ISSUES.md
```

## Migration progressive depuis l'existant

L'objectif n'est pas de deplacer tous les fichiers d'un coup. Les prochains changements peuvent suivre cet ordre:

1. Creer `src/modules/hygiene/` et y deplacer les nouveaux fichiers hygiene uniquement.
2. Garder les composants vraiment generiques dans `src/shared/components/`.
3. Laisser `src/config/modules.ts` comme registre global des modules.
4. Creer un dossier par module seulement quand une vraie fonctionnalite est implementee.
5. Isoler les exports sanitaires dans `src/modules/hygiene/exports/` quand ils grossissent.
6. Garder les regles metier dans `domain/` et les acces donnees dans `data/`.

## Frontieres conseillees

### Module hygiene

Contient les workflows PMS/HACCP, temperatures, nettoyages, ouvertures de matieres premieres, non-conformites, controles, OCR et exports sanitaires.

### Module stock

Contient les matieres premieres, fournisseurs, lots, inventaires, mouvements et alertes. Il pourra partager certaines donnees avec l'hygiene, mais ne doit pas remplacer les registres sanitaires.

### Module boulangerie

Contient recettes pain, fiches de production, petrins, pousse, blocage, rendement et previsions.

### Module vente

Contient prix, etiquettes vitrine, promotions, ventes, panier moyen et actions commerciales.

### Module snacking

Contient productions salees, DLC courtes, assemblages, etiquetage et previsions.

### Module patisserie

Contient recettes sucrees, productions, DLC internes, surgelation/decongelation et couts de revient.

### Module gestion

Contient les indicateurs transverses: marges, couts, charges, chiffre d'affaires, rentabilite par famille.

## Regles d'architecture

- Un module ne modifie pas directement l'etat interne d'un autre module.
- Les donnees partagees passent par un service ou un depot explicite.
- Les ecrans operateur restent separes des ecrans d'administration.
- Les historiques et exports sont conserves pour audit.
- Les migrations Supabase sont versionnees et documentees.
- Les tests couvrent en priorite les regles metier: OCR, lots, DLC, statuts, exports.
