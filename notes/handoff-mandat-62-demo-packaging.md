# Handoff — Mandat 62 : Packaging démo investisseur / client

**Date :** 2026-05-10  
**Statut :** ✅ GO — 1003 tests backend, TSC clean  
**Branche :** `mandat-55B`

---

## 1. Résumé exécutif

Le jeu de fixtures démontables IOX a été complété pour présenter le **parcours bout-en-bout** à un investisseur ou client :
- Acheteur effectue une RFQ → Vendeur répond → Devis accepté → Paiement → Facture
- Vendeur gère sa conformité documentaire (VERIFIED / PENDING / REJECTED)

Le seed-demo est idempotent, safe à relancer, et couvre les 3 rôles clés (Seller, Buyer, Admin).

---

## 2. Dataset demo — État final

### Sellers (9 APPROVED)
Coopératives et producteurs fictifs de Mayotte : vanille, ylang-ylang, thon, mangue, café, miel.  
Tous avec descriptions, régions, incoterms, et certifications.

### Produits (13 PUBLISHED)
| Slug | Catégorie | Seller |
|---|---|---|
| demo-vanille-bourbon-grade-a | Épice | demo-coop-vanille |
| demo-vanille-poudre | Épice | demo-coop-vanille |
| demo-ylang-extra | Huile essentielle | demo-ylang-bandrele |
| demo-thon-jaune-iqf | Poisson | demo-pecheurs-mayotte |
| demo-mangue-maya | Fruit | demo-fruits-tsingoni |
| ... | ... | ... |

### QuoteRequests (3)
| SeedKey | Produit | Statut | Montant |
|---|---|---|---|
| rfq-vanille-poudre-init | demo-vanille-poudre | NEW | — |
| rfq-mangue-maya-quoted | demo-mangue-maya | QUOTED | — |
| rfq-ylang-extra-won | demo-ylang-extra | WON | 2 400,00 EUR |

### Paiements & Factures (M62-DEMO)
| Entité | Identifiant | Statut | Montant |
|---|---|---|---|
| Payment | stripePaymentIntentId: `pi_demo_rfq-ylang-extra-won` | SUCCEEDED | 2 400,00 EUR |
| Invoice | `INV-DEMO-RFQYLANGEX` | ISSUED | 2 400,00 EUR |

### Documents de conformité smoke-seller (M62-DEMO)
| Document | Type | Statut |
|---|---|---|
| Certificat phytosanitaire 2026 | PHYTOSANITARY_CERTIFICATE | VERIFIED ✅ |
| Demande certification bio AB 2026 | ORGANIC_CERTIFICATE | PENDING ⏳ |
| Licence export — dossier incomplet | EXPORT_LICENSE | REJECTED ❌ |

---

## 3. Fichiers modifiés

### `apps/backend/src/seed-demo/dataset.ts`
- Ajout de la 3ème RFQ : `rfq-ylang-extra-won` (statut WON, paymentAmountCents 240000)
- Extension type `DemoQuoteRequest` : `status` → `'WON'`, champs `paymentAmountCents?` et `paymentCurrency?`

### `apps/backend/src/seed-demo/runner.ts`
- Import `InvoiceStatus`, `PaymentStatus` depuis `@prisma/client`
- `RunnerOptions.prisma` Pick : ajout `| 'payment' | 'invoice'`
- `RunnerSummary` : ajout `payments`, `invoices`, `sellerComplianceDocs`
- Compteurs `paymentsCount`, `invoicesCount` dans la boucle RFQ
- **Seeding Payment SUCCEEDED** (idempotent via `findFirst({ where: { quoteRequestId } })`)
- **Seeding Invoice ISSUED** (idempotent via `findFirst({ where: { paymentId } })`)
- **Seeding 3 compliance docs** PRIVATE/SELLER_PROFILE pour le smoke-seller (VERIFIED + PENDING + REJECTED)
- Log final et return statement mis à jour

### `apps/backend/src/seed-demo/seed-demo.spec.ts`
- `MockedPrisma` : ajout `payment` et `invoice`
- `makePrismaMock` : options `paymentExists?` et `invoiceExists?`, mocks correspondants
- Constantes `WON_RFQ_COUNT = 1` et `COMPLIANCE_DOCS_COUNT = 3`
- Mise à jour test cardinalité : `payments: WON_RFQ_COUNT`, `invoices: WON_RFQ_COUNT`, `sellerComplianceDocs: COMPLIANCE_DOCS_COUNT`
- Test PUBLIC docs : filtre par `visibility === 'PUBLIC'` (compliance docs sont PRIVATE)
- Test idempotent : `marketplaceDocument.update` = `publicDocs + COMPLIANCE_DOCS_COUNT`
- Titre RFQ test : "crée 2 RFQ + 4 messages" → "crée N RFQ + 2N messages"
- Ajout seedKey `rfq-ylang-extra-won` dans targetMarkets assertion
- **Nouveau describe** `M62-DEMO` : 3 tests (Payment créé / idempotent / compliance docs)

### Fichiers créés
- `notes/demo-script-investisseur-client.md` — Script de démonstration (5/10/20 min + Q&A)
- `notes/demo-runbook-technique.md` — Runbook démarrage local, seed, troubleshooting
- `notes/handoff-mandat-61-smoke-tests-preprod.md`
- `notes/handdat-mandat-62-demo-packaging.md` (ce fichier)

---

## 4. Tests

```
cd apps/backend
npx jest --no-coverage
→ 87 suites, 1003 tests, 0 failures

npx tsc --noEmit
→ 0 errors
```

Seed-demo spécifiquement :
```
→ 22 tests, 0 failures
  - safeguards (3)
  - exécution gardée (2)
  - MediaAssets (3)
  - FP-5/FP-7/FP-8 (5)
  - smoke seller (1)
  - SEED-DEMO-FIX-3 docs + RFQ (5)
  - M62-DEMO Payment + Invoice + compliance (3)
```

---

## 5. Critères de succès

| Critère | Statut |
|---|---|
| Demo fluide 10-20 min | ✅ Script créé avec timing |
| Données réalistes (9 sellers, 13 produits) | ✅ |
| Parcours bout-en-bout : RFQ → WON → Paiement → Facture | ✅ |
| Conformité vendeur démontrée (3 statuts) | ✅ |
| Seed idempotent et safe | ✅ |
| Pas de secrets exposés | ✅ (mots de passe hors dataset, seedKey non sensibles) |
| Tests verts | ✅ 1003/1003 |

---

## 6. Utilisation

```bash
# Démarrer la démo (voir runbook complet)
cd apps/backend
IOX_DEMO_SEED=1 npm run seed:demo

# Comptes démo
smoke-seller@iox.mch   / IoxSmoke2026!   (MARKETPLACE_SELLER)
smoke-buyer@iox.mch    / IoxSmoke2026!   (MARKETPLACE_BUYER)
```

---

## 7. Risques restants

| Risque | Criticité | Notes |
|---|---|---|
| Images MediaAssets sont des placeholders placehold.co | Faible | Suffisant pour démo — pas de bucket S3 requis |
| PDF Invoice non générée pour la facture demo | Faible | Le PDF est généré à la demande (GET /invoices/:id/pdf) — disponible en live |
| Stripe intent factice (`pi_demo_*`) | Intentionnel | Uniquement pour démo — aucun vrai paiement |

---

## 8. Prochain mandat recommandé

**Mandat 63** (suggestion) : 
- Option A : Compléter `@ApiResponse` sur les 30 controllers secondaires (beneficiaries, products, batches...)
- Option B : Premiers endpoints API v2 pour app mobile (versioning, `addServer()`)
- Option C : Cleanup + commit + PR de la branche `mandat-55B` vers `main`
