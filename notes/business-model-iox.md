# IOX — Business Model

**Date :** 2026-05-10  
**Statut :** Produit fonctionnel — Commercialisation à lancer

> **Convention :** Les données marquées [HYPOTHÈSE] sont des projections ou estimations. Elles n'ont pas été validées commercialement.

---

## 1. Proposition de valeur

| Pour | Problème résolu | Valeur IOX |
|---|---|---|
| Producteurs / coopératives de Mayotte | Pas d'accès numérique aux marchés mondiaux | Vitrine B2B, RFQ structurée, paiement sécurisé, conformité documentaire |
| Acheteurs internationaux | Sourcing opaque, intermédiaires multiples, risque qualité | Catalogue certifié, devis formalisé, traçabilité, facture numérique |
| Admin / Opérateur IOX | Modération manuelle chronophage | Dashboard centralisé, review queue, alertes automatiques |

---

## 2. Flux de revenus

### Flux principal — Commission transactionnelle

```
Acheteur paye 2 400 EUR
     ↓
Stripe Connect
     ↓
IOX retient 5% = 120 EUR  ←── Revenu IOX
     ↓
Vendeur reçoit 2 280 EUR
```

**Taux de commission :** 5% (implémenté dans le runner seed-demo, configurable)  
**Prélèvement :** Automatique via Stripe Connect `applicationFeeCents`  
**Devise :** EUR (extensible multi-devise via champ `currency`)

### Flux secondaires [HYPOTHÈSE]

| Flux | Description | Modèle |
|---|---|---|
| Abonnement vendeur Premium | Accès fonctionnalités avancées, mise en avant catalogue | 49–149 EUR/mois |
| Certification assistée | Aide au dossier phytosanitaire, bio, export | 200–500 EUR/dossier |
| Leads acheteurs qualifiés | Mise en relation proactive avec acheteurs européens | À la mise en relation |
| API white-label | Accès API pour CRM / ERP acheteurs institutionnels | Licence SaaS |

---

## 3. Structure de coûts

### Coûts techniques (infrastructure)
| Composant | Outil | Coût estimé/mois [HYPOTHÈSE] |
|---|---|---|
| Base de données | PostgreSQL managed | 30–100 EUR |
| Cache | Redis managed | 15–50 EUR |
| Recherche | MeiliSearch Cloud | 30–100 EUR |
| Stockage fichiers | MinIO / S3 | 10–50 EUR |
| Hébergement backend | Railway / Render / VPS | 30–100 EUR |
| Hébergement frontend | Vercel | 0–20 EUR |
| **Total infra** | | **~115–420 EUR/mois** |

### Coûts opérationnels [HYPOTHÈSE]
- Onboarding vendeurs (assisté)
- Modération conformité documentaire
- Support acheteurs

---

## 4. Projections financières [HYPOTHÈSE]

> Ces projections sont indicatives. Elles reposent sur des hypothèses non validées commercialement.

### Hypothèses de base
- Valeur moyenne d'une transaction : **2 000 EUR**
- Commission IOX : **5% → 100 EUR/transaction**
- Délai de ramping : progressive

| Scénario | Transactions/mois | GMV mensuel | Revenu commissions |
|---|---|---|---|
| An 1 — Démarrage | 10–30 | 20k–60k EUR | 1 000–3 000 EUR |
| An 2 — Croissance | 50–150 | 100k–300k EUR | 5 000–15 000 EUR |
| An 3 — Maturité | 200–500 | 400k–1M EUR | 20 000–50 000 EUR |

**Point de rentabilité [HYPOTHÈSE] :** ~100 transactions/mois (avec coûts fixes ~8k EUR/mois équipe + infra)

---

## 5. Unité économique (unit economics) [HYPOTHÈSE]

| Métrique | Hypothèse |
|---|---|
| CAC vendeur | 50–200 EUR |
| CAC acheteur | 100–400 EUR |
| LTV vendeur (3 ans) | 1 000–5 000 EUR (commissions générées) |
| LTV acheteur | 500–2 000 EUR |
| LTV/CAC cible | > 3x |
| Churn annuel estimé | 15–25% |

---

## 6. Avantages concurrentiels

| Avantage | Description |
|---|---|
| Spécialisation géographique | Focus Mayotte — producteurs connus, relations directes |
| DOM français | Réglementation EU, facturation conforme, Stripe disponible |
| Produit fonctionnel | Plateforme complète livrée — pas de développement initial à financer |
| Barrière documentaire | Conformité phytosanitaire, bio, licences = barrière à l'entrée forte |
| Network effect | Chaque nouveau vendeur enrichit le catalogue pour tous les acheteurs |

---

## 7. Risques

| Risque | Probabilité | Mitigation |
|---|---|---|
| Adoption lente des vendeurs (faible maturité digitale) | Élevée | Onboarding assisté, formation, interface mobile-first |
| Paiements Stripe bloqués (KYC vendeurs) | Moyenne | Anticipation dossiers KYC, support Stripe Connect |
| Concurrence marketplace agro généraliste | Moyenne | Spécialisation + relations locales |
| Réglementation export Mayotte | Faible | Conformité documentaire intégrée dans le produit |
| Saisonnalité produits | Élevée | Diversification catégories (vanille, ylang, thon, mangue, miel) |

---

*Voir aussi : `roadmap-produit-iox.md`, `faq-investisseurs-iox.md`*
