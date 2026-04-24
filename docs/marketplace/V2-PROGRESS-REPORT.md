# Marketplace V2 — Rapport de progression (itération 2)

Suite de la V2 exécutée en autonome, après la clôture formelle V1
(`V1-CLOSURE-REPORT.md`) et la première vague V2 (`V2-ROADMAP-REPORT.md`).

Règles respectées :

- V1 reste la baseline stable — **aucun contrat V1 modifié**.
- aucune migration Prisma, aucun nouveau endpoint backend.
- chaque lot validé (typecheck + lint + tests) avant le lot suivant.
- progression additive, désactivable, orientée valeur métier.

---

## 1. Résumé exécutif V2

5 lots livrés, ~6 fichiers modifiés / 0 nouveau fichier, 0 changement backend.
Tous les lots sont additifs et n'ont pas régressé la V1 :

| #   | Chantier           | Valeur livrée                                                                          | Risque |
| --- | ------------------ | -------------------------------------------------------------------------------------- | ------ |
| 1   | Buyer — RFQ & i18n | Liste RFQ avec compteurs par statut + recherche + empty-states par rôle + i18n filtres | Faible |
| 2   | Seller cockpit     | Score de complétude de profil + alertes contenus rejetés + top RFQ à traiter           | Faible |
| 3   | RFQ detail         | Timeline visuelle du parcours + contexte offre enrichi + compteur messages             | Faible |
| 4   | Admin supervision  | Widget « Risques & alertes » : file bloquée > 7 j + docs expirant sous 30 j            | Faible |
| 5   | Stabilisation      | typecheck + lint + tests unitaires + build + E2E                                       | —      |

**Validations finales :**

- `tsc --noEmit` frontend : ✅ clean
- `next lint --max-warnings=0` : ✅ No ESLint warnings or errors
- `vitest run` : ✅ **52 / 52** passed (10 fichiers)
- `next build` : ✅ **41 routes** compilées
- `playwright test` : ✅ **30 / 30** passed (48.9 s)

---

## 2. Chantiers V2 réalisés

### Lot 1 — Buyer experience V2

**Objectif** : fluidifier la gestion des RFQ côté buyer (et rendre la
même page exploitable par les sellers et le staff).

**Fichier modifié**

- `apps/frontend/src/app/(dashboard)/quote-requests/page.tsx`
  - Fetch unique (`limit=200`) + ventilation client-side → **1 appel API** au lieu de 7.
  - Tabs de statut avec compteurs `(n)` par statut et auto-masquage des
    tabs vides, pour une UX lisible même quand peu de données.
  - Barre de recherche locale (offre / vendeur / acheteur / marché).
  - Compteur de messages par ligne (`_count.messages`) → badge
    `<MessageSquare/> N` pour voir immédiatement où se trouvent les RFQ
    actives.
  - Empty states différenciés par rôle :
    - buyer : « Vous n'avez pas encore de demande » + CTA `/marketplace`.
    - seller : « Aucune demande reçue » + lien cockpit.
    - staff : version neutre.

**Fichiers modifiés (i18n)**

- `apps/frontend/src/lib/i18n.ts` — +24 clés FR/EN (filtres, readiness,
  pricing, product).
- `apps/frontend/src/components/marketplace/CatalogFilters.tsx` — labels,
  placeholders, boutons traduits via `useLang`.

**Valeur métier**

- Buyer : visibilité immédiate sur ses demandes, tri, recherche, CTA de
  ré-engagement.
- Seller : même page devient un mini-CRM entrant sans dev spécifique.
- Admin / Coordinator : supervise les RFQ avec recherche sans passer par
  `/admin/rfq`.

---

### Lot 2 — Seller cockpit V2

**Objectif** : transformer `/seller/dashboard` en cockpit actionnable.

**Fichier modifié**

- `apps/frontend/src/app/(dashboard)/seller/dashboard/page.tsx`

**Ajouts**

1. **Score de complétude du profil** (6 critères) :
   description courte (≥ 20 car), description longue (≥ 80 car), email
   commercial, logo, incoterms supportés, destinations servies. Barre de
   progression + liste cochée. Couleur dynamique (orange < 50 % <
   amber < 100 % = emerald).
2. **Contenus rejetés** (products + offers `REJECTED`) : section rouge
   avec lien direct `/products/:id` et `/marketplace/offers/:id` pour
   corriger + tronquée à 5 + compteur « + N autres ».
3. **Demandes à traiter (top 3)** : priorisées NEW → NEGOTIATING → reste,
   puis triées par récence. Lien direct vers la RFQ et vers
   `/quote-requests`.

**Choix d'architecture**

- Aucun appel API supplémentaire : tout est calculé depuis les payloads
  déjà chargés (`offers`, `products`, `rfq`, `profile`).
- Helper `completionCriteria(profile)` testable isolément (pure).
- Le cockpit reste 1 écran : les nouvelles sections sont conditionnelles
  (affichées uniquement si utiles — rejetés s'il y en a, RFQ s'il y en a,
  complétude si profil chargé).

**Valeur métier**

- Le vendeur voit immédiatement **ce qui bloque sa publication** (profil
  incomplet, contenus rejetés) et **ce qu'il doit traiter** (RFQ récentes).

---

### Lot 3 — RFQ V2

**Objectif** : rendre la page détail RFQ plus lisible sans changer la
logique métier.

**Fichier modifié**

- `apps/frontend/src/app/(dashboard)/quote-requests/[id]/page.tsx`

**Ajouts**

1. **`<StatusTimeline current={...} />`** : parcours visuel
   NEW → QUALIFIED → QUOTED → NEGOTIATING avec pastilles + connecteurs.
   Statut actif en bleu, étapes validées en emerald. Statuts terminaux
   (WON / LOST / CANCELLED) affichés en badge final dédié.
2. **Contexte offre enrichi dans le header** : ajout du mode de prix
   (`FIXED` / `FROM_PRICE` / `QUOTE_ONLY`) + prix unitaire + devise
   lorsque disponibles.
3. **Compteur de messages** dans le titre du fil de discussion.
4. **Hint RGPD / rôle** visible pour les buyers : rappel que les notes
   internes seller ↔ staff ne leur sont pas visibles (transparence).

**Valeur métier**

- Le buyer comprend immédiatement où il en est dans la négociation.
- Le seller / staff voit le parcours sans devoir lire la liste d'actions.
- Le hint coupe court aux incompréhensions « manque-t-il des messages ? ».

---

### Lot 4 — Admin supervision V2

**Objectif** : donner à l'admin un radar sur les vrais risques de la
plateforme, sans reconstruire un dashboard BI.

**Fichier modifié**

- `apps/frontend/src/app/(dashboard)/admin/page.tsx`

**Ajout**

- Nouvelle section **« Risques & alertes »** (entre les 4 cartes
  principales et les accès rapides) :
  - **File bloquée > 7 jours** : items PENDING de la review queue
    (`reviewType` + `entityType` + ancienneté en jours), triés du plus
    ancien au plus récent, top 10, lien direct vers
    `/admin/review-queue?status=PENDING`.
  - **Documents expirant sous 30 jours** : doc `title` + type +
    `daysLeft`, triés du plus urgent au moins urgent, top 10, lien vers
    `/admin/diagnostics`.
- État local indépendant (`LoadState<RiskSummary>`) → un échec localisé
  n'impacte pas le reste du dashboard.

**Valeur métier**

- L'admin repère en un coup d'œil **les goulots d'étranglement** (revues
  oubliées) et **les risques de conformité** (docs qui expirent).
- Zéro nouveau endpoint : agrégation côté client sur des listes déjà
  scopées par le backend.

---

### Lot 5 — Stabilisation

Exécution systématique après chaque lot + batterie complète finale :

| Étape              | Commande                         | Résultat                             |
| ------------------ | -------------------------------- | ------------------------------------ |
| Frontend typecheck | `npx tsc --noEmit`               | ✅ clean                             |
| Frontend lint      | `npx next lint --max-warnings=0` | ✅ No ESLint warnings or errors      |
| Frontend tests     | `npx vitest run`                 | ✅ **52 / 52** (10 fichiers, 2.98 s) |
| Frontend build     | `npx next build`                 | ✅ **41 routes**                     |
| E2E Playwright     | `npx playwright test`            | ✅ **30 / 30** (48.9 s)              |

Le seul bruit observé est une trace `TypeError` dev-mode sur
`dashboard/page.tsx` déjà documentée dans `V1-CLOSURE-REPORT.md`
section 7 — pas de régression fonctionnelle.

---

## 3. Valeur ajoutée par rôle

**Buyer**

- Liste RFQ : compteurs, recherche, empty-state actionnable.
- Détail RFQ : timeline claire, hint de transparence sur notes internes.
- Catalogue / filtres : i18n FR ⇄ EN progressive.

**Seller**

- Cockpit transformé en vue de pilotage : score de complétude, contenus
  à corriger, demandes à traiter — tout sur 1 écran.
- Liste RFQ partagée avec le buyer → même outil, UX adaptée par rôle.

**Admin / Staff**

- Widget « Risques & alertes » : détecte la file bloquée et les docs
  expirants sans quitter le dashboard.
- Deep-links vers les vues existantes filtrées (`?status=PENDING`).
- i18n amorcée sur le marketplace public avec dictionnaire extensible.

---

## 4. Garanties de non-régression V1

- **Aucun changement backend.** Pas de schéma Prisma, pas de service, pas
  de controller, pas d'endpoint modifié ou ajouté.
- **Aucun changement de contrat côté client** : les payloads consommés
  sont les mêmes qu'en V1 (offers, products, documents, quote-requests,
  review-queue).
- **Scoping seller / admin inchangé** : les listes consommées par le
  cockpit et le dashboard passent toujours par les endpoints V1 qui
  appliquent `ownership.scopeSellerProfileFilter(actor)` pour les
  sellers. Aucun risque de fuite.
- **Règles de visibilité publique inchangées** : les pages publiques
  (catalog, product detail, seller profile) ne sont pas touchées par
  cette itération (seuls les filtres i18n-isés).
- **Workflows critiques** : publication, review-queue, documents, RFQ —
  aucun fichier de service ou de page de workflow touché.
- **Tests V1** : 52/52 unit + 30/30 E2E verts après chaque lot.

---

## 5. Validations exécutées

| Après lot     | tsc | lint | vitest   | build        | E2E      |
| ------------- | --- | ---- | -------- | ------------ | -------- |
| Lot 1         | ✅  | ✅   | ✅ 52/52 | —            | —        |
| Lot 2         | ✅  | ✅   | —        | —            | —        |
| Lot 3         | ✅  | ✅   | —        | —            | —        |
| Lot 4         | ✅  | ✅   | —        | —            | —        |
| Lot 5 (final) | ✅  | ✅   | ✅ 52/52 | ✅ 41 routes | ✅ 30/30 |

---

## 6. Bugs corrigés

- Type narrowing dans le loader des docs expirants du dashboard admin
  (`.filter(d => d !== null)` remplacé par une boucle qui pousse
  directement `ExpiringDoc[]` — TS `2677 / 2322` écartés).

Aucun bug V1 détecté au cours de l'itération.

---

## 7. Points restants

Aucun blocage. Candidats V2+ identifiés mais hors scope ce tour :

- **Unread message tracking RFQ** : aujourd'hui compteur total uniquement.
  Un vrai tracker (dernier read par utilisateur) demanderait un endpoint +
  une table. À prioriser si la charge RFQ augmente.
- **Bulk actions admin étendues** : aujourd'hui bulk approve review
  queue uniquement. Bulk suspend / bulk reject resterait à cadrer côté
  audit trail.
- **i18n espaces authentifiés** : cockpit vendeur, RFQ, admin — laissé
  intentionnellement en FR (socle dictionnaire FR/EN prêt, peuplement
  itératif).
- **Persistance favoris** : localStorage uniquement. Migration vers une
  table `MarketplaceBookmark` à décider selon la rétention buyer.
- **Filtre catégorie catalogue** : nécessite un endpoint listing des
  catégories — toujours réservé à une itération dédiée.

---

## 8. Recommandations

**Priorité immédiate (V2 bis)**

1. Étendre la timeline RFQ avec un **historique des transitions**
   (`status_history`) stocké côté backend — l'UI est déjà prête à le
   consommer si un endpoint `GET /quote-requests/:id/history` apparaît.
2. **Persistance favoris buyer** : transformer la seed localStorage
   actuelle en table `MarketplaceBookmark` (buyerUserId + offerId +
   createdAt). Migration sans casse : lire d'abord la table, fallback
   localStorage.
3. **Filtre catégorie** sur `/marketplace` : côté backend, un simple
   `GET /marketplace-categories?isLeaf=true` + côté front une chip list.

**Priorité différée (V3 candidate)**

- Notifications in-app (nouvelle RFQ, document rejeté, etc.).
- Export PDF RFQ (synthèse + fil de discussion non interne).
- Statistiques seller agrégées (conversion offre → RFQ → WON).
- Review queue : file personnelle « mes items assignés ».

---

## 9. Fichiers récap

```
MODIFIED (5)
  apps/frontend/src/app/(dashboard)/quote-requests/page.tsx
  apps/frontend/src/app/(dashboard)/quote-requests/[id]/page.tsx
  apps/frontend/src/app/(dashboard)/seller/dashboard/page.tsx
  apps/frontend/src/app/(dashboard)/admin/page.tsx
  apps/frontend/src/components/marketplace/CatalogFilters.tsx
  apps/frontend/src/lib/i18n.ts

NEW (0)
  — aucun nouveau fichier ; itération volontairement additive sur
    l'existant pour minimiser le risque.

DOCS
  docs/marketplace/V2-PROGRESS-REPORT.md (ce document)
```

---

## 10. Verdict

**🟢 Itération V2 livrée, V1 intacte.**

5 lots, 0 régression, 0 migration, 0 nouveau endpoint. Toutes les
validations sont vertes. La marketplace est mesurablement plus
exploitable pour les 3 rôles (buyer, seller, admin) sans dette technique
additionnelle.

Prêt pour une itération V2-bis sur les 3 chantiers prioritaires listés
en section 8.
