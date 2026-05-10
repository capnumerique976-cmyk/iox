# IOX — Fiche de synthèse

**Version :** Mai 2026 · Une page · Confidentiel

---

## En une phrase

**IOX** est la marketplace B2B qui connecte les producteurs de Mayotte aux acheteurs internationaux — du catalogue certifié à la facture PDF, sans intermédiaire.

---

## Le problème

Mayotte (DOM français, 1er producteur mondial d'ylang-ylang) exporte des produits d'exception sans outils B2B. Devis informels, paiements par virement, aucune traçabilité documentaire.

---

## La solution

Plateforme complète : catalogue structuré · RFQ + messagerie · paiement Stripe Connect · facturation PDF · conformité documentaire (VERIFIED / PENDING / REJECTED).

---

## Statut produit ✅

| | |
|---|---|
| Backend (NestJS) | **1 016 tests · 0 failure · TSC clean** |
| API | **186 endpoints · Swagger complet** |
| Parcours validé | **RFQ → WON → Paiement → Facture PDF** |
| Démo live | **9 sellers · 13 produits · seed idempotent** |
| Frontend (Next.js) | **Catalogue · Buyer · Seller · Admin · 508 tests** |
| PWA | **Installable Android/iOS · manifest · icônes** |
| Pages légales | **CGU · Confidentialité · Mentions légales** |

---

## Business model

**Commission 5%** par transaction via Stripe Connect (automatique, pas de facture manuelle).  
Exemple : 2 400 EUR → IOX : 120 EUR → Vendeur : 2 280 EUR.

**Extensions [HYPOTHÈSE] :** Abonnement vendeur premium · Certification assistée · API white-label

---

## Traction [HYPOTHÈSE]

| Horizon | Objectif |
|---|---|
| Q2 2026 | 3-5 coopératives pilotes réelles onboardées |
| Q3 2026 | 10 transactions réelles — validation unit economics |
| Q4 2026 | 30+ vendeurs actifs |

*Les données de la démo sont fictives. La traction commerciale réelle sera communiquée au closing.*

---

## Marché cible

**Vendeurs :** Coopératives et producteurs de Mayotte (vanille, ylang-ylang, thon, mangue, café, miel)  
**Acheteurs :** Importateurs EU, cosmétique, parfumerie, épiceries fines, agroalimentaire  
**Extension géographique [HYPOTHÈSE] :** Réunion · Martinique · Guadeloupe · Afrique subsaharienne

---

## Stack technique

NestJS · Prisma · PostgreSQL · Redis · MeiliSearch · Next.js · Stripe Connect · MinIO

---

## Avantages concurrentiels

✅ Spécialisation Mayotte — réseau local, confiance producteurs  
✅ Conformité documentaire structurée (barrière à l'entrée forte)  
✅ DOM français — réglementation EU, Stripe disponible  
✅ Produit fonctionnel livré — pas de build à financer  
✅ PWA installable (terrain, smartphone, sans app store)  
✅ Pages légales intégrées (CGU, RGPD, mentions légales)  

---

## Ce qu'on cherche

**Levée :** [Montant — HYPOTHÈSE]  
**Use of funds :** Business dev (40%) · Tech (30%) · Marketing (15%) · Infra/Ops (10%) · Juridique (5%)  
**Contact :** [Nom · email · tel]

---

## Documents disponibles

| Document | Contenu |
|---|---|
| `deck-investisseur-iox.md` | 12 slides complet |
| `business-model-iox.md` | Modèle économique détaillé |
| `roadmap-produit-iox.md` | Ce qui est construit + roadmap |
| `faq-investisseurs-iox.md` | 30 questions/réponses |
| `demo-script-investisseur-client.md` | Script démo live 5/10/20 min |
| `demo-runbook-technique.md` | Démarrage technique complet |

---

> *[HYPOTHÈSE] = projection non validée commercialement · [CONSTRUIT] = livré, testé, validé*
