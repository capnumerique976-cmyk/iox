# Runbook technique — Démo IOX

**Date :** 2026-05-10  
**Environnement :** Dev local / Pré-prod  
**Prérequis :** Node 20+, pnpm, PostgreSQL, Stripe CLI (optionnel)

---

## 1. Démarrage rapide (3 étapes)

```bash
# 1. Dépendances (depuis la racine du monorepo)
pnpm install

# 2. Variables d'environnement
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# Éditer les deux fichiers : DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY...

# 3. Base de données + seed demo
cd apps/backend
npx prisma migrate deploy        # applique toutes les migrations
IOX_DEMO_SEED=1 npm run seed:demo  # peuple le jeu de fixtures

# 4. Lancer les deux apps
pnpm --filter backend start:dev   # port 3001
pnpm --filter frontend dev        # port 3000
```

---

## 2. Variables d'environnement requises

### Backend (`apps/backend/.env`)

```env
# Base de données
DATABASE_URL="postgresql://iox:iox@localhost:5432/iox_dev"

# JWT
JWT_SECRET="change-me-in-production-min-32-chars"
JWT_REFRESH_SECRET="change-me-refresh-min-32-chars"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CONNECT_CLIENT_ID="ca_..."

# Seed demo
# IOX_DEMO_SEED=1   # décommenter pour activer le seed demo
# SMOKE_SELLER_PASSWORD=IoxSmoke2026!  # optionnel (défaut: IoxSmoke2026!)

# App
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

### Frontend (`apps/frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

---

## 3. Seed demo — Détail

```bash
cd apps/backend

# Seeder complet (idempotent — safe à relancer)
IOX_DEMO_SEED=1 npm run seed:demo

# Sortie attendue :
# 🌱 Demo seed starting…
# ✅ Demo seed done — sellers: 9, products: 13, offers: 13, certifications: N,
#    mediaAssets: 13, publicDocs: N, quoteRequests: 3, rfqMessages: 6,
#    payments: 1, invoices: 1, sellerComplianceDocs: 3,
#    smokeSeller: smoke-seller@iox.mch, smokeBuyer: smoke-buyer@iox.mch
```

**Ce que le seed crée :**

| Entité | Quantité | Détail |
|---|---|---|
| Companies (sellers) | 9 | Coopératives et producteurs Mayotte |
| SellerProfiles APPROVED | 9 | Avec descriptions, régions, incoterms |
| MarketplaceProducts PUBLISHED | 13 | Vanille, ylang, thon, mangue, café, miel... |
| MarketplaceOffers | 13 | 1 offre principale par produit |
| Certifications | N | COSMOS, BIO, ISO rattachés |
| MediaAssets PRIMARY APPROVED | 13 | Placeholders placehold.co |
| MarketplaceDocuments PUBLIC | N | Fiches techniques et phytosanitaires |
| User smoke-seller | 1 | `smoke-seller@iox.mch` / MARKETPLACE_SELLER |
| User smoke-buyer | 1 | `smoke-buyer@iox.mch` / MARKETPLACE_BUYER |
| QuoteRequests | 3 | NEW + QUOTED + WON |
| QuoteRequestMessages | 6 | 2 par RFQ |
| Payment SUCCEEDED | 1 | 2 400,00 EUR — RFQ Vanille Bourbon Grand Cru WON |
| Invoice ISSUED | 1 | INV-DEMO-RFQYLANGEX |
| MarketplaceDocuments PRIVATE (conformité) | 3 | VERIFIED + PENDING + REJECTED pour smoke-seller |

**Idempotence :** Toutes les entités ont une clé naturelle préfixée `demo-`. Relancer le seed = 0 doublon.

**Cleanup ciblé :**
```sql
-- Supprimer uniquement les entités demo (préfixe 'demo-')
DELETE FROM seller_profiles WHERE slug LIKE 'demo-%';
DELETE FROM companies WHERE code LIKE 'DEMO-%';
-- etc. (attention aux FK — supprimer dans l'ordre inverse de création)
```

---

## 4. Commandes utiles

```bash
# Backend
cd apps/backend
npm run start:dev          # dev avec hot-reload
npm run start:prod         # production
npx jest --no-coverage     # 1003 tests
npx tsc --noEmit           # vérification TypeScript

# Frontend
cd apps/frontend
npx vitest run             # 512 tests
npm run dev                # Next.js dev server

# Prisma
npx prisma studio          # GUI base de données (localhost:5555)
npx prisma migrate dev     # nouvelle migration
npx prisma generate        # regénérer le client après schema change
```

---

## 5. Architecture des services

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                  │
│  localhost:3000 (Next.js 14 App Router)                   │
│    /marketplace  /buyer/*  /seller/*  /admin/*            │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP + JWT
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Backend NestJS 10                                        │
│  localhost:3001                                           │
│    /api/docs    → Swagger (dev uniquement)                │
│    /api/auth    → JWT access/refresh                      │
│    /api/marketplace/*  → catalog, products, offers, rfq   │
│    /api/payments/*     → Stripe Connect + webhooks        │
│    /api/invoices/*     → PDF + liste scoped               │
│    /api/compliance/*   → conformité vendeurs              │
│    /api/dashboard/*    → alertes marketplace              │
└────────────────────────┬────────────────────────────────┘
                         │ Prisma ORM
                         ▼
┌─────────────────────────────────────────────────────────┐
│  PostgreSQL                                               │
│  localhost:5432/iox_dev                                   │
└─────────────────────────────────────────────────────────┘

                    ┌────────────────────┐
                    │  Stripe (externe)  │
                    │  Connect Payments  │
                    │  Webhooks → /api/  │
                    │  payments/webhook  │
                    └────────────────────┘
```

---

## 6. Swagger

URL : `http://localhost:3001/api/docs` (dev/staging uniquement — désactivé en production)

**Tags principaux :**
- `auth` — login, refresh, logout
- `marketplace - catalog (public)` — catalogue sans auth
- `marketplace - quote requests` — RFQ + FSM + messages
- `payments` — Stripe Connect + checkout + refund + webhook
- `invoices` — liste paginée + PDF
- `compliance` — conformité vendeur/admin
- `dashboard` — alertes marketplace
- `documents` — upload MCH
- `label-validations` — labels qualité

---

## 7. Stripe Webhooks (dev local)

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward vers le backend local
stripe listen --forward-to localhost:3001/api/payments/webhook

# La CLI affiche le WEBHOOK_SECRET → mettre dans .env :
# STRIPE_WEBHOOK_SECRET=whsec_xxxx
```

---

## 8. Troubleshooting

### "Cannot connect to database"
```bash
# Vérifier PostgreSQL actif
pg_isready -h localhost -p 5432

# Créer la DB si manquante
createdb iox_dev
npx prisma migrate deploy
```

### "JWT_SECRET must be at least 32 characters"
Vérifier `.env` — la clé doit faire ≥32 chars.

### "Demo seed skipped"
Vérifier que `IOX_DEMO_SEED=1` est bien passé :
```bash
IOX_DEMO_SEED=1 npm run seed:demo
# ou
export IOX_DEMO_SEED=1 && npm run seed:demo
```

### "MediaAssets 0 dans le catalogue"
Normal si le seed a été lancé sans uploader. Relancer le seed avec IOX_DEMO_SEED=1 après que le smoke-seller existe.

### "Stripe webhook signature invalid"
S'assurer que `STRIPE_WEBHOOK_SECRET` correspond à celui affiché par `stripe listen`. Ne pas utiliser `JSON.parse` sur le body — le webhook lit le raw body.

### Produits PUBLISHED mais non visibles dans catalogue
Vérifier que :
1. `publicationStatus = PUBLISHED`
2. Au moins 1 MediaAsset `role=PRIMARY moderationStatus=APPROVED`
→ Le seed crée ces placeholders automatiquement.

---

## 9. État du code (Mandat 62)

- **Branche :** `mandat-55B`
- **Tests backend :** 1003/1003 (87 suites)
- **Tests frontend :** 512/512 (non re-exécutés — aucun fichier frontend modifié)
- **TSC :** 0 erreurs
- **Swagger :** ~95% coverage controllers, 27 tags, 16 DTOs réponse

---

## 10. Contacts / Ressources

- Handoff M59 (multi-devise) : `notes/handoff-mandat-59-multi-devise.md`
- Handoff M60 (Swagger) : `notes/handoff-mandat-60-swagger-api-docs.md`
- Handoff M61 (smoke tests) : `notes/handoff-mandat-61-smoke-tests-preprod.md`
- Handoff M62 (démo packaging) : `notes/handoff-mandat-62-demo-packaging.md`
- Script démo investisseur : `notes/demo-script-investisseur-client.md`
