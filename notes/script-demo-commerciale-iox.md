# IOX — Script démo commerciale

**Date :** 2026-05-10  
**Public :** Client potentiel (acheteur ou vendeur), partenaire commercial, distributeur  
**Durée :** 15 min (standard) / 30 min (approfondie)  
**Prérequis :** Backend sur :3001, frontend sur :3000, seed démo lancé

---

## Préparation avant la réunion

```bash
# 1. Seed démo (idempotent — safe à relancer)
cd /repo && IOX_DEMO_SEED=1 npx tsx prisma/seed-demo.ts

# 2. Démarrer le backend
cd apps/backend && node dist/main.js

# 3. Démarrer le frontend
cd apps/frontend && npm run dev

# 4. Vérifier (30 s)
curl http://localhost:3001/api/v1/marketplace/catalog/stats
# → {"products":13,"sellers":9,"countries":1}
```

**Comptes prêts :**
- `smoke-buyer@iox.mch` / `IoxSmoke2026!`
- `smoke-seller@iox.mch` / `IoxSmoke2026!`
- `admin@iox.mch` / `Admin@IOX2026!`

---

## Script 15 minutes — Demo standard

### Intro (2 min) — Contexte

*Parlez sans écran. Établissez le contexte avant de montrer quoi que ce soit.*

> "Je vais vous montrer IOX — une plateforme B2B qui relie les producteurs de Mayotte aux acheteurs internationaux.
>
> Mayotte, c'est le premier producteur mondial d'ylang-ylang, et une filière vanille Bourbon d'exception. Ces producteurs ont des produits remarquables, mais aucun outil numérique pour les exporter efficacement.
>
> IOX résout ça. Je vais vous montrer le parcours complet — de la découverte d'un produit à la facture signée — en moins de 15 minutes."

---

### Partie 1 — Le Catalogue (3 min)

**URL :** `http://localhost:3000/marketplace`

*Ouvrir le catalogue sans être connecté (vue publique)*

> "Voici ce qu'un acheteur voit en arrivant sur IOX. 13 produits certifiés, avec photos, filtres par catégorie et par certification.
>
> Ici — la Vanille Bourbon de Mayotte, Grade A. 420 EUR/kg, FOB Mamoudzou, délai 14 jours. La fiche produit inclut les incoterms, la capacité de production mensuelle, les certifications actives.
>
> Tout est structuré, tout est vérifiable. Ce n'est pas une annonce classifiée — c'est une fiche produit professionnelle."

**Points à souligner :**
- Photos produits (MediaAssets validées par l'admin)
- Incoterms configurables (FOB, CIF, EXW...)
- Certifications visibles (COSMOS, BIO AB, phytosanitaire)
- Filtres : catégorie, certification, export-ready

---

### Partie 2 — Côté Acheteur : RFQ & Transaction (5 min)

**Connexion :** `smoke-buyer@iox.mch`

*Naviguer vers `/buyer/quote-requests`*

> "Je me connecte en tant qu'acheteur européen — Acme Foods Importer. Je vois mes 3 demandes de devis en cours."

**Montrer les 3 RFQ :**

1. **rfq-vanille-poudre-init (NEW)**
> "Demande fraîche — j'ai demandé 10 kg de poudre de vanille. Le vendeur n'a pas encore répondu. Je peux voir le message initial que j'ai envoyé."

2. **rfq-mangue-maya-quoted (QUOTED)**
> "Ici — la coopérative fruits de Tsingoni a répondu avec un devis : 1 850 EUR/tonne, valable 30 jours. Je peux accepter ou négocier."

3. **rfq-ylang-extra-won (WON)**
> "Et voici la transaction complète. 2 kg de Vanille Bourbon Grand Cru — 2 400 EUR — statut WON. Le paiement est SUCCEEDED via Stripe Connect. La facture est émise."

*Ouvrir la facture : `/buyer/invoices`*

> "La facture INV-DEMO-RFQYLANGEXTR, 2 400,00 EUR — générée automatiquement. Je peux la télécharger en PDF."

*Ouvrir le PDF*

> "Document fiscal complet. Zéro papier, zéro email, zéro délai."

**Points à souligner :**
- Fil de messages par RFQ (2 messages échangés)
- Statuts clairs : NEW → QUOTED → WON
- Facture PDF immédiate
- Traçabilité complète

---

### Partie 3 — Côté Vendeur : Dashboard & Conformité (3 min)

**Connexion :** `smoke-seller@iox.mch`

*Naviguer vers `/seller/compliance`*

> "Du côté vendeur — la Coopérative Vanille de Mayotte. Voici le tableau de bord de conformité documentaire."

**Montrer les 3 documents :**
- ✅ **Certificat phytosanitaire 2026** — VERIFIED
- ⏳ **Certification bio AB** — PENDING (en cours de vérification)
- ❌ **Licence export** — REJECTED (dossier incomplet)

> "Le vendeur voit en temps réel le statut de ses documents. L'admin IOX vérifie, approuve ou rejette avec commentaire. C'est la clé de confiance pour l'acheteur — il sait que les produits qu'il achète sont conformes."

*Naviguer vers `/seller/invoices`*

> "Et voici les factures du vendeur — la même transaction, vue vendeur. 2 280 EUR nets après commission IOX de 5% (120 EUR)."

*Naviguer vers `/seller/quote-requests`*

> "Les RFQs sont scopées — le vendeur ne voit que les demandes qui concernent ses produits."

---

### Partie 4 — Synthèse & Q&A (2 min)

> "En résumé :
> - L'acheteur découvre, envoie une RFQ, reçoit un devis, paye, reçoit sa facture
> - Le vendeur gère sa conformité, répond aux RFQs, reçoit les fonds directement
> - IOX garantit la traçabilité et prend 5% de commission
>
> Tout ça, sans intermédiaire humain, sans papier, en temps réel.
>
> Des questions ?"

---

## Script 30 minutes — Démo approfondie

Reprendre les 4 parties ci-dessus, puis ajouter :

### Partie 5 — Admin & Modération (5 min)

**Connexion :** `admin@iox.mch`

*Naviguer vers `/admin/marketplace/review-queue`*

> "L'équipe IOX a un panneau d'administration complet. Review queue pour approuver les nouveaux produits."

*Naviguer vers `/admin/compliance`*

> "Vue agrégée de la conformité de tous les vendeurs. Aujourd'hui : 9 vendeurs approuvés, 1 document pending, 1 rejeté."

*Naviguer vers `/admin/dashboard`*

> "Dashboard d'alertes — RFQs stales (sans transition depuis >7 jours), métriques marketplace."

---

### Partie 6 — API & Technique (5 min, pour audience tech)

*Ouvrir `http://localhost:3001/api/docs`*

> "186 endpoints documentés, 26 modules. JWT, Stripe webhooks signés HMAC, rate limiting, 1 003 tests automatisés, TypeScript strict.
>
> L'ajout d'une app mobile ? Un `addServer()` dans Swagger et des endpoints v2 — l'architecture est prête."

**Montrer :**
- Tags : payments, invoices, marketplace - quote requests, compliance
- Webhook Stripe (signature HMAC)
- Authentification JWT Bearer

---

### Partie 7 — Personnalisation / Onboarding (5 min)

> "Pour onboarder votre coopérative, le processus est simple :
> 1. Création du compte vendeur
> 2. Soumission du profil (admin approuve en 24h)
> 3. Ajout des produits (photos, certifications, prix)
> 4. Configuration Stripe Connect (paiements)
> 5. Go live — visible par les acheteurs mondiaux
>
> Pas de code, pas d'intégration, pas d'intermédiaire."

---

## Objections courantes & réponses

| Objection | Réponse |
|---|---|
| "On a déjà un site web" | IOX n'est pas un site web — c'est un canal de vente B2B structuré avec devis, paiement et conformité intégrés. |
| "On vend déjà en direct aux acheteurs" | IOX formalise et sécurise les transactions existantes — devis PDF, paiement sécurisé, facture auto. Moins de risque, plus de confiance acheteur. |
| "La commission de 5% est élevée" | Pas d'intermédiaire humain (15-30%), pas de virement bancaire lent, facture auto, conformité garantie — le 5% est le coût de la plateforme complète. |
| "Les acheteurs ne connaissent pas Mayotte" | IOX construit la notoriété — catalogue SEO, présence salons export, réseau acheteurs. |
| "On n'est pas à l'aise avec le numérique" | Onboarding assisté prévu. L'interface est simple, la formation dure 2h. |

---

*Pour le pitch court : `pitch-iox-30s-2min.md`  
Pour les questions investisseurs : `faq-investisseurs-iox.md`*
