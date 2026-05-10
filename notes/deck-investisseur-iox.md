# IOX — Deck Investisseur

**Date :** 2026-05-10  
**Format :** 12 slides Markdown  
**Public :** Investisseur seed / pré-seed, financeur institutionnel, partenaire stratégique

> **Convention :** [CONSTRUIT] = livré et validé. [HYPOTHÈSE] = projection non validée commercialement.

---

## Slide 1 — Couverture

```
╔══════════════════════════════════════════════════╗
║                                                  ║
║                    I O X                         ║
║                                                  ║
║        La marketplace B2B export de Mayotte      ║
║                                                  ║
║   De la vanille Bourbon à la facture signée —    ║
║        tout en ligne, sans intermédiaire.        ║
║                                                  ║
║   [Nom fondateur]  •  [email]  •  2026           ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```

---

## Slide 2 — Le Problème

**Mayotte : des produits d'exception, sans accès au marché mondial.**

Mayotte (DOM français, océan Indien) est le **1er producteur mondial d'ylang-ylang** et dispose d'une filière d'export premium : vanille Bourbon, thon jaune IQF, mangue Maya, café, miel.

**Mais aujourd'hui :**

❌ Pas de vitrine digitale B2B structurée  
❌ Devis échangés par email / téléphone — non formalisés  
❌ Traçabilité documentaire inexistante (certifications, phytosanitaire)  
❌ Paiements internationaux via virement bancaire lent et risqué  
❌ Les acheteurs européens ne savent pas où sourcer  

**Résultat :** Les producteurs restent captifs des intermédiaires. Le potentiel export est sous-exploité.

---

## Slide 3 — La Solution

**IOX est la plateforme marketplace B2B complète pour l'export des produits de Mayotte.**

```
Producteur                              Acheteur
(Mayotte)                               (Europe / monde)
    │                                        │
    ▼                                        ▼
┌───────────────────────────────────────────────────┐
│                     IOX                           │
│                                                   │
│  📋 Catalogue   →  📩 RFQ  →  💬 Devis  →  ✅ WON │
│                                                   │
│       💳 Paiement Stripe Connect                  │
│                                                   │
│       🧾 Facture PDF automatique                  │
│                                                   │
│       📄 Conformité documentaire                  │
└───────────────────────────────────────────────────┘
```

**En une phrase :** De la demande de devis à la facture signée, sans papier, sans intermédiaire.

---

## Slide 4 — Le Produit [CONSTRUIT]

**Plateforme complète. Fonctionnelle. Testée.**

| Fonctionnalité | Statut |
|---|---|
| Catalogue structuré (certifications, incoterms, photos) | ✅ Live |
| RFQ + messagerie vendeur-acheteur | ✅ Live |
| Paiements Stripe Connect (split auto commission) | ✅ Live |
| Facturation PDF automatique | ✅ Live |
| Conformité documentaire (VERIFIED / PENDING / REJECTED) | ✅ Live |
| Dashboard admin (review queue, alertes) | ✅ Live |
| API REST documentée (186 endpoints Swagger) | ✅ Live |
| Tests backend : 1 003 / 1 003 — TSC clean | ✅ Live |

> **Démo live disponible.** 9 vendeurs, 13 produits, parcours complet RFQ→paiement→facture.

---

## Slide 5 — La Démo en 3 images

**Image 1 — Catalogue**
```
[ Capture d'écran : catalogue 13 produits filtrés ]
→ "Vanille Bourbon, 420 EUR/kg — FOB Mamoudzou — COSMOS NATURAL"
```

**Image 2 — RFQ WON**
```
[ Capture d'écran : fiche RFQ rfq-ylang-extra-won, statut WON ]
→ "2 400 EUR — 2 kg Vanille Grand Cru — Transaction complète"
```

**Image 3 — Facture**
```
[ Capture d'écran : INV-DEMO-RFQYLANGEXTR, 2 400,00 EUR, ISSUED ]
→ "Facture PDF générée et archivée automatiquement"
```

*Pour la démo complète (10-20 min) : voir `notes/demo-script-investisseur-client.md`*

---

## Slide 6 — Business Model

**Simple. Transparent. Aligné.**

```
┌─────────────────────────────────────────────────┐
│                                                  │
│   Acheteur paye : 2 400 EUR                     │
│                    │                            │
│                    ▼                            │
│           Stripe Connect                        │
│                    │                            │
│       ┌────────────┴────────────┐               │
│       │                        │               │
│   IOX : 120 EUR (5%)     Vendeur : 2 280 EUR    │
│   (revenu IOX)           (net vendeur)          │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Taux de commission :** 5% par transaction  
**Prélèvement :** Automatique via Stripe Connect `applicationFee`  

**Revenus additionnels [HYPOTHÈSE] :**
- Abonnement vendeur Premium : 49–149 EUR/mois
- Services certification assistée
- API white-label pour institutionnels

---

## Slide 7 — Marché & Opportunité [HYPOTHÈSE]

> Note : Les données suivantes sont des estimations. La validation commerciale est en cours.

**Contexte Mayotte :**
- 101 km², ~320 000 habitants, DOM français
- 1er producteur mondial ylang-ylang (50-80% production mondiale)
- Filière vanille Bourbon en développement
- Thon jaune IQF : pêche artisanale structurée

**Opportunité immédiate :**
- Potentiel 50-200 vendeurs actifs à terme (coopératives + producteurs individuels)
- Acheteurs cibles : importateurs européens, épiceries fines, parfumerie, industrie cosmétique

**Extension géographique [HYPOTHÈSE] :**
- Phase 2 : Réunion, Martinique, Guadeloupe (même modèle, DOM français)
- Phase 3 : Afrique subsaharienne francophone

---

## Slide 8 — Traction [CONSTRUIT + HYPOTHÈSE]

**Ce qui est construit et validé [CONSTRUIT] :**

| Métrique | Valeur |
|---|---|
| Vendeurs démo approuvés | 9 |
| Produits publiés | 13 |
| RFQ complètes (WON) | 1 |
| Valeur transaction démo | 2 400 EUR |
| Tests automatisés | 1 003 / 1 003 |
| Endpoints API documentés | 186 |

**Prochaines étapes commerciales [HYPOTHÈSE] :**
- Q2 2026 : Onboarding 3-5 coopératives pilotes réelles
- Q3 2026 : 10 transactions réelles — validation unit economics
- Q4 2026 : 30+ vendeurs actifs

---

## Slide 9 — Équipe

**[À compléter par l'équipe fondatrice]**

| Rôle | Profil | Expertise |
|---|---|---|
| CEO / Fondateur | [Nom] | [Expérience Mayotte / export / agri] |
| CTO / Lead Dev | [Nom] | NestJS, Prisma, Stripe Connect |
| Business Dev | [Nom] | Réseau coopératives Mayotte |

**Conseillers :** [À compléter]

---

## Slide 10 — Concurrence & Différenciation

| | IOX | Marketplace agro généraliste | Exportateur traditionnel |
|---|---|---|---|
| Spécialisation Mayotte | ✅ | ❌ | ❌ |
| RFQ + messagerie intégrée | ✅ | Partiel | ❌ |
| Paiement Stripe Connect | ✅ | Varié | ❌ |
| Conformité documentaire | ✅ | ❌ | Manuel |
| Facturation auto PDF | ✅ | Partiel | Manuel |
| Open source / extensible | ✅ | ❌ | — |

**Barrière à l'entrée :** Confiance locale + conformité documentaire structurée + réseau vendeurs embarqués.

---

## Slide 11 — Use of Funds [HYPOTHÈSE]

> À renseigner par l'équipe. Modèle indicatif.

**Levée recherchée : [montant — HYPOTHÈSE]**

| Poste | % | Usage |
|---|---|---|
| Commercial / Business Dev | 40% | Onboarding vendeurs, prospection acheteurs EU |
| Tech (embauche ou prestataire) | 30% | App mobile, notifs, scale infra |
| Marketing / Contenu | 15% | SEO, réseaux sociaux, salons export |
| Infra & Ops | 10% | Hébergement prod, Stripe live, emails |
| Juridique / Compta | 5% | CGU, RGPD, structuration société |

**Horizon :** 18 mois — Objectif : [N] vendeurs actifs, [N] EUR GMV mensuel [HYPOTHÈSE]

---

## Slide 12 — Conclusion & Call to Action

```
╔══════════════════════════════════════════════════╗
║                                                  ║
║   IOX est prêt.                                 ║
║                                                  ║
║   ✅  Produit fonctionnel — démo live            ║
║   ✅  Architecture solide — 1 003 tests          ║
║   ✅  Business model clair — 5% commission       ║
║   ✅  Marché réel — Mayotte, premier mondial     ║
║        ylang-ylang                              ║
║                                                  ║
║   Il manque : les premiers vrais clients.        ║
║                                                  ║
║   Rejoignez-nous.                               ║
║                                                  ║
║   [Nom]  •  [email]  •  [tel]                   ║
║   Démo live : [URL]                              ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```

---

*Pour la démo live : `notes/demo-script-investisseur-client.md`  
Pour les questions : `notes/faq-investisseurs-iox.md`  
Pour le business model détaillé : `notes/business-model-iox.md`*
