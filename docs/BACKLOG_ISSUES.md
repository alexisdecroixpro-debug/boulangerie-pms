# Backlog propose sous forme d'issues GitHub

Ces issues sont pretes a etre creees dans GitHub. Elles sont volontairement decoupees par valeur metier pour pouvoir avancer progressivement sans modifier la logique existante sans validation.

## Labels suggeres

- `module:hygiene`
- `module:boulangerie`
- `module:vente`
- `module:snacking`
- `module:patisserie`
- `module:stock`
- `module:gestion`
- `feature:ocr`
- `feature:export`
- `tech:architecture`
- `priority:high`
- `priority:medium`
- `priority:low`

## Issues

### 1. Stabiliser la documentation projet et les consignes de contribution

Labels: `tech:architecture`, `priority:high`

Objectif:
Mettre a jour la documentation pour expliquer comment lancer, tester, structurer et deployer l'application.

Criteres d'acceptation:
- Le README explique l'installation, le lancement local et les commandes de verification.
- L'arborescence cible est documentee.
- Les principes de non-regression metier sont explicites.

### 2. Creer une branche `dev` comme branche d'integration

Labels: `tech:architecture`, `priority:high`

Objectif:
Utiliser `dev` pour integrer les travaux avant fusion vers la branche principale.

Criteres d'acceptation:
- La branche `dev` existe sur GitHub.
- Les futures branches de fonctionnalite partent de `dev`.
- La protection de branche est definie si necessaire.

### 3. Isoler progressivement le module hygiene dans `src/modules/hygiene`

Labels: `module:hygiene`, `tech:architecture`, `priority:medium`

Objectif:
Preparer l'architecture modulaire sans changer le comportement actuel.

Criteres d'acceptation:
- Les nouveaux fichiers hygiene sont places dans un dossier module dedie.
- Les fichiers existants ne sont deplaces qu'avec tests et verification.
- Le module reste utilisable sur tablette.

### 4. Renforcer les exports sanitaires PDF/Excel

Labels: `module:hygiene`, `feature:export`, `priority:high`

Objectif:
Produire des exports propres pour controles sanitaires: temperatures, nettoyages, ouvertures, non-conformites et actions correctives.

Criteres d'acceptation:
- Filtrage par periode.
- Export PDF lisible pour impression.
- Export Excel ou CSV exploitable pour suivi interne.
- Nom de l'operateur et date d'export visibles.

### 5. Finaliser le parcours OCR etiquette matiere premiere

Labels: `module:hygiene`, `feature:ocr`, `priority:high`

Objectif:
Ameliorer la capture OCR tout en gardant la validation humaine obligatoire.

Criteres d'acceptation:
- Aucune donnee n'est enregistree sans validation explicite.
- Les champs incertains sont visibles.
- Les corrections validees alimentent l'apprentissage applicatif.
- Les lots et DLC/DDM restent a confirmer a chaque ouverture.

### 6. Creer le socle du module stock

Labels: `module:stock`, `priority:high`

Objectif:
Gerer matieres premieres, fournisseurs, lots, mouvements et inventaires.

Criteres d'acceptation:
- Fiche matiere premiere.
- Fiche fournisseur.
- Entree/sortie de stock.
- Historique des mouvements.
- Alertes stock bas.

### 7. Creer le socle du module boulangerie

Labels: `module:boulangerie`, `priority:medium`

Objectif:
Demarrer les recettes pain, fiches de production et calculs de petrin.

Criteres d'acceptation:
- Fiche recette.
- Calcul de quantites selon production cible.
- Fiche de production imprimable/exportable.
- Historique de production.

### 8. Creer le socle du module vente

Labels: `module:vente`, `priority:medium`

Objectif:
Suivre prix, produits du jour, promotions et indicateurs commerciaux simples.

Criteres d'acceptation:
- Catalogue produit vendable.
- Prix de vente.
- Produits du jour.
- Export ou synthese des ventes.

### 9. Creer le socle du module snacking

Labels: `module:snacking`, `priority:medium`

Objectif:
Suivre les productions salees avec DLC courtes et tracabilite adaptee.

Criteres d'acceptation:
- Fiches produits snacking.
- Production du jour.
- DLC courte visible.
- Lien avec matieres premieres/lots si disponible.

### 10. Creer le socle du module patisserie

Labels: `module:patisserie`, `priority:medium`

Objectif:
Gerer recettes, productions, DLC internes et couts des creations sucrees.

Criteres d'acceptation:
- Fiche recette patisserie.
- Fiche production.
- DLC interne.
- Couts de revient de base.

### 11. Creer les tableaux de bord gestion

Labels: `module:gestion`, `priority:low`

Objectif:
Centraliser marges, couts, chiffre d'affaires et rentabilite par famille.

Criteres d'acceptation:
- Indicateurs synthetiques.
- Filtres par periode.
- Vue par famille produit.
- Export de synthese.

### 12. Mettre en place les tests de non-regression metier

Labels: `tech:architecture`, `priority:high`

Objectif:
Protegre les regles sensibles avant d'ajouter les modules.

Criteres d'acceptation:
- Tests OCR et validation.
- Tests de generation de lots.
- Tests de statuts nettoyage.
- Tests des exports critiques.
