# Lot 7 bis — Recette de validation opérationnelle

> **Mode d'emploi.** Ouvre ce document, coche chaque case dans l'ordre. Si UN seul point critique ❌ échoue → **NO-GO**. Pas de "presque bon". Temps total : 5 à 10 min hors session longue.

---

## 0. Préparation (1 min)

- [ ] Ouvrir une **fenêtre de navigation privée** (Chrome/Firefox) — aucune session résiduelle.
- [ ] DevTools ouverts, onglet **Console** visible (repérer les erreurs rouges au vol).
- [ ] DevTools onglet **Network** filtré sur `/api/v1` (voir les 401 en direct).
- [ ] Ouvrir l'URL cible (staging / prod selon contexte de recette).
- [ ] Se connecter avec un **compte admin valide** (ex. `admin@iox.mch` / mot de passe connu). Voir `docs/ops/SMOKE-AUTH.md` pour les creds de smoke.
- [ ] Hard refresh une fois arrivé sur `/dashboard` (`Cmd+Shift+R` / `Ctrl+Shift+R`).

---

## 1. Session / login (1 min)

Après la connexion, on reste sur `/dashboard` 30 secondes sans rien toucher.

- [ ] Arrivée sur `/dashboard` sans passage par `/login` en boucle.
- [ ] Les stats du dashboard s'affichent (chiffres, cards).
- [ ] Aucun toast rouge.
- [ ] Aucun message `Unauthorized`, `HTTP 401`, `Impossible de charger…`.
- [ ] Aucun écran blanc.
- [ ] Console : **0 erreur rouge** (warnings hydratation tolérés).

**NO-GO si** : retour intempestif `/login`, toast rouge, shell vide, 401 visible dans Network hors refresh légitime.

---

## 2. Top navigation (niveau 1) — 1 min

Cliquer chaque rubrique **dans cet ordre** depuis `/dashboard` :

| # | Clic | URL attendue | Actif visuellement |
|---|------|--------------|-------------------|
| 1 | Accueil | `/dashboard` | ✅ |
| 2 | Référentiel | `/referentiel` | ✅ |
| 3 | Production | `/production` | ✅ |
| 4 | Marketplace | `/marketplace-hub` | ✅ |
| 5 | Distribution | `/distribution` | ✅ |
| 6 | Administration | `/admin` | ✅ |

Pour CHAQUE clic :

- [ ] La page cible s'ouvre immédiatement (pas d'écran blanc de +1 s).
- [ ] L'état actif est **visuellement clair** dans la top nav (accent cyan/violet).
- [ ] Aucune erreur rouge Console ou Network.

Après les 6 clics :

- [ ] Cliquer le **logo** → retour sur `/dashboard`.
- [ ] Cliquer la **cloche alertes** → le dropdown s'ouvre.
- [ ] Cliquer l'**avatar** → ouvre `/profile`.
- [ ] Aucun chevauchement visuel dans la topbar (logo / nav / actions ne se marchent pas dessus).

**NO-GO si** : une section charge une autre route, l'état actif est faux, la topbar casse le layout, un clic produit une erreur rouge.

---

## 3. Sidebar contextuelle (niveau 2) — 1 min

Vérifier que la **sidebar change** quand on change de section.

### Référentiel — doit afficher **uniquement** :
- [ ] Bénéficiaires
- [ ] Produits
- [ ] Entreprises
- [ ] Contrats appro

### Production — doit afficher **uniquement** :
- [ ] Lots entrants
- [ ] Transformations
- [ ] Lots finis
- [ ] Étiquetage
- [ ] Traçabilité
- [ ] Mise en marché

### Marketplace — doit afficher **uniquement** :
- [ ] Cockpit vendeur
- [ ] Demandes de devis
- [ ] Documents marketplace

### Distribution — doit afficher **uniquement** :
- [ ] Distributions
- [ ] Incidents
- [ ] Documents

### Administration — doit afficher **uniquement** :
- [ ] Utilisateurs
- [ ] Rattachements / Memberships
- [ ] Vendeurs
- [ ] File de revue
- [ ] RFQ admin
- [ ] Diagnostics
- [ ] Journal d'audit

Vérifications transverses :

- [ ] Le **libellé de section** affiché en haut de sidebar correspond à la section active.
- [ ] L'**item actif** dans la sidebar correspond à la page courante.
- [ ] Aucun item d'une autre section n'apparaît "par erreur" dans la sidebar courante.

**NO-GO si** : sidebar figée sur une autre section après changement, item actif faux, rubriques mélangées.

---

## 4. Landings de rubrique (niveau 3) — 2 min

Pour chaque landing : ouvrir, cocher les 4 points, revenir, puis passer à la suivante.

### `/referentiel`
- [ ] Page charge sans erreur.
- [ ] Cards d'accès rapide présentes (≥ 3 cards).
- [ ] Libellés et descriptions lisibles (pas de `undefined`, pas de key React).
- [ ] Cliquer UNE card → atterrit sur la bonne page. Revenir.

### `/production`
- [ ] Page charge sans erreur.
- [ ] Cards présentes (lots entrants, transformations, lots finis, étiquetage, traçabilité, mise en marché).
- [ ] Cliquer UNE card → bonne destination. Revenir.

### `/marketplace-hub`
- [ ] Page charge sans erreur.
- [ ] Cards présentes (cockpit vendeur, demandes de devis, documents).
- [ ] Cliquer UNE card → bonne destination. Revenir.

### `/distribution`
- [ ] Page charge sans erreur.
- [ ] Cards présentes (distributions, incidents, documents).
- [ ] Cliquer UNE card → bonne destination. Revenir.

### `/admin`
- [ ] Page charge sans erreur.
- [ ] Cards présentes (utilisateurs, memberships, vendeurs, file de revue, RFQ, diagnostics, audit).
- [ ] Cliquer UNE card → bonne destination. Revenir.

**NO-GO si** : une card renvoie au mauvais écran, une landing affiche une erreur, cards non cliquables, descriptions incohérentes.

---

## 5. Parcours métier rapides (3 min)

Pour chaque URL ci-dessous : ouvrir, attendre le chargement, cocher "données chargées OU liste vide explicite" (pas d'erreur rouge).

### Référentiel
- [ ] `/beneficiaries`
- [ ] `/products`
- [ ] `/companies`

### Production
- [ ] `/inbound-batches`
- [ ] `/product-batches`
- [ ] `/traceability`
- [ ] `/label-validations`

### Marketplace
- [ ] `/seller/dashboard`
- [ ] `/quote-requests`
- [ ] `/seller/documents`

### Distribution
- [ ] `/distributions`
- [ ] `/incidents`
- [ ] `/documents`

### Administration
- [ ] `/admin/users`
- [ ] `/admin/review-queue`
- [ ] `/admin/rfq`
- [ ] `/admin/diagnostics`

Pour CHAQUE URL :
- [ ] Aucun toast rouge / message `401` / `Unauthorized` / `Impossible de charger`.
- [ ] Aucune page blanche persistante (>2 s).
- [ ] Top nav + sidebar restent cohérentes avec la section.
- [ ] Pas de redirection involontaire vers `/dashboard` ou `/login`.

**NO-GO si** : un parcours charge le shell mais laisse une erreur rouge sur les données.

---

## 6. Session longue (test critique refresh) — 18 min

Objectif : reproduire le problème réel qui a fait sauter Lot 7 en prod.

- [ ] Noter l'heure de connexion : __________
- [ ] **Laisser l'onglet ouvert 16 à 20 minutes SANS naviguer** (le JWT expire à 15 min).
- [ ] Au retour, cliquer dans cet ordre :
  - [ ] `/dashboard`
  - [ ] `/admin`
  - [ ] `/distributions`
  - [ ] `/incidents`
  - [ ] `/label-validations`

Résultat attendu (UN des deux) :

**Scénario A — refresh transparent** (Lot 8 actif) :
- [ ] Les pages chargent normalement.
- [ ] Dans Network : on voit un `POST /api/v1/auth/refresh` → 200, puis les requêtes métier qui réussissent.
- [ ] L'utilisateur n'a RIEN vu du refresh.

**Scénario B — redirection login propre** (refresh token lui-même expiré ou absent) :
- [ ] Redirection immédiate vers `/login?redirect=<page>`.
- [ ] Après re-login, retour sur la page initialement demandée.

**NO-GO si** :
- Shell chargé avec toasts rouges partout et utilisateur coincé.
- Boucle de redirections `/login` ↔ `/dashboard`.
- Multiples `POST /auth/refresh` d'affilée (plus d'UN par vague — indique que le singleton promise est cassé).

---

## 7. Mobile / tablette (1 min)

Dans DevTools → Toggle device toolbar (`Cmd+Shift+M`). Tester deux largeurs.

### Largeur ~390 px (iPhone)
- [ ] La top nav principale est **cachée** (remplacée par le hamburger).
- [ ] Le bouton **hamburger** est visible en haut à gauche.
- [ ] Clic hamburger → le drawer s'ouvre (animation de gauche).
- [ ] Le drawer liste **toutes les sections** regroupées.
- [ ] Clic sur un item → la page charge ET le drawer se ferme.
- [ ] Aucun overlay fantôme ne bloque les clics après fermeture.
- [ ] Aucun scroll horizontal sur la page (debug : inspecter `body` width).

### Largeur ~768 px (iPad)
- [ ] Comportement identique à ~390 px (top nav cachée, drawer OK).
- [ ] OU : top nav visible avec items compactés — mais cohérent, pas tronqué.

**NO-GO si** : hamburger ne s'ouvre pas, overlay bloque les clics, drawer mène à la mauvaise page, scroll horizontal absurde.

---

## 8. Synthèse GO / NO-GO

Cocher le résultat de chaque bloc :

- [ ] **Bloc 1** — Session / login : OK
- [ ] **Bloc 2** — Top navigation : OK
- [ ] **Bloc 3** — Sidebar contextuelle : OK
- [ ] **Bloc 4** — Landings de rubrique : OK
- [ ] **Bloc 5** — Parcours métier : OK
- [ ] **Bloc 6** — Session longue (refresh ou redirect) : OK
- [ ] **Bloc 7** — Mobile / tablette : OK

### Règle de décision

- **GO ✅** : les 7 blocs cochés. Lot 7 bis peut être déployé en staging puis prod.
- **NO-GO ❌** : un seul bloc en échec sur un point critique (401 visible, shell cassé, boucle refresh, sidebar incohérente, card menant nulle part). Pas de déploiement, retour en correction.

### Notes / observations

```
Date de recette : _______________
Opérateur :       _______________
Build testé :     commit _________ ou URL ________________
Compte utilisé :  _______________

Blocages rencontrés :
-
-
-

Décision finale :  [ ] GO     [ ] NO-GO
```

---

## Mini-résumé à garder sous la main

> Teste dans cet ordre :
> **login → /dashboard → top nav complète (6 clics) → sidebar contextuelle (5 sections) → /referentiel → /production → /marketplace-hub → /distribution → /admin → pages réelles (beneficiaries, inbound-batches, seller/dashboard, distributions, admin/users, admin/review-queue) → attendre 16 min → retester /dashboard, /admin, /distributions → test mobile.**
>
> Un 401 visible, un shell cassé, une sidebar figée, une boucle refresh → **NO-GO**.
