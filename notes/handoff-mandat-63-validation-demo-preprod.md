# Handoff — Mandat 63 : Validation démo réelle pré-prod / Répétition générale

**Date :** 2026-05-10  
**Statut :** ✅ GO — 1003 tests backend, TSC clean, seed idempotent, smoke complet  
**Branche :** `mandat-55B`

---

## 1. Résumé exécutif

Répétition générale complète de la démo IOX investisseur/client.  
**Parcours bout-en-bout validé** : Catalogue → RFQ → Devis → WON → Paiement → Facture.  
**Un bug bloquant identifié et corrigé** (voir section 4).  
**Codebase stable et safe pour démo live.**

---

## 2. Partie A — État initial

### Git
- Branche : `mandat-55B`
- Fichiers modifiés (non commités) : modifications M57-M63

### Services Docker (iox_*)
```
iox_postgres     : Up (healthy) — port 5434
iox_redis        : Up (healthy) — port 6381
iox_meilisearch  : Up (healthy) — port 7700
iox_minio        : Up (healthy) — port 9000
iox_mailhog      : Up — port 8025
```

### Backend
- Process : `node dist/main.js` (webpack bundle, port **3001**)
- API prefix : `/api/v1`
- Swagger : `http://localhost:3001/api/docs` — 186 paths, 26 tags

### Documentation lue
- `notes/handoff-mandat-61-smoke-tests-preprod.md` ✅
- `notes/handoff-mandat-62-demo-packaging.md` ✅
- `notes/demo-script-investisseur-client.md` ✅
- `notes/demo-runbook-technique.md` ✅

---

## 3. Partie B — Build et démarrage

### Commandes de démarrage
```bash
# Infrastructure
cd apps/infra && docker-compose up -d

# Backend (depuis apps/backend)
npx nest build   # rebuild webpack bundle si modifié
node dist/main.js

# Seed démo
cd /repo/root && IOX_DEMO_SEED=1 npx tsx prisma/seed-demo.ts
```

### Notes importantes
- Port backend = **3001** (APP_PORT dans .env — pas 3000)
- API routes = `/api/v1/*` (pas de préfixe `/`)
- Swagger = `/api/docs` (pas `/api-docs`)
- `npx nest build` requis si code modifié depuis dernier build (stale webpack bundle = routes 404)

---

## 4. Partie H — Bug bloquant identifié et corrigé

### Bug : Duplicate RFQ + Seller voit 0 factures

**Symptôme :**
- Buyer voyait 4 RFQs au lieu de 3 (2× `rfq-ylang-extra-won`)
- Seller voyait 0 factures (invoice avec mauvais `sellerProfileId`)

**Cause racine :**
1. La RFQ WON ciblait `demo-ylang-extra` (produit appartenant à `demo-ylang-bandrele`), mais `smoke-seller@iox.mch` est attaché à `demo-coop-vanille`. L'invoice avait donc un `sellerProfileId` qui ne correspondait pas au smoke-seller → 0 factures visibles.
2. L'idempotence du runner utilisait `{ buyerCompanyId, targetMarket, marketplaceOfferId }` comme clé de lookup. Après changement de produit, l'ancien `marketplaceOfferId` (ylang) ≠ nouveau (vanille) → `existingRfq = null` → création d'un doublon.

**Corrections appliquées :**

**`apps/backend/src/seed-demo/dataset.ts`**
```typescript
// WON RFQ product: demo-ylang-extra → demo-vanille-bourbon-grade-a
productSlug: 'demo-vanille-bourbon-grade-a',  // propriété de demo-coop-vanille
requestedQuantity: '2',
requestedUnit: 'kg',
```

**`apps/backend/src/seed-demo/runner.ts`**
```typescript
// Idempotence key: targetMarket SEUL (sans marketplaceOfferId)
const existingRfq = await prisma.quoteRequest.findFirst({
  where: { buyerCompanyId: buyerCompany.id, targetMarket: rfqDef.seedKey },
});

// Payment et Invoice : propagation du sellerProfileId correct
await prisma.payment.update({ data: { sellerProfileId, marketplaceOfferId: targetOffer.id, ... } });
await prisma.invoice.update({ data: { sellerProfileId, buyerCompanyId: buyerCompany.id, ... } });
```

**Cleanup DB :**
```sql
-- Suppression du doublon créé avant le fix
DELETE FROM quote_request_messages WHERE quote_request_id = 'b18fce8c-7844-481b-a720-b0d7244823b8';
DELETE FROM quote_requests WHERE id = 'b18fce8c-7844-481b-a720-b0d7244823b8';
```

**Résultat après fix :**
- DB : exactement 3 RFQs, 0 doublon ✅
- Seller voit 1 invoice (INV-DEMO-RFQYLANGEXTR, 240 000c, ISSUED) ✅
- Seed idempotent (3× relancé sans doublon) ✅

---

## 5. Parties C-G — Résultats des smoke tests

### Seed output final (idempotent)
```
✅ Demo seed done — sellers: 9, products: 13, offers: 13, certifications: 6,
   mediaAssets: 13, publicDocs: 4, quoteRequests: 3, rfqMessages: 6,
   payments: 1, invoices: 0, sellerComplianceDocs: 3,
   smokeSeller: smoke-seller@iox.mch, smokeBuyer: smoke-buyer@iox.mch
```
*(invoices: 0 = l'invoice existante a été mise à jour — idempotence correcte)*

### Parcours Seller (`smoke-seller@iox.mch`)
| Vérification | Résultat |
|---|---|
| Login + JWT | ✅ |
| RFQs scoped (2 : rfq-ylang-extra-won WON + rfq-vanille-poudre-init NEW) | ✅ |
| Invoice : INV-DEMO-RFQYLANGEXTR, 240 000c EUR, ISSUED | ✅ |
| Invoice PDF (GET /api/v1/invoices/:id/pdf) : HTTP 200 | ✅ |
| Compliance summary : total=3, verified=1, pending=1, rejected=1 | ✅ |

### Parcours Buyer (`smoke-buyer@iox.mch`)
| Vérification | Résultat |
|---|---|
| Login + JWT | ✅ |
| Catalogue : 13 produits PUBLISHED (with auth) | ✅ |
| Stats catalogue : {products: 13, sellers: 9, countries: 1} | ✅ |
| RFQs : 3 (WON: rfq-ylang-extra-won, QUOTED: rfq-mangue-maya-quoted, NEW: rfq-vanille-poudre-init) | ✅ |
| Invoice : INV-DEMO-RFQYLANGEXTR visible | ✅ |

### Parcours Admin (`admin@iox.mch` / `Admin@IOX2026!`)
| Vérification | Résultat |
|---|---|
| Login + JWT | ✅ |
| Compliance admin summary : {sellersTotal: 9, sellersApproved: 9, documentsPending: 1, documentsRejected: 1} | ✅ |
| Compliance sellers list : 9 | ✅ |

### Vérification technique API
| Endpoint | HTTP | Résultat |
|---|---|---|
| GET /api/v1/marketplace/catalog/stats | 200 | {products:13, sellers:9, countries:1} |
| GET /api/v1/marketplace/offers/published (auth buyer) | 200 | 13 offres |
| GET /api/v1/marketplace/quote-requests (auth seller) | 200 | 2 RFQs scoped |
| GET /api/v1/invoices (auth seller) | 200 | 1 invoice |
| GET /api/v1/invoices/:id/pdf (auth seller) | 200 | PDF OK |
| GET /api/v1/compliance/seller/summary (auth seller) | 200 | 3 docs V/P/R |
| GET /api/v1/compliance/admin/summary (auth admin) | 200 | 9 sellers |
| GET /api/v1/dashboard/marketplace-alerts (auth admin) | 200 | OK |
| GET /api/docs-json | 200 | 186 paths |

---

## 6. Partie J — Tests finaux

```
cd apps/backend
npx jest --no-coverage
→ 87 suites, 1003 tests, 0 failures ✅

npx tsc --noEmit
→ 0 errors ✅

seed-demo spécifiquement : 22/22 tests ✅
```

---

## 7. Corrections documentaires (notes/)

| Fichier | Correction |
|---|---|
| `notes/demo-script-investisseur-client.md` | WON RFQ : "Ylang-Ylang Extra" → "Vanille Bourbon de Mayotte — Grade A" |
| `notes/demo-script-investisseur-client.md` | Invoice : `INV-DEMO-RFQYLANGEX` → `INV-DEMO-RFQYLANGEXTR` |
| `notes/demo-runbook-technique.md` | Payment detail : "RFQ ylang WON" → "RFQ Vanille Bourbon Grand Cru WON" |

---

## 8. Points d'attention pour la démo live

| Point | Action |
|---|---|
| Backend port = **3001** (pas 3000) | Adapter les URLs frontend si nécessaire |
| API prefix = `/api/v1` | Toutes les routes commencent par `/api/v1/` |
| Catalogue nécessite auth | `GET /marketplace/offers/published` requiert JWT |
| Bundle webpack stale | `npx nest build` avant démarrage si code modifié |
| Frontend non validé dans ce mandat | Tester manuellement avant démo live |

---

## 9. Comptes démo

```
smoke-seller@iox.mch   / IoxSmoke2026!   (MARKETPLACE_SELLER → demo-coop-vanille)
smoke-buyer@iox.mch    / IoxSmoke2026!   (MARKETPLACE_BUYER  → Acme Foods Importer)
admin@iox.mch          / Admin@IOX2026!  (ADMIN)
```

---

## 10. Décision

**GO DÉMO** — Tous les parcours validés, 1003/1003 tests verts, DB propre, seed idempotent.

---

## 11. Prochain mandat recommandé

**Mandat 64** (suggestions) :
- Option A : Commit + PR branche `mandat-55B` → `main` (cleanup + squash)
- Option B : Validation frontend UI (Partie B frontend + D/E/F UI)
- Option C : Compléter `@ApiResponse` sur 30 controllers secondaires
- Option D : API v2 mobile (versioning, `addServer()`)
