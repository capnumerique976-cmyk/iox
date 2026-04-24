# IOX Marketplace — Runbook & checklist d'ouverture seller contrôlée

> Ce document est l'annexe marketplace de `docs/GO-LIVE-CHECKLIST.md`. Il
> couvre uniquement l'ouverture contrôlée du périmètre seller
> (`MARKETPLACE_SELLER`), c'est-à-dire l'activation des comptes qui
> vont éditer des produits/offres/documents sur la marketplace IOX.
>
> **Pré-requis général** : la préprod IOX est déjà déployée, la migration
> `20260423000000_add_user_company_memberships` est appliquée, le backend
> et le frontend tournent sur la version ownership V2.
>
> **Légende** : 🔴 bloquant · 🟠 à valider avec un humain · 🟢 automatisable · ⚪ recommandé

---

## 0 — Rappel des invariants métier

- Un user `MARKETPLACE_SELLER` **sans** `UserCompanyMembership` est
  **neutralisé** (il peut se connecter, mais toutes les requêtes
  seller-scope renvoient `{ sellerProfileId: { in: [] } }` ; aucune
  mutation n'est autorisée). Un bandeau d'onboarding s'affiche dans l'UI.
- Un user `MARKETPLACE_SELLER` **avec** un ou plusieurs memberships
  vers des companies qui possèdent un `SellerProfile` accède à la
  réunion (`∪`) de ces périmètres. Un seul membership peut être
  `isPrimary = true` par user.
- Les rôles staff (`ADMIN`, `COORDINATOR`, `QUALITY_MANAGER`, `AUDITOR`)
  bypassent l'ownership : pas besoin de membership pour eux.

---

## Bloc A — Avant l'ouverture (J-3 → J-1)

### A.1 — Prérequis techniques

| #    | Action                                            | Commande / écran                                                                         | Succès                                 | Remédiation              |
| ---- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------ |
| A1.1 | Migration appliquée en préprod                    | `pnpm db:migrate:status`                                                                 | `Database schema is up to date`        | `pnpm db:migrate:deploy` |
| A1.2 | Backend tourne en version ownership V2            | `GET /api/v1/health`                                                                     | `200 OK` + build tag attendu           | Redéploiement            |
| A1.3 | Les routes `/admin/memberships/*` répondent       | `curl -H 'Authorization: Bearer $ADMIN' $API/admin/memberships`                          | `200` avec pagination                  | Vérifier module + JWT    |
| A1.4 | L'UI `/admin/memberships` s'affiche pour un admin | navigateur                                                                               | page rendue, stats diagnostic visibles | vérifier build front     |
| A1.5 | Les tests critiques passent en CI                 | `pnpm --filter @iox/backend test -- --testPathPattern="(memberships\|seller-ownership)"` | 39/39 ✅                               | ne pas ouvrir si rouge   |

### A.2 — Préparer le CSV de rattachement

Le fichier **doit être produit manuellement** par le responsable
marketplace à partir du référentiel métier (listing des sellers et
companies attendus). Il n'existe aucune règle de matching automatique
fiable (cf. `docs/MEMBERSHIPS_OPERATIONS.md`).

| #    | Action                                                 | Commande / écran                                                                                                         | Succès                                                 | Remédiation                                                            |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| A2.1 | Template copié                                         | `cp prisma/backfill-memberships.csv.example prisma/backfill-memberships.csv`                                             | Fichier créé                                           | —                                                                      |
| A2.2 | Une ligne par rattachement seller → company            | éditeur texte                                                                                                            | Header `user_email,company_code,is_primary` + N lignes | —                                                                      |
| A2.3 | Chaque `user_email` existe dans la base                | `SELECT email FROM users WHERE role='MARKETPLACE_SELLER'`                                                                | 100 % des emails du CSV y figurent                     | créer les users manquants via `/admin/users`                           |
| A2.4 | Chaque `company_code` existe dans la base              | `SELECT code FROM companies`                                                                                             | 100 % des codes y figurent                             | créer les companies manquantes via `/companies/new`                    |
| A2.5 | Chaque company ciblée a un `SellerProfile`             | `SELECT c.code FROM companies c LEFT JOIN seller_profiles s ON s.company_id=c.id WHERE s.id IS NULL AND c.code IN (...)` | 0 ligne retournée                                      | créer les `SellerProfile` manquants via `/marketplace/seller-profiles` |
| A2.6 | Au plus un `is_primary=true` par user                  | revue visuelle ou script                                                                                                 | pas de doublon                                         | corriger le CSV                                                        |
| A2.7 | Revue métier du mapping par le responsable marketplace | 🟠                                                                                                                       | OK signé                                               | refaire la revue                                                       |

### A.3 — Dry-run du backfill

| #    | Action                            | Commande                    | Succès                                                                                   | Remédiation               |
| ---- | --------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------- | ------------------------- |
| A3.1 | Lancer le dry-run                 | `pnpm backfill:memberships` | `mode: dry-run` en fin, `user_not_found = 0`, `company_not_found = 0`, `hard_errors = 0` | corriger le CSV, relancer |
| A3.2 | Vérifier les WARN NON_SELLER_ROLE | stdout                      | 0 ligne, ou uniquement des cas volontaires (staff rattaché)                              | retirer ou documenter     |
| A3.3 | Lister les `CREATED` attendus     | stdout                      | N = nombre de rattachements souhaités                                                    | corriger le CSV           |

🔴 **Ne pas passer au bloc B si A3.1 ou A3.2 ou A3.3 n'est pas vert.**

---

## Bloc B — Pendant l'activation (fenêtre J0)

| #   | Action                              | Commande / écran                                                           | Succès                                                     | Remédiation                                               |
| --- | ----------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| B1  | Snapshot base avant apply           | `pg_dump $DATABASE_URL > backup_preB.sql`                                  | fichier > 0 octet                                          | ne pas continuer                                          |
| B2  | Diagnostic _avant_                  | `pnpm memberships:diagnose`                                                | verdict `NOT_READY` (c'est attendu avant backfill)         | —                                                         |
| B3  | Apply du backfill                   | `pnpm backfill:memberships -- --apply`                                     | exit 0 + résumé cohérent (`created` = valeur du dry-run)   | restaurer backup B1 si incohérence                        |
| B4  | Diagnostic _après_                  | `pnpm memberships:diagnose`                                                | `sellersWithoutMembership = 0` → verdict `READY`           | refaire un CSV complémentaire pour les orphelins restants |
| B5  | Vérifier via UI admin               | `/admin/memberships`                                                       | section "Sellers sans rattachement" vide, stats cohérentes | idem B4                                                   |
| B6  | Sonde API diagnostic                | `curl -H 'Authorization: Bearer $ADMIN' $API/admin/memberships/diagnostic` | `sellersWithoutMembership = 0`                             | idem B4                                                   |
| B7  | Sonde seller orphelin (compte test) | connexion d'un seller volontairement non rattaché                          | bandeau d'onboarding visible, zéro données métier          | corriger le composant banner                              |
| B8  | Sonde seller nominal                | connexion d'un seller rattaché                                             | profil + produits + offres visibles dans son périmètre     | vérifier jwt.strategy + ownership                         |

---

## Bloc C — Juste après ouverture (H+0 → H+2)

| #   | Action                                                        | Commande / écran                                                   | Succès                                                                            | Remédiation                           |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------- |
| C1  | Login seller test (rattaché)                                  | UI                                                                 | `/dashboard` sans bandeau orange                                                  | redémarrer le compte si JWT en cache  |
| C2  | Créer un MarketplaceProduct depuis le seller test             | UI `/seller/products/new`                                          | produit créé avec `sellerProfileId` = celui du seller                             | vérifier ownership service            |
| C3  | Tentative cross-seller (hacking manuel)                       | `curl -X PATCH $API/marketplace/products/<id-autre-seller> -H ...` | `403 Forbidden`                                                                   | CRITIQUE si 200 — arrêter l'ouverture |
| C4  | Endpoint diagnostic admin fonctionnel                         | `/admin/memberships/diagnostic`                                    | JSON cohérent avec la base                                                        | vérifier module                       |
| C5  | Logs applicatifs propres                                      | `docker logs iox-backend \| grep -i SELLER_WITHOUT_MEMBERSHIP`     | entrées cohérentes avec les orphelins connus                                      | investiguer toute surprise            |
| C6  | Création d'une RFQ (côté buyer test → offer d'un seller test) | UI buyer                                                           | RFQ visible uniquement du buyer, de l'admin, et du seller propriétaire de l'offer | CRITIQUE                              |

---

## Bloc D — Surveillance des premières 24 heures

| #   | Métrique                                            | Outil                               | Seuil d'alerte                            | Action                                                              |
| --- | --------------------------------------------------- | ----------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| D1  | Logs `SELLER_WITHOUT_MEMBERSHIP`                    | grep / agrégateur                   | > 0 orphelin inconnu                      | contact admin marketplace                                           |
| D2  | Réponses `403 Forbidden` sur endpoints seller-scope | access log                          | pic anormal sur un compte                 | identifier + éduquer / patcher CSV                                  |
| D3  | Réponses `404` inattendues sur `/marketplace/*`     | access log                          | > 2 % du trafic seller                    | vérifier `sellerProfileIds` en JWT                                  |
| D4  | Tickets / signalements sellers                      | support                             | tout signalement seller                   | appliquer le workflow `docs/MEMBERSHIPS_OPERATIONS.md` § Onboarding |
| D5  | Nouveaux sellers à onboarder                        | `/admin/memberships/orphan-sellers` | croissance journalière                    | workflow d'onboarding admin UI                                      |
| D6  | Audit trail                                         | table `audit_logs`                  | pas d'action `MEMBERSHIP_*` non expliquée | investiguer                                                         |

---

## Annexe — Onboarder un **nouveau** seller post-ouverture

1. **Admin → `/admin/users`** : créer l'utilisateur avec `role = MARKETPLACE_SELLER`, `isActive = true`.
2. **Admin → `/companies/new`** : créer la `Company` si elle n'existe pas.
3. **Admin → `/marketplace/seller-profiles`** : créer le `SellerProfile` lié à la company (statut `DRAFT` puis soumission).
4. **Admin → `/admin/memberships`** : rattacher user ↔ company, `isPrimary = true` si premier.
5. **Vérification** : dans `/admin/memberships/diagnostic`, le compteur `sellersWithoutMembership` reste à 0.
6. **Communication** : fournir au seller son login + URL préprod + rappel que les modifications vitrine repassent en revue qualité après soumission.

## Annexe — Retirer / désactiver un seller

| Cas                             | Action                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Suspension temporaire du compte | `PATCH /users/:id { isActive: false }` — le JWT cesse d'être valide, memberships conservés                                            |
| Retrait définitif d'une company | `DELETE /admin/memberships/:id` — auto-promotion du plus ancien restant ; si dernier membership, seller devient orphelin (bandeau UI) |
| Fermeture du seller profile     | `PATCH /marketplace/seller-profiles/:id/suspend` (staff uniquement) — produits/offres deviennent invisibles côté buyer                |

---

## Annexe — Commandes de référence

```bash
# Diagnostic lecture seule (ne modifie rien) :
pnpm memberships:diagnose
pnpm memberships:diagnose -- --verbose     # + liste des orphelins
pnpm memberships:diagnose -- --json        # pour pipelines CI

# Backfill :
pnpm backfill:memberships                  # dry-run sur prisma/backfill-memberships.csv
pnpm backfill:memberships -- --file ./x.csv
pnpm backfill:memberships -- --apply       # écrit en base

# Vérifications SQL directes (lecture seule) :
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM user_company_memberships;"
psql "$DATABASE_URL" -c "
  SELECT u.email, COUNT(m.id) AS memberships
  FROM users u
  LEFT JOIN user_company_memberships m ON m.user_id = u.id
  WHERE u.role = 'MARKETPLACE_SELLER' AND u.is_active = true
  GROUP BY u.email
  ORDER BY memberships ASC;
"
```

---

## Critères GO / NO-GO (à cocher avant d'ouvrir au premier seller réel)

- [ ] Tous les items 🔴 du **Bloc A** sont verts.
- [ ] Dry-run du CSV : 0 `user_not_found`, 0 `company_not_found`, 0 `hard_errors`.
- [ ] Revue métier signée par le responsable marketplace (A2.7).
- [ ] `pnpm memberships:diagnose` post-apply → verdict `READY`.
- [ ] Test C3 (tentative cross-seller) → `403 Forbidden` reproduit.
- [ ] Un seller test nominal a pu créer un produit et une offre dans son périmètre.
- [ ] Un seller test orphelin voit le bandeau d'onboarding et aucune donnée.
- [ ] Logs applicatifs propres sur les 15 premières minutes.

Si un seul de ces critères est non satisfait : **NO-GO**, retour au bloc concerné.
