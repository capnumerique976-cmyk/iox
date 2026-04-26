# SEED-DEMO — runbook fixtures marketplace

> Jeu de fixtures démo idempotent pour rendre la marketplace immédiatement
> démontrable en pré-production. **JAMAIS à activer sur la prod réelle.**

## Objectif

Peupler la base avec un dataset cohérent permettant de :

- afficher l'annuaire `/marketplace/sellers` rempli (4 vendeurs APPROVED dont 2 vedettes) ;
- afficher le catalogue `/marketplace` rempli (8 produits PUBLISHED, 8 offres) ;
- naviguer sur les fiches détail (FP-1 saisonnalité, FP-2 certifications, FP-6 origine fine) ;
- jouer les smoke tests authentifiés via le compte `smoke-seller@iox.mch`.

## Garde-fous

| Condition                                                | Comportement                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `IOX_DEMO_SEED` absent ou ≠ `1`                          | No-op silencieux : aucune écriture DB, log `Demo seed skipped`.               |
| `NODE_ENV=production` ET `IOX_DEMO_SEED ≠ 1`             | **Throw immédiat** avec message explicite. Aucune écriture DB.                |
| `NODE_ENV=production` ET `IOX_DEMO_SEED=1`               | Exécute (double opt-in). À n'utiliser que sur des environnements démo.        |

## Activer

### En pré-production

```bash
# Depuis la racine du repo
IOX_DEMO_SEED=1 pnpm db:seed:demo

# Ou via le filtre workspace
IOX_DEMO_SEED=1 pnpm --filter @iox/backend seed:demo
```

Le script est **idempotent** — on peut le rejouer N fois sans dupliquer
(toutes les écritures passent par `upsert` sur des clés naturelles).

### Override mot de passe smoke-seller

Par défaut le compte smoke-seller est créé avec `IoxSmoke2026!`. Pour
surcharger :

```bash
IOX_DEMO_SEED=1 SMOKE_SELLER_PASSWORD='MonMotDePasse2026!' pnpm db:seed:demo
```

## Désactiver / nettoyer

### Désactivation simple

Ne pas exporter `IOX_DEMO_SEED`. Le script ne fait rien.

### Cleanup ciblé (préprod uniquement)

Toutes les entités créées sont préfixées `demo-` dans leurs clés
naturelles. Cleanup SQL :

```sql
-- Ordre important (FK)
DELETE FROM marketplace_certifications WHERE related_id IN (
  SELECT id FROM marketplace_products WHERE slug LIKE 'demo-%'
  UNION
  SELECT id FROM seller_profiles WHERE slug LIKE 'demo-%'
);
DELETE FROM marketplace_offers WHERE marketplace_product_id IN (
  SELECT id FROM marketplace_products WHERE slug LIKE 'demo-%'
);
DELETE FROM marketplace_products WHERE slug LIKE 'demo-%';
DELETE FROM seller_profiles WHERE slug LIKE 'demo-%';
DELETE FROM products WHERE code LIKE 'DEMO-%';
DELETE FROM beneficiaries WHERE code LIKE 'DEMO-%';
DELETE FROM user_company_memberships WHERE user_id IN (
  SELECT id FROM users WHERE email = 'smoke-seller@iox.mch'
);
DELETE FROM companies WHERE code LIKE 'DEMO-%';
DELETE FROM users WHERE email = 'smoke-seller@iox.mch';
```

### Reset complet (préprod / dev uniquement)

```bash
pnpm db:migrate reset   # ⚠ NON sur la prod réelle
```

## Compte smoke-seller

| Champ      | Valeur                                                            |
| ---------- | ----------------------------------------------------------------- |
| Email      | `smoke-seller@iox.mch`                                            |
| Mot de passe (défaut) | `IoxSmoke2026!`                                        |
| Rôle       | `MARKETPLACE_SELLER`                                              |
| Membership | Lié à la 1ère company demo (`DEMO-SUP-001`, Coopérative Vanille). |

Override possible via `SMOKE_SELLER_PASSWORD`.

## Contenu du dataset

### Sellers (4 — tous `status=APPROVED`)

| Slug                       | Vedette | Pays | Région           | Spécialité      |
| -------------------------- | ------- | ---- | ---------------- | --------------- |
| `demo-coop-vanille`        | ✅      | YT   | Grande-Terre     | Vanille bourbon |
| `demo-pecheurs-mayotte`    | ✅      | YT   | Petite-Terre     | Pêche / thon    |
| `demo-ylang-bandrele`      | —       | YT   | Grande-Terre Sud | Huile ylang     |
| `demo-fruits-tsingoni`     | —       | YT   | Centre           | Fruits          |

### Produits marketplace (8 — tous `publicationStatus=PUBLISHED`)

Tous incluent : saisonnalité (FP-1), origine fine GPS + locality + altitude
(FP-6), description longue, packaging, MOQ, defaultUnit.

| Slug                            | Vendeur                  | Prix offre |
| ------------------------------- | ------------------------ | ---------- |
| `demo-vanille-bourbon-grade-a`  | demo-coop-vanille        | FIXED 420€/kg FOB |
| `demo-vanille-poudre`           | demo-coop-vanille        | FROM_PRICE 780€/kg CIF |
| `demo-thon-jaune-iqf`           | demo-pecheurs-mayotte    | FIXED 14,50€/kg CIF |
| `demo-thon-conserve-huile`      | demo-pecheurs-mayotte    | FROM_PRICE 3,20€/u FOB |
| `demo-ylang-extra`              | demo-ylang-bandrele      | QUOTE_ONLY EXW |
| `demo-ylang-complete`           | demo-ylang-bandrele      | FIXED 165€/kg FOB |
| `demo-mangue-maya`              | demo-fruits-tsingoni     | FROM_PRICE 5,80€/kg FCA |
| `demo-fruit-passion`            | demo-fruits-tsingoni     | QUOTE_ONLY EXW |

### Certifications (6 — toutes `verificationStatus=VERIFIED`)

3 sur sellers (BIO_EU, HACCP, ECOCERT), 3 sur produits (FAIRTRADE,
ISO_22000, GLOBALGAP).

## Limitations

- Les `logoMediaId` / `bannerMediaId` sont des UUID stables **non-résolvables**
  (aucun fichier S3 derrière). Les composants `SellerCard` / fiches produit
  les utilisent comme indicateurs binaires (présent/absent) tant que la
  résolution publique signée n'est pas exposée — comportement aligné avec
  MP-S-INDEX (v1).
- Pas de `MarketplaceOfferBatch`, pas de `ProductBatch`, pas de documents
  `MarketplaceDocument` — hors-scope V1 du seed démo.

## Étendre le dataset

Tout est déclaratif dans `apps/backend/src/seed-demo/dataset.ts`. Ajouter
un nouveau seller / produit / certif :

1. Ajouter l'entrée dans `DEMO_DATASET.sellers` / `.products` / `.certifications`.
2. Préfixer toutes les clés naturelles par `demo-` ou `DEMO-`.
3. Si nouveau seller, créer aussi un `companyCode` et `beneficiaryCode` dédiés.
4. Si nouveau produit, référencer le `sellerSlug` et `beneficiaryCode` du seller parent.
5. Mettre à jour `apps/backend/src/seed-demo/seed-demo.spec.ts` si la
   cardinalité est testée explicitement (`expect(...).toHaveBeenCalledTimes(N)`).

## FAQ

> **J'ai vu des données démo en prod réelle, que faire ?**

Cleanup SQL ciblé ci-dessus (toutes les clés démo sont préfixées `demo-` /
`DEMO-` / `smoke-seller@iox.mch`). Puis investiguer comment `IOX_DEMO_SEED=1`
a été défini sur l'env prod (mauvaise config CI, override manuel, etc.) et
le retirer.

> **Le seed normal (`db:seed`) est-il affecté ?**

Non. `prisma/seed.ts` est inchangé. Le seed démo est un script séparé,
opt-in via flag.

> **Puis-je relancer le seed démo après modification du dataset ?**

Oui. L'idempotence est strictement basée sur les clés naturelles. Modifier
une description / un prix : la 2ᵉ exécution mettra à jour. Renommer un
slug : crée une nouvelle entité (l'ancienne reste, à nettoyer
manuellement).
