---
marp: true
theme: default
paginate: false
size: A4
backgroundColor: #FFFFFF
style: |
  :root {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  section {
    padding: 40px 48px;
    font-size: 0.92em;
  }
  h1 {
    font-size: 2.2em;
    font-weight: 900;
    letter-spacing: 0.1em;
    color: #0F2C5E;
    margin-bottom: 0.1em;
    border-bottom: 4px solid #1A5276;
    padding-bottom: 0.2em;
  }
  h2 {
    font-size: 1em;
    font-weight: 600;
    color: #1A5276;
    margin: 0.8em 0 0.3em;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  table {
    font-size: 0.8em;
    width: 100%;
    border-collapse: collapse;
    margin: 0.3em 0;
  }
  th {
    background: #0F2C5E;
    color: white;
    padding: 5px 10px;
    font-size: 0.85em;
  }
  td {
    padding: 4px 10px;
    border-bottom: 1px solid #E8E8E8;
  }
  tr:nth-child(even) td { background: #F9F9F9; }
  p {
    margin: 0.3em 0;
    line-height: 1.5;
  }
  blockquote {
    border-left: 3px solid #1A5276;
    padding: 0.3em 0.8em;
    color: #555;
    background: #F7FAFC;
    margin: 0.5em 0;
    font-size: 0.9em;
  }
  footer {
    font-size: 0.65em;
    color: #999;
    text-align: center;
  }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2em;
  }
---

# IOX

## La marketplace B2B export de Mayotte · Fiche de synthèse · Mai 2026 · Confidentiel

---

## En une phrase

**IOX** connecte les producteurs de Mayotte aux acheteurs internationaux — du catalogue certifié à la facture PDF, sans intermédiaire. Commission 5% via Stripe Connect.

---

## Problème · Solution

**Mayotte (DOM français, 1er producteur mondial ylang-ylang)** exporte des produits d'exception sans outil B2B. Pas de devis formalisé, pas de conformité documentaire, pas de paiement international sécurisé.

**IOX** résout tout ça : catalogue structuré · RFQ + messagerie · paiement Stripe Connect · facturation PDF auto · conformité documentaire (VERIFIED / PENDING / REJECTED).

---

## Statut produit ✅ [CONSTRUIT]

| Métrique | Valeur |
|---|---|
| Tests backend | **1 003 / 1 003 — 0 failure** |
| TypeScript | **Clean** |
| Endpoints API documentés | **186 — Swagger complet** |
| Parcours validé | **RFQ → WON → Paiement → Facture PDF** |
| Démo | **9 sellers · 13 produits · seed idempotent** |

---

## Business model · Commission 5%

**Transaction :** Acheteur paye 2 400 EUR → IOX : 120 EUR (5%) → Vendeur : 2 280 EUR (net immédiat)

**Extensions [HYPOTHÈSE] :** Abonnement vendor premium · Certification assistée · API white-label

---

## Traction [HYPOTHÈSE]

| Horizon | Objectif |
|---|---|
| Q2 2026 | 3-5 coopératives pilotes réelles |
| Q3 2026 | 10 transactions réelles |
| Q4 2026 | 30+ vendeurs actifs |

*Les données de la démo sont des fixtures fictives. La traction commerciale réelle sera communiquée au closing.*

---

## Stack · Avantages

**NestJS · Prisma · PostgreSQL · Redis · MeiliSearch · Next.js · Stripe Connect · MinIO**

✅ Spécialisation Mayotte — confiance locale  
✅ DOM français — réglementation EU, Stripe disponible  
✅ Conformité documentaire structurée (barrière à l'entrée forte)  
✅ Produit livré — pas de build à financer

---

## Ce qu'on cherche [HYPOTHÈSE]

**Levée :** [Montant] · **Use of funds :** BD 40% · Tech 30% · Marketing 15% · Ops/Juridique 15%

**Contact :** [Nom · email · tel] · *Démo live sur rendez-vous*

---

*[CONSTRUIT] = livré, testé, validé M63 GO · [HYPOTHÈSE] = projection non validée · IOX 2026*
