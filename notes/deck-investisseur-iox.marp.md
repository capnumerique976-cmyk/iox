---
marp: true
theme: default
class: lead
paginate: true
backgroundColor: #FFFFFF
color: #1A1A2E
style: |
  :root {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  section {
    background-color: #FFFFFF;
    padding: 48px 56px;
  }
  section.lead {
    background: linear-gradient(135deg, #0F2C5E 0%, #1A5276 100%);
    color: #FFFFFF;
    text-align: center;
    justify-content: center;
    align-items: center;
  }
  section.lead h1 {
    font-size: 3.2em;
    font-weight: 900;
    letter-spacing: 0.12em;
    color: #FFFFFF;
    margin-bottom: 0.2em;
  }
  section.lead h2 {
    font-size: 1.3em;
    font-weight: 300;
    color: #A8D8EA;
    margin-top: 0;
  }
  section.lead p {
    font-size: 1em;
    color: #D0E8F5;
    margin-top: 1.5em;
  }
  section.problem {
    background-color: #FDF6E3;
  }
  section.solution {
    background-color: #F0F8FF;
  }
  section.product {
    background-color: #F8FFF8;
  }
  section.bizmodel {
    background-color: #FFF8F0;
  }
  section.cta {
    background: linear-gradient(135deg, #0F2C5E 0%, #1A5276 100%);
    color: #FFFFFF;
    text-align: center;
    justify-content: center;
    align-items: center;
  }
  section.cta h1 {
    color: #FFFFFF;
    font-size: 2.2em;
  }
  section.cta p {
    color: #A8D8EA;
  }
  h1 {
    color: #0F2C5E;
    font-size: 1.8em;
    font-weight: 800;
    border-bottom: 3px solid #1A5276;
    padding-bottom: 0.3em;
  }
  h2 {
    color: #1A5276;
    font-size: 1.3em;
    font-weight: 600;
  }
  table {
    font-size: 0.78em;
    width: 100%;
    border-collapse: collapse;
  }
  th {
    background: #0F2C5E;
    color: white;
    padding: 8px 12px;
  }
  td {
    padding: 7px 12px;
    border-bottom: 1px solid #E0E0E0;
  }
  tr:nth-child(even) td {
    background: #F5F5F5;
  }
  blockquote {
    border-left: 4px solid #1A5276;
    color: #555;
    font-style: italic;
    padding: 0.5em 1em;
    margin: 1em 0;
    background: #F7FAFC;
  }
  .hypothese {
    color: #888;
    font-size: 0.75em;
  }
  footer {
    font-size: 0.65em;
    color: #999;
  }
---

<!-- _class: lead -->

# IOX

## La marketplace B2B export de Mayotte

De la vanille Bourbon à la facture signée —
tout en ligne, sans intermédiaire.

---

<!-- _class: problem -->

# Le Problème

**Mayotte : produits d'exception, accès mondial inexistant.**

Mayotte (DOM français) est le **1er producteur mondial d'ylang-ylang**.
Filière export premium : vanille Bourbon, thon IQF, mangue, café, miel.

| Ce qui manque | Impact |
|---|---|
| ❌ Vitrine digitale B2B | Acheteurs EU ne savent pas sourcer |
| ❌ Devis formalisés | Pertes de transactions informelles |
| ❌ Traçabilité documentaire | Risque qualité côté acheteur |
| ❌ Paiement international sécurisé | Friction, délais, risques |

> **Résultat :** Les producteurs restent captifs des intermédiaires.  
> Le potentiel export est largement sous-exploité.

---

<!-- _class: solution -->

# La Solution

**IOX connecte producteurs et acheteurs B2B — de bout en bout.**

```
Producteur (Mayotte)          Acheteur (Europe / Monde)
       │                               │
       ▼                               ▼
  ┌────────────────────────────────────────┐
  │              I O X                    │
  │                                       │
  │  📋 Catalogue → 📩 RFQ → 💬 Devis    │
  │                    ↓                  │
  │         ✅ WON → 💳 Stripe Connect    │
  │                    ↓                  │
  │         🧾 Facture PDF automatique    │
  │         📄 Conformité documentaire    │
  └────────────────────────────────────────┘
```

**En une phrase :** De la demande de devis à la facture signée, sans papier.

---

<!-- _class: product -->

# Le Produit ✅ [CONSTRUIT]

**Plateforme complète. Fonctionnelle. Testée.**

| Fonctionnalité | Statut |
|---|---|
| Catalogue (certifications, incoterms, photos) | ✅ Live |
| RFQ + messagerie buyer-seller | ✅ Live |
| Paiements Stripe Connect (split auto 5%) | ✅ Live |
| Facturation PDF automatique | ✅ Live |
| Conformité docs (VERIFIED / PENDING / REJECTED) | ✅ Live |
| Dashboard admin (review queue, alertes) | ✅ Live |
| API REST documentée — 186 endpoints Swagger | ✅ Live |
| 1 003 tests backend / 512 tests frontend | ✅ Live |

> Démo live disponible — 9 vendeurs, 13 produits, parcours complet RFQ→paiement→facture

---

# La Démo en 3 étapes

## 1. Catalogue — 13 produits publiés

> *Vanille Bourbon de Mayotte — Grade A*  
> 420 EUR/kg · FOB Mamoudzou · Certifié COSMOS NATURAL

## 2. RFQ WON — Transaction complète

> *rfq-ylang-extra-won : 2 kg Vanille Grand Cru · 2 400 EUR · WON ✅*  
> Paiement Stripe Connect SUCCEEDED · Commission IOX : 120 EUR (5%)

## 3. Facture PDF — Générée automatiquement

> *INV-DEMO-RFQYLANGEXTR · 2 400,00 EUR · ISSUED*  
> PDF téléchargeable immédiatement · Archivage automatique

---

<!-- _class: bizmodel -->

# Business Model

**Simple. Transparent. Aligné avec les vendeurs.**

```
Acheteur paye : 2 400 EUR
         │
         ▼
  Stripe Connect
         │
   ┌─────┴─────┐
   │           │
IOX : 120 EUR  Vendeur : 2 280 EUR
  (5%)          (net immédiat)
```

**Taux :** 5% par transaction · Prélèvement automatique via Stripe Connect

**Revenus additionnels** *(feuille de route)* :
- Abonnement vendeur Premium : 49–149 EUR/mois
- Certification assistée · API white-label institutionnels

---

# Marché & Opportunité

**Focus immédiat — Mayotte :**

- **1er producteur mondial ylang-ylang** (50–80% production mondiale)
- **DOM français** — réglementation EU, Stripe disponible, facturation conforme
- Filière vanille Bourbon, thon IQF, mangue Maya en développement
- Réseau coopératives structurées, faible maturité digitale = faible concurrence directe

**Extension naturelle** *(feuille de route)* :
- Phase 2 : Réunion, Martinique, Guadeloupe (même modèle DOM)
- Phase 3 : Afrique subsaharienne francophone

> **Note :** Taille de marché à qualifier lors du due diligence. *[HYPOTHÈSE]*

---

# Traction

## Ce qui est construit [CONSTRUIT]

| Métrique | Valeur |
|---|---|
| Vendeurs démo approuvés | 9 |
| Produits publiés | 13 |
| Parcours WON validé | 1 transaction · 2 400 EUR |
| Tests automatisés | 1 003 / 1 003 (0 failure) |
| Endpoints API documentés | 186 |
| TypeScript | Clean |

## Prochaines étapes *(feuille de route)* [HYPOTHÈSE]

- Q2 2026 : Onboarding 3-5 coopératives pilotes réelles
- Q3 2026 : 10 transactions réelles — validation unit economics
- Q4 2026 : 30+ vendeurs actifs

---

# L'Équipe

*[À compléter par l'équipe fondatrice]*

| Rôle | Profil | Expertise |
|---|---|---|
| CEO / Fondateur | [Nom] | [Mayotte / export / agri] |
| CTO / Lead Dev | [Nom] | NestJS · Stripe Connect · Prisma |
| Business Dev | [Nom] | Réseau coopératives Mayotte |

**Conseillers :** *[À compléter]*

---

# Avantages Concurrentiels

| | IOX | Marketplace agro généraliste | Exportateur traditionnel |
|---|---|---|---|
| Spécialisation Mayotte | ✅ | ❌ | ❌ |
| RFQ + messagerie | ✅ | Partiel | ❌ |
| Stripe Connect split | ✅ | Varié | ❌ |
| Conformité documentaire | ✅ | ❌ | Manuel |
| Facturation PDF auto | ✅ | Partiel | Manuel |
| Produit livré & testé | ✅ | — | — |

**Barrière à l'entrée :** Confiance locale + conformité structurée + réseau vendeurs

---

# Use of Funds *[HYPOTHÈSE]*

**Levée recherchée : [montant à renseigner]**

| Poste | % | Usage |
|---|---|---|
| Commercial / Business Dev | 40% | Onboarding vendeurs, prospection EU |
| Tech | 30% | App mobile, notifications, scale infra |
| Marketing / Contenu | 15% | SEO, salons export |
| Infra & Ops | 10% | Hébergement prod, Stripe live |
| Juridique / Compta | 5% | CGU, RGPD, structuration |

**Horizon :** 18 mois — Objectif : [N] vendeurs actifs, [N] EUR GMV mensuel

---

<!-- _class: cta -->

# IOX est prêt.

✅ Produit fonctionnel — démo live  
✅ Architecture solide — 1 003 tests  
✅ Business model clair — 5% commission  
✅ Marché réel — Mayotte, premier mondial ylang-ylang  

**Il manque : les premiers vrais clients.**

---

**Rejoignez-nous.**

*[Nom] · [email] · [tel]*  
*Démo live disponible sur rendez-vous*

---

*Généré le 2026-05-10 · IOX · Confidentiel*  
*[CONSTRUIT] = validé · [HYPOTHÈSE] = projection non validée · [ROADMAP] = prévu*
