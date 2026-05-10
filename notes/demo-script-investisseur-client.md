# Script de démonstration IOX — Investisseur / Client

**Date :** 2026-05-10  
**Durée recommandée :** 10 min (pitch) / 20 min (démo complète) / 5 min (version courte)  
**Public :** Investisseur, client potentiel, partenaire technique

---

## 1. Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Vendeur (Seller) | `smoke-seller@iox.mch` | `IoxSmoke2026!` |
| Acheteur (Buyer) | `smoke-buyer@iox.mch` | `IoxSmoke2026!` |
| Admin | `admin@iox.mch` | *(voir .env local)* |

> Tous les comptes sont pré-seedés par `IOX_DEMO_SEED=1 npm run seed:demo`.

---

## 2. Version 5 minutes (pitch rapide)

**Message clé :** IOX connecte les producteurs de Mayotte à l'import mondial — de la vitrine à la facture, tout en ligne.

1. Ouvrir le catalogue public (`/marketplace`) — montrer 13 produits PUBLISHED avec photos
2. Cliquer sur **Vanille Bourbon Grand Cru** — montrer la fiche produit (GPS, certifications, qualité)
3. Switcher sur le compte **Buyer** — montrer la RFQ WON pour l'Ylang-Ylang Extra (statut `WON`, paiement `SUCCEEDED`)
4. Ouvrir la facture PDF — montrer `INV-DEMO-RFQYLANGEX`, 2 400,00 EUR, statut `ISSUED`
5. **Conclure :** "De la demande de devis à la facture, sans aucun papier."

---

## 3. Version 10 minutes (investisseur)

### A. Contexte (1 min)
"Mayotte est le 1er producteur mondial d'ylang-ylang et dispose d'une filière vanille, mangue, thon de qualité export. IOX est la plateforme B2B qui donne à ces producteurs accès aux acheteurs européens — avec traçabilité, paiements sécurisés Stripe Connect et conformité documentaire."

### B. Catalogue & Fiche produit (2 min)
- URL : `/marketplace`
- Montrer les filtres (catégorie, certifications, export-ready)
- Ouvrir **Vanille Bourbon de Mayotte — Grade A** — Coopérative Vanille de Mayotte, FOB Mamoudzou, 420 EUR/kg
- Insister sur : qualité structurée (FP-7), logistique (FP-8), capacité (FP-5)

### C. Parcours Acheteur — RFQ & Messagerie (3 min)
1. Login `smoke-buyer@iox.mch`
2. Aller sur `/buyer/quote-requests`
3. Montrer les 3 RFQ :
   - **rfq-vanille-poudre-init** : statut `NEW` — demande fraîche, message échangé
   - **rfq-mangue-maya-quoted** : statut `QUOTED` — devis 1850 EUR/tonne, validité 30j
   - **rfq-ylang-extra-won** : statut `WON` ✅ — transaction complète
4. Ouvrir le fil de discussion de la RFQ Vanille Grand Cru — montrer les 2 messages
5. Montrer la facture : `/buyer/invoices` → `INV-DEMO-RFQYLANGEXTR`, 2 400,00 EUR

### D. Parcours Vendeur — Dashboard & Conformité (2 min)
1. Login `smoke-seller@iox.mch`
2. Aller sur `/seller/compliance` — montrer les 3 documents :
   - ✅ **Certificat phytosanitaire** — VERIFIED
   - ⏳ **Certification bio AB** — PENDING
   - ❌ **Licence export** — REJECTED (dossier incomplet)
3. Aller sur `/seller/invoices` — montrer la facture émise (2 400,00 EUR)
4. Montrer `/seller/quote-requests` — vue scoped (le vendeur ne voit que ses RFQ)

### E. Paiements Stripe Connect (1 min)
"Le flux Stripe Connect versement les fonds au vendeur après déduction de la commission IOX de 5% (120 EUR sur cette transaction). Le vendeur reçoit 2 280 EUR directement sur son compte Stripe."

### F. KPIs / Traction (1 min)
- 9 sellers APPROVED sur la plateforme
- 13 produits PUBLISHED (vanille, ylang, thon, mangue, café, miel)
- 100% des transactions couvertes par facture numérique et audit trail

---

## 4. Version 20 minutes (démo complète)

Reprendre les étapes A-F ci-dessus plus :

### G. Admin — Modération & Alertes (3 min)
1. Login `admin@iox.mch`
2. Aller sur `/admin/marketplace/review-queue` — produits en attente d'approbation
3. Aller sur `/admin/compliance` — vue agrégée de conformité des vendeurs
4. Aller sur `/admin/marketplace-alerts` ou `/dashboard` — alertes stales RFQ (>7j sans transition)

### H. API Technique (2 min, pour audience tech)
- Ouvrir `http://localhost:3001/api/docs` (Swagger)
- Montrer les tags : payments, invoices, marketplace - quote requests, compliance
- Montrer la documentation du webhook Stripe : signature HMAC, events listés
- Insister sur : JWT + Rôles documentés, 1003 tests backend, TSC clean

### I. Mobile-Ready / Extensibilité (1 min)
"L'API NestJS est versionnée. L'ajout d'une app mobile revient à ajouter un `addServer()` dans Swagger et des endpoints `/v2`."

---

## 5. Questions / Réponses anticipées

| Question | Réponse |
|---|---|
| "Vrais producteurs ?" | Les 9 sellers demo sont fictifs mais basés sur des coopératives réelles de Mayotte. La donnée de production (800 kg vanille/an, etc.) est réaliste. |
| "Stripe est live ?" | Stripe Connect est intégré en mode test. La config live nécessite les clés prod Stripe — 1 heure de déploiement. |
| "Multilangue ?" | Le backend supporte `fr-FR` natif. L'internationalisation frontend est en feuille de route M63+. |
| "Volume de transactions ?" | Architecture Prisma/PostgreSQL scalable. Le throttling (5 créations RFQ/min par IP) est configuré. |
| "Sécurité ?" | JWT access/refresh, Swagger désactivé en prod, secrets hors dépôt Git (`.env`), webhook Stripe signé HMAC. |
| "Données réelles ?" | Les données demo sont préfixées `demo-` et isolées. Un script de cleanup ciblé est disponible. |

---

## 6. Urls clés (dev local)

| Page | URL |
|---|---|
| Catalogue public | `http://localhost:3000/marketplace` |
| Connexion | `http://localhost:3000/login` |
| Buyer — RFQs | `http://localhost:3000/buyer/quote-requests` |
| Buyer — Factures | `http://localhost:3000/buyer/invoices` |
| Seller — Conformité | `http://localhost:3000/seller/compliance` |
| Seller — Factures | `http://localhost:3000/seller/invoices` |
| Admin — Dashboard | `http://localhost:3000/admin/dashboard` |
| Swagger API | `http://localhost:3001/api/docs` |
