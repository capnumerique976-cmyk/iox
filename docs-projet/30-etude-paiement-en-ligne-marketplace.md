# Étude — Paiement en ligne dans la Marketplace IOX

> Document de cadrage stratégique et technique. À lire avant tout démarrage opérationnel. Les arbitrages à prendre sont listés en section 11.

## 0. Résumé exécutif (TL;DR)

- Aujourd'hui IOX expose une marketplace B2B fonctionnelle (catalogue, fiches, RFQ) **mais sans entité `Order` ni couche paiement**. L'utilisateur final passe par un dialogue RFQ → quote négocié, et tout ce qui suit se passe hors plateforme (offline).
- Mettre en ligne le paiement = **créer trois briques manquantes** : la commande commerciale (`Order`), le paiement acheteur (`Payment` + intégration PSP), et le reversement seller (`Payout` / settlement) avec sa commission marketplace.
- Le contexte (B2B export, gros tickets, multi-devises, incoterms, multi-juridictions Mayotte/UE/Madagascar) **disqualifie le pattern e-commerce grand public** (carte uniquement, capture immédiate). On a besoin d'un modèle d'**escrow marketplace** avec capture différée et déclenchement à la livraison ou à des jalons contractuels.
- Le marché propose 4 candidats sérieux : **Stripe Connect**, **Mangopay**, **Lemonway**, **Adyen for Platforms**. Recommandation orientée pour MVP : **Mangopay** (français, ePM agréé, pensé marketplace, devises, KYB B2B fluide, bon support escrow) avec carte + virement SEPA en MVP, virement international (SWIFT) et autres moyens en V2.
- Stack technique cible MVP : nouveau module backend `payments` + extension du modèle Prisma (`Order`, `OrderLine`, `Payment`, `Payout`, `MarketplaceFee`, `BuyerWallet` optionnel), webhooks PSP, gates de publication métier intégrés (pas de paiement sur lot non `released`).
- Ordre de bataille recommandé : Phase 0 cadrage juridique + choix PSP (1-2 sem), Phase 1 modèle `Order` (2-3 sem), Phase 2 intégration PSP carte+SEPA (3-4 sem), Phase 3 reversement seller + commission + KYB (3-4 sem), Phase 4 SWIFT + paiement à terme (V2).

## 1. Contexte et enjeux

### 1.1 Spécificités IOX

- **B2B export, pas e-commerce grand public.** Tickets souvent moyens-élevés, négociation préalable (RFQ), incoterms structurants, livraisons internationales.
- **Multi-juridictions.** Sellers à Mayotte (DOM, juridiction française et UE), approvisionnement Madagascar (juridiction étrangère), buyers potentiellement n'importe où dans le monde — métropole France, Europe, océan Indien, Maghreb, etc.
- **Multi-devises.** `MarketplaceOffer.currency` existe déjà dans le schéma, EUR par défaut, mais USD, MGA (ariary), KMF (franc comorien), etc. à anticiper.
- **Modèles de prix variés.** `MarketplacePriceMode` ∈ `FIXED | QUOTE_ONLY | FROM_PRICE`. Une grande partie du flux passera par devis négocié, pas par checkout direct.
- **Incoterms.** FOB, CIF, EXW, DAP… changent radicalement qui supporte le risque et quand le paiement se déclenche par rapport à la livraison.
- **Conformité MCH.** Le cahier des charges IOX-MCH impose des gates (lot non `released` = pas de commercialisation). La couche paiement doit respecter ces gates : aucune commande payable ne peut référencer un lot bloqué.
- **Marketplace gouvernée.** Projection publique filtrée, modération, statuts éditoriaux. Le paiement est une pièce de plus du puzzle gouvernance.

### 1.2 Pourquoi ce n'est pas un simple "ajouter Stripe"

- En B2B export, **le paiement est rarement immédiat**. L'acheteur paie souvent à 30/60/90 jours, ou avec acompte + solde à la livraison, ou via crédit documentaire (LC). Un checkout Stripe carte unique ne couvre que 5-15 % des cas réalistes.
- **Le paiement est conditionnel à la livraison** (incoterms). Pour un FOB, le paiement intervient au passage du bastingage. Pour un EXW, à l'enlèvement chez le seller. Pour un DAP, à la livraison chez le buyer. Le système doit pouvoir déclencher la capture / le payout sur événement métier, pas juste sur clic UI.
- **La marketplace devient agent financier.** Dès que la marketplace touche les fonds (même brièvement, en escrow), elle entre dans le périmètre PSD2. Soit elle a son propre agrément (lourd), soit elle utilise un PSP agréé avec fonctionnalité marketplace (Stripe Connect, Mangopay, Lemonway, Adyen), soit elle reste 100 % flux directs buyer↔seller (techniquement plus simple, juridiquement plus simple, mais plus pauvre fonctionnellement).
- **Le seller doit être onboardé KYB**, pas juste KYC : Know Your Business avec extrait Kbis (ou équivalent local Madagascar), bénéficiaires effectifs, etc. C'est un parcours de quelques minutes à quelques jours qu'il faut intégrer dans le flow seller existant (`SellerProfile`).

## 2. Cartographie des flux financiers possibles

Trois scénarios d'architecture financière, du plus simple au plus complet.

### 2.1 Scénario A — Paiement direct buyer ↔ seller, marketplace neutre

```
Buyer ────── paie directement ─────▶ Seller (carte / virement)
   │                                    │
   │                                    │ (commission facturée
   │                                    │ ensuite par IOX)
   │                                    ▼
   │                                 IOX (facture commission)
   ▼
IOX (note la transaction, n'y touche pas)
```

- **Avantage** : juridiquement le plus simple, IOX n'est pas PSP, pas de PSD2. La marketplace facture une commission après coup.
- **Inconvénient** : marketplace n'a pas la main sur le flux. Pas d'escrow, pas de déclenchement automatique sur livraison, pas de garantie pour le buyer si le seller ne livre pas. Difficile à industrialiser.
- **Ne convient pas** au cas IOX si on veut une marketplace de confiance avec garantie de livraison.

### 2.2 Scénario B — Marketplace en escrow via PSP agréé (recommandé MVP)

```
Buyer ─── paie ──▶ PSP (Stripe Connect / Mangopay / etc.)
                       │
                       │ fonds bloqués en escrow
                       │ au nom de la marketplace IOX
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     Capture       Commission       Payout au seller
     déclenchée    IOX prélevée     (release) sur
     par jalon     automatiquement  événement métier
     métier                         (livraison, jalon)
```

- **Avantage** : confiance buyer + seller, marketplace orchestre, escrow protégé (fonds non comptabilisés au bilan IOX), conformité PSD2 portée par le PSP. Pattern standard marketplace 2025.
- **Inconvénient** : intégration PSP + KYB seller + webhooks à orchestrer = chantier sérieux. Coûts PSP non négligeables (1-3 % par transaction selon volume + frais fixes).
- **Recommandé pour le MVP IOX** : c'est l'équilibre confiance / faisabilité.

### 2.3 Scénario C — IOX EME / Agent PSP propre

- IOX devient son propre établissement de monnaie électronique ou agent enregistré.
- **Avantage** : flexibilité maximale, marges meilleures à long terme.
- **Inconvénient** : 12-24 mois de dossier ACPR, capital minimum, obligations DSP2, AML, audit annuel, équipe compliance. Hors périmètre raisonnable d'une marketplace en MVP.
- **À reconsidérer en V3** une fois le volume justifie l'investissement (typiquement > 50 M€/an de GMV).

## 3. Modèles économiques compatibles avec IOX

| Modèle                     | Description                                                  | Compatibilité paiement                                    | Complexité                                |
| -------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------- |
| **Commission marketplace** | IOX prend X % sur chaque transaction (typique : 3-15 % B2B). | Native via Stripe Connect / Mangopay (split automatique). | Faible.                                   |
| **Abonnement seller**      | Seller paie un forfait mensuel pour publier (modèle SaaS).   | Indépendant du paiement transactionnel.                   | Faible (Stripe Billing).                  |
| **Listing fee**            | Seller paie pour chaque produit/offre publiée.               | Indépendant du paiement transactionnel.                   | Faible.                                   |
| **Lead fee**               | IOX facture chaque RFQ qualifié envoyé au seller.            | Indépendant.                                              | Moyenne (qualification à industrialiser). |
| **Mix**                    | Abonnement faible + commission faible.                       | Combine les deux.                                         | Moyenne.                                  |

**Recommandation** : MVP avec **commission marketplace seule** (3-7 % selon catégorie), simple à expliquer aux sellers, aligne les intérêts (IOX gagne quand le seller vend). On ajoute abonnement premium en V2 si pertinent.

## 4. Cadre réglementaire à connaître

### 4.1 PSD2 (DSP2) — Directive Services de Paiement 2

- Dès que IOX touche les fonds, même quelques minutes, elle entre dans le périmètre PSD2.
- Trois voies :
  1. **Agrément ACPR propre** (établissement de paiement / EME) — lourd.
  2. **Agent enregistré** d'un EP/EME existant — moyen.
  3. **Utilisation d'un PSP agréé qui fait l'escrow marketplace** — léger, c'est la voie standard.
- Tous les PSP marketplace (Stripe Connect, Mangopay, Lemonway, Adyen) sont conformes PSD2 et portent l'agrément. **IOX reste hors champ tant qu'elle utilise leur architecture.**

### 4.2 KYB / KYC

- **KYB sellers obligatoire** : extrait Kbis pour entreprises FR, équivalent local pour Madagascar (registre du commerce malgache), bénéficiaires effectifs >25 %, RIB.
- **KYC buyers** : pour des achats > 1 000 € en règle générale, vérification d'identité du donneur d'ordre.
- Les PSP marketplace fournissent l'**onboarding KYB intégré** (UI + back-office). Pas à coder soi-même.

### 4.3 AML / CFT (lutte anti-blanchiment)

- Surveillance des transactions suspectes (montants atypiques, pays à risque, fragmentation).
- Reporting Tracfin au-delà de seuils.
- **Porté par le PSP** dans le scénario B. IOX doit tout de même conserver les preuves transactionnelles.

### 4.4 RGPD

- Données financières = données personnelles sensibles (catégories spéciales).
- Sous-traitance PSP doit faire l'objet d'un contrat conforme art. 28 RGPD.
- Déjà couvert par la politique de confidentialité IOX existante (cf. cahier des charges section 8.5), à mettre à jour avec la mention PSP.

### 4.5 Particularité Mayotte / Madagascar

- **Mayotte** : 101e département français, juridiction française et UE, devise EUR. Aucune contrainte spécifique vs métropole pour le paiement.
- **Madagascar** : juridiction étrangère, devise MGA. Si IOX devait payer directement les producteurs malgaches, il faudrait gérer les **transferts internationaux** (SWIFT, BIC, frais bancaires, contrôle des changes). En pratique, dans le scénario MCH actuel, c'est probablement une **société mahoraise (le bénéficiaire MCH) qui est le seller marketplace**, et qui s'arrange ensuite avec son fournisseur amont madagascarois — le paiement reste dans le périmètre EUR/UE.
- **Acheteurs hors UE** (USA, Asie, Afrique de l'Est) : nécessite multi-devises, conversion FX, parfois 3DS hors UE (selon carte).

## 5. Moyens de paiement adaptés à IOX

| Moyen                                           | Cas d'usage                                          | Délai                               | Frais (ordre de grandeur)     |
| ----------------------------------------------- | ---------------------------------------------------- | ----------------------------------- | ----------------------------- |
| **Carte (Visa/MC)**                             | petits/moyens montants, paiement immédiat.           | Instant.                            | 1.4-2.9 % + 0.20-0.30 €       |
| **Virement SEPA**                               | montants moyens à élevés, UE.                        | 1 jour ouvré (instant si SCT Inst). | 0-0.20 €                      |
| **Virement SWIFT**                              | montants élevés, hors UE.                            | 2-5 jours.                          | 5-30 € + frais correspondants |
| **Crédit documentaire (LC)**                    | très gros montants export, sécurité maximale.        | 1-2 semaines instruction.           | 0.1-0.5 %                     |
| **Affacturage**                                 | paiement immédiat IOX, créance recouvrée par factor. | Instant (côté seller).              | 0.5-2 %                       |
| **B2B BNPL** (ex. Hokodo, Mondu, Allianz Trade) | NET 30/60/90 acheteur, paiement immédiat seller.     | Instant (côté seller).              | 1-3 %                         |

**MVP recommandé** : carte + virement SEPA. **V2** : SWIFT + B2B BNPL. **V3 / sur mesure** : LC.

## 6. Comparaison des PSP marketplace candidats

### Critères d'évaluation

- Spécifique marketplace (escrow, split, KYB intégré).
- Support B2B & multi-devises.
- Support virement (pas seulement carte).
- Support juridiction française / DOM.
- Tarification transparente.
- Documentation et qualité d'intégration.

### 6.1 Stripe Connect

- **Forces** : doc excellente, écosystème immense, intégration Next.js / NestJS triviale, multi-devises natif, paiement carte international. Onboarding KYB en self-service via Stripe Express ou Custom.
- **Faiblesses** : virement SEPA limité côté payout (ok côté collect), pas de virement SWIFT direct, frais relativement élevés en B2B export. Modèle "Connect" historique orienté plutôt e-commerce grand public.
- **Tarif** : 1.4 % + 0.25 € (carte EU) / 2.9 % + 0.30 € (carte hors EU) / payout SEPA 0.25 €.
- **Verdict IOX** : techniquement excellent, mais structurellement plus orienté C2C / e-commerce. Convient si on accepte "carte uniquement MVP". Moins idéal si on veut virement-first.

### 6.2 Mangopay

- **Forces** : ePM français agréé, pensé marketplace dès le départ, **escrow natif** ("e-wallet" par utilisateur), KYB B2B fluide (UI dédiée), virement bancaire collect natif, multi-devises (EUR, USD, GBP, etc.), support FR sérieux.
- **Faiblesses** : doc moins "delightful" que Stripe, écosystème plus petit, tarification au volume négocié, intégration un peu plus boilerplate.
- **Tarif** : 1.8 % + 0.18 € (carte) / 0.30 € fixe (virement SEPA collect) / payout SEPA inclus / commission marketplace prélevée à la transaction.
- **Verdict IOX** : **meilleur fit fonctionnel** pour le MVP. ePM français → bon pour la conformité, B2B-friendly, virement natif, escrow natif.

### 6.3 Lemonway

- **Forces** : ePM français agréé, marketplace-first (orientée crowdfunding et marketplace B2B historiquement), virement collect natif, KYB strict mais carré, support FR.
- **Faiblesses** : doc moins moderne, intégration parfois lourde, écosystème SDK plus limité que Stripe ou Mangopay.
- **Tarif** : grille négociée, ordre de 1.5-2 % carte + frais fixes virement.
- **Verdict IOX** : sérieux concurrent de Mangopay, à comparer selon retours commerciaux. Mangopay reste préférable pour l'ergonomie d'intégration.

### 6.4 Adyen for Platforms

- **Forces** : enterprise-grade, multi-devises et acquéreur global premier de classe, support tous moyens de paiement (carte, virement, LCR, prélèvement, locaux : iDEAL, Bancontact, Klarna), KYB intégré.
- **Faiblesses** : pricing négocié (pas grille publique), seuils de volume minimums élevés, complexité d'intégration plus haute.
- **Tarif** : à partir de plusieurs M€/an de GMV ça devient compétitif, en dessous c'est cher.
- **Verdict IOX** : **prématuré pour MVP**. À reconsidérer en V3 quand le volume justifie. Excellent quand on est gros.

### 6.5 Tableau récapitulatif

| Critère                             | Stripe Connect | **Mangopay** | Lemonway | Adyen |
| ----------------------------------- | -------------- | ------------ | -------- | ----- |
| Marketplace-native (escrow + split) | ✅             | ✅✅         | ✅✅     | ✅✅  |
| Virement SEPA collect               | △              | ✅           | ✅       | ✅    |
| KYB B2B                             | ✅             | ✅✅         | ✅✅     | ✅✅  |
| Multi-devises                       | ✅✅           | ✅           | △        | ✅✅  |
| Doc / DX                            | ✅✅           | ✅           | △        | ✅    |
| Pricing transparent                 | ✅             | ✅           | △        | ❌    |
| Idéal pour MVP IOX                  | △              | **✅**       | ✅       | ❌    |

**Recommandation : Mangopay pour MVP**, à réévaluer en V3 vs Adyen quand le volume monte.

## 7. Articulation avec le modèle métier IOX existant

### 7.1 Constat technique : entités manquantes

Aujourd'hui dans le schéma Prisma :

- ✅ `QuoteRequest` + `QuoteRequestMessage` (conversation RFQ)
- ✅ `MarketplaceOffer` (paramètres commerciaux)
- ✅ `MarketplaceOfferBatch` (pont offre ↔ lot réel pour traçabilité)
- ✅ `MarketplaceProduct`, `SellerProfile`, etc.
- ❌ **`Order`** — pas d'entité commande commerciale. La transition RFQ → commande n'est pas modélisée.
- ❌ **`Payment`** — aucune trace de paiement.
- ❌ **`Invoice`** — pas de génération de facture commerciale.
- ❌ **`Payout` / `Settlement`** — pas de reversement seller.
- ❌ **`MarketplaceFee`** — pas de structure commission.

`Distribution` / `DistributionLine` existent mais sont des **distributions internes MCH** (par bénéficiaire, sans buyer ni prix), pas des commandes commerciales.

### 7.2 Workflow cible bout en bout

```
RFQ (existante)
   │
   │ Quote négocié validé par buyer + seller
   ▼
Order (NEW)
   │
   │ Buyer initie le paiement
   ▼
Payment (PENDING) ────────────▶ PSP collect
                                    │
                                    │ fonds en escrow Mangopay (e-wallet IOX)
   ▼                                ▼
Payment (HELD)              ✅ Payment confirmé webhook
   │
   │ Order: PAID, gates métier vérifiés (lot released ?)
   ▼
Order (PAID)
   │
   │ Seller prépare l'expédition
   ▼
Shipment (PENDING) → Shipment (IN_TRANSIT) → Shipment (DELIVERED)
   │                                              │
   │                                              │ jalon : capture libérée
   ▼                                              ▼
Order (FULFILLED)                          Payout (PENDING) ──▶ PSP payout
                                                                  │
                                                                  │ - commission IOX
                                                                  ▼
                                                          Payout (COMPLETED)
                                                          → Seller wallet
```

Ce workflow n'est qu'une cible — il faudra le simplifier en MVP (par exemple : capture immédiate, pas d'escrow conditionnel à la livraison, à activer en V2).

### 7.3 Statuts à distinguer (cf. règle des 2 couches)

- **Statuts marketplace éditoriaux** (existants) : `DRAFT`, `IN_REVIEW`, `APPROVED`, `PUBLISHED` sur les contenus.
- **Statuts métier MCH** (existants) : `not_released`, `released`, `blocked` sur la mise en marché.
- **Nouveaux statuts paiement / commande** (à introduire) :
  - `OrderStatus` : `DRAFT`, `CONFIRMED`, `PAID`, `IN_PREPARATION`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`, `DISPUTED`.
  - `PaymentStatus` : `PENDING`, `HELD`, `CAPTURED`, `FAILED`, `REFUNDED`.
  - `PayoutStatus` : `PENDING`, `IN_TRANSIT`, `COMPLETED`, `FAILED`.

**Gate critique à respecter** : aucune `Order` ne peut passer `CONFIRMED` si l'un des `productBatch` référencés (via `MarketplaceOfferBatch`) n'est pas `released` côté MCH. C'est la projection de la règle métier centrale d'IOX dans le monde transactionnel.

## 8. Schéma cible recommandé (Prisma)

Modèle additif, à introduire progressivement (toutes les colonnes nullables en première migration, contraintes ajoutées en deuxième).

```prisma
enum OrderStatus {
  DRAFT
  CONFIRMED
  PAID
  IN_PREPARATION
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
  DISPUTED
}

enum PaymentStatus {
  PENDING
  HELD
  CAPTURED
  FAILED
  REFUNDED
}

enum PayoutStatus {
  PENDING
  IN_TRANSIT
  COMPLETED
  FAILED
}

enum PaymentProvider {
  MANGOPAY
  STRIPE
  MANUAL_BANK_TRANSFER
}

enum PaymentMethod {
  CARD
  BANK_TRANSFER_SEPA
  BANK_TRANSFER_SWIFT
  WIRE
}

model Order {
  id                  String       @id @default(uuid())
  code                String       @unique // ORD-2026-0001

  buyerCompanyId      String       @map("buyer_company_id")
  sellerProfileId     String       @map("seller_profile_id")
  marketplaceOfferId  String       @map("marketplace_offer_id")

  status              OrderStatus  @default(DRAFT)
  currency            String       @default("EUR")

  subtotal            Decimal      @db.Decimal(14, 2)
  marketplaceFeeAmount Decimal     @db.Decimal(14, 2) @map("marketplace_fee_amount")
  taxAmount           Decimal      @default(0) @db.Decimal(14, 2) @map("tax_amount")
  total               Decimal      @db.Decimal(14, 2)

  incoterm            String?
  deliveryAddressJson Json?        @map("delivery_address_json")

  notes               String?

  confirmedAt         DateTime?    @map("confirmed_at")
  paidAt              DateTime?    @map("paid_at")
  shippedAt           DateTime?    @map("shipped_at")
  deliveredAt         DateTime?    @map("delivered_at")
  cancelledAt         DateTime?    @map("cancelled_at")
  cancelReason        String?      @map("cancel_reason")

  createdAt           DateTime     @default(now()) @map("created_at")
  updatedAt           DateTime     @updatedAt @map("updated_at")
  createdById         String?      @map("created_by_user_id")
  updatedById         String?      @map("updated_by_user_id")

  buyerCompany     Company          @relation(fields: [buyerCompanyId], references: [id])
  sellerProfile    SellerProfile    @relation(fields: [sellerProfileId], references: [id])
  marketplaceOffer MarketplaceOffer @relation(fields: [marketplaceOfferId], references: [id])

  lines    OrderLine[]
  payments Payment[]
  payouts  Payout[]

  @@index([buyerCompanyId])
  @@index([sellerProfileId])
  @@index([status])
  @@map("orders")
}

model OrderLine {
  id             String  @id @default(uuid())
  orderId        String  @map("order_id")
  productBatchId String  @map("product_batch_id")  // gate métier critique

  quantity       Decimal @db.Decimal(12, 3)
  unit           String
  unitPrice      Decimal @db.Decimal(12, 2) @map("unit_price")
  lineTotal      Decimal @db.Decimal(14, 2) @map("line_total")

  order        Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productBatch ProductBatch @relation(fields: [productBatchId], references: [id])

  @@map("order_lines")
}

model Payment {
  id                String          @id @default(uuid())
  orderId           String          @map("order_id")

  provider          PaymentProvider
  providerPaymentId String          @map("provider_payment_id") // mangopayPayInId
  method            PaymentMethod

  amount            Decimal         @db.Decimal(14, 2)
  currency          String          @default("EUR")
  status            PaymentStatus   @default(PENDING)

  failureCode       String?         @map("failure_code")
  failureReason     String?         @map("failure_reason")

  capturedAt        DateTime?       @map("captured_at")
  failedAt          DateTime?       @map("failed_at")
  refundedAt        DateTime?       @map("refunded_at")

  webhookEventsJson Json?           @map("webhook_events_json")

  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")

  order Order @relation(fields: [orderId], references: [id])

  @@index([orderId])
  @@index([status])
  @@index([providerPaymentId])
  @@map("payments")
}

model Payout {
  id                String          @id @default(uuid())
  orderId           String          @map("order_id")
  sellerProfileId   String          @map("seller_profile_id")

  provider          PaymentProvider
  providerPayoutId  String?         @map("provider_payout_id")

  grossAmount       Decimal         @db.Decimal(14, 2) @map("gross_amount")
  marketplaceFeeAmount Decimal      @db.Decimal(14, 2) @map("marketplace_fee_amount")
  netAmount         Decimal         @db.Decimal(14, 2) @map("net_amount")
  currency          String          @default("EUR")

  status            PayoutStatus    @default(PENDING)
  failureCode       String?         @map("failure_code")
  failureReason     String?         @map("failure_reason")

  scheduledAt       DateTime?       @map("scheduled_at")
  initiatedAt       DateTime?       @map("initiated_at")
  completedAt       DateTime?       @map("completed_at")

  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")

  order         Order         @relation(fields: [orderId], references: [id])
  sellerProfile SellerProfile @relation(fields: [sellerProfileId], references: [id])

  @@index([orderId])
  @@index([sellerProfileId])
  @@index([status])
  @@map("payouts")
}

model MarketplaceFeeRule {
  id              String   @id @default(uuid())
  appliesToCategoryId String? @map("applies_to_category_id")
  appliesToSellerId   String? @map("applies_to_seller_id") // null = défaut

  ratePercent     Decimal  @default(0) @db.Decimal(5, 2) @map("rate_percent")
  fixedAmount     Decimal  @default(0) @db.Decimal(8, 2) @map("fixed_amount")
  currency        String   @default("EUR")
  minFee          Decimal? @db.Decimal(8, 2) @map("min_fee")
  maxFee          Decimal? @db.Decimal(10, 2) @map("max_fee")

  isActive        Boolean  @default(true) @map("is_active")
  validFrom       DateTime?
  validUntil      DateTime?

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([isActive])
  @@map("marketplace_fee_rules")
}

model SellerWallet {
  id                String   @id @default(uuid())
  sellerProfileId   String   @unique @map("seller_profile_id")

  provider          PaymentProvider
  providerWalletId  String   @map("provider_wallet_id") // mangopayWalletId
  currency          String   @default("EUR")

  balanceAvailable  Decimal  @default(0) @db.Decimal(14, 2) @map("balance_available")
  balanceHeld       Decimal  @default(0) @db.Decimal(14, 2) @map("balance_held")

  bankAccountVerified Boolean @default(false) @map("bank_account_verified")
  kybStatus         String   @default("PENDING") @map("kyb_status") // PENDING/VERIFIED/REFUSED

  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  sellerProfile     SellerProfile @relation(fields: [sellerProfileId], references: [id], onDelete: Cascade)

  @@map("seller_wallets")
}
```

Note : c'est une **première version**. À affiner avec le PSP retenu (Mangopay a ses propres concepts : `Wallet`, `PayIn`, `Transfer`, `PayOut`).

## 9. Roadmap de déploiement

### Phase 0 — Cadrage (1-2 semaines)

- Choix PSP final (Mangopay vs Lemonway), signature contrat de cadrage.
- Étude juridique courte avec un avocat spécialisé fintech (ouverture de compte EME, statut marketplace, CGV/CGU adaptées).
- Validation modèle économique (commission %).
- Dossier d'inscription chez le PSP (KYB IOX, contrats opérateur marketplace).

### Phase 1 — Modèle Order + Quote → Order (3-4 semaines)

- Migration Prisma : `Order`, `OrderLine`, `MarketplaceFeeRule` (+ enums).
- Backend : module `orders`, transition RFQ acceptée → création Order DRAFT, calcul total + commission.
- Frontend buyer : page d'acceptation devis → confirmation Order, récap chiffré.
- Frontend seller : vue de ses Orders en attente.
- Frontend admin : vue console des Orders.
- **Pas de paiement encore** : on peut juste tracer un Order avec un statut "à régler hors-plateforme".

### Phase 2 — Intégration PSP MVP : carte + SEPA + escrow (4-6 semaines)

- Module `payments` backend, connecteur Mangopay (ou autre).
- Migration Prisma : `Payment`, `SellerWallet` + extension Order avec liens.
- KYB seller : workflow d'onboarding `SellerProfile` → création `SellerWallet` Mangopay → upload pièces.
- Flow buyer : Order PAID via carte ou virement SEPA, fonds en escrow.
- Webhooks PSP : confirmer paiements, gérer échecs.
- UI buyer : page de paiement intégrée (Mangopay Hosted Payment Form ou React SDK).
- UI admin : console paiements (liste, détails, statuts).
- Gate métier intégré : impossible de créer un Order référençant un lot non `released`.

### Phase 3 — Reversement seller + commission + capture sur livraison (3-5 semaines)

- Migration : `Payout`.
- Backend : déclenchement `Payout` automatique à la livraison (statut Order = `DELIVERED`), prélèvement commission.
- UI seller : balance, historique Payouts, configuration RIB.
- Tableau de bord financier admin (GMV, commissions, en attente, payouts émis).
- Tests intensifs avec cas dégradés (refunds, disputes, échecs).

### Phase 4 — V2 : SWIFT, BNPL B2B, gestion litiges (Q+1, 6-10 semaines)

- Virement SWIFT pour acheteurs hors UE.
- Intégration Hokodo / Mondu / Allianz pour NET 30/60/90.
- Workflow de gestion de litiges (Disputed, médiation admin, refund partiel).
- Multi-currencies actives (USD, autres).

### Phase 5 — V3 : automatisations, scoring, EME propre (selon volume)

- Évaluation EME propre IOX si GMV > 50 M€/an.
- Scoring crédit acheteur, market intelligence.

## 10. Risques techniques et stratégiques

| Risque                                                                      | Impact                                                           | Mitigation                                                                                    |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **PSP choisi ne correspond pas aux usages réels**                           | Refonte coûteuse                                                 | POC parallèle 2 PSP avant choix définitif (Phase 0)                                           |
| **KYB sellers trop friction → adoption faible**                             | Marketplace vide d'inventaire                                    | UX seller onboarding très soignée, support humain pendant les premières semaines              |
| **Webhooks PSP non idempotents** → doubles paiements                        | Critique financier                                               | Idempotency-Key déjà en place côté IOX (Lot-9), à étendre aux callbacks PSP                   |
| **Confusion gates métier MCH ↔ statuts paiement**                           | Lots bloqués vendus / commandes payées sur produits non-released | Tests métier critiques, pas de raccourci sur les guards                                       |
| **Volumes faibles MVP → coûts PSP > revenus commission**                    | Modèle économique à perte                                        | Modéliser le break-even avant choix final, négocier minimums                                  |
| **Conformité RGPD / PSD2 mal portée**                                       | Risque réglementaire ACPR / CNIL                                 | Avocat spécialisé en Phase 0, pas après                                                       |
| **Capture sur livraison difficile à automatiser** (pas de tracking carrier) | Litiges fréquents                                                | MVP : capture à la confirmation expédition côté seller (pas livraison réelle), à durcir en V2 |
| **Multi-devises mal gérées → taux de change figés au mauvais moment**       | Pertes ou litiges                                                | Définir la politique : prix figé en EUR à la commande, ou conversion à la capture ?           |
| **Madagascar pas couvert par PSP UE**                                       | Si payouts directs aux producteurs malgaches                     | MVP : payout uniquement vers compte mahorais EUR ; le seller mahorais s'arrange ensuite.      |

## 11. Arbitrages à trancher avec toi (avant Phase 0)

Voici les **8 décisions clés** que je ne peux pas prendre seul. Réponds-moi par oui/non ou par option choisie quand tu reviens — je te ferai ensuite un cadrage Phase 0 plus précis selon tes choix.

1. **Modèle économique** : commission marketplace seule ? abonnement ? mix ? → Si commission, à quel ordre de grandeur (3 %, 5 %, 7 %, 10 %) ?
2. **Modèle de flux** : escrow PSP (recommandé, scénario B) ? ou paiement direct buyer↔seller avec commission post-facto (scénario A) ?
3. **PSP retenu** : Mangopay (recommandé MVP) ? Stripe Connect ? Lemonway ? Adyen ? Autre ?
4. **Moyens de paiement MVP** : carte seule ? carte + SEPA (recommandé) ? + virement bancaire manuel admin ?
5. **Devises MVP** : EUR seul ? EUR + USD ? Multi-devises dès le départ ?
6. **Capture des fonds** : immédiate à l'Order ? à l'expédition ? à la livraison ? (Recommandé MVP : à l'expédition.)
7. **Acheteurs cible MVP** : France/UE seulement (simplifie tout) ? mondial dès le MVP ?
8. **Couverture juridique** : tu as déjà un avocat fintech ? il faut t'en présenter ?

## 12. Ce que je peux préparer en parallèle

Une fois ces arbitrages tranchés, je peux te livrer dans le même format :

- **Prompt Claude Code** pour démarrer la Phase 1 (modèle Order, transition RFQ → Order, première migration Prisma additive).
- **Cahier de charges détaillé** Phase 1 + Phase 2, par module, par écran.
- **Cahier de recette** des règles métier critiques paiement (idempotence, gates métier, refunds, disputes).
- **Comparatif tarifaire chiffré** Mangopay / Lemonway / Stripe sur 3 scénarios de volume (MVP, croissance, mature).
- **Modèle de CGV/CGU marketplace** brouillon (à valider obligatoirement par avocat ensuite).

## Conclusion

Mettre en place un paiement en ligne dans IOX n'est pas une couche technique anodine — c'est l'introduction d'une dimension transactionnelle complète qui impacte le modèle de données, le workflow métier, le cadre juridique, et la confiance des deux côtés du marché.

La bonne nouvelle est que le socle existant est solide (RFQ déjà câblé, gates métier déjà pensés, marketplace gouvernée déjà en place) et que le marché PSP propose des briques marketplace standardisées (Mangopay, Lemonway, Stripe Connect) qui évitent de réinventer la roue.

La séquence recommandée est : **Phase 0 cadrage juridique + choix PSP → Phase 1 Order → Phase 2 paiement carte+SEPA+escrow → Phase 3 reversement seller**. Soit un MVP fonctionnel à 4-5 mois d'effort cumulé, raisonnable pour un sujet aussi structurant.

Mon avis personnel sur la combinaison la plus pragmatique : **Mangopay + escrow + commission 5 % + carte/SEPA en MVP + capture à l'expédition + EUR seul + UE seulement en MVP + avocat fintech en Phase 0**. Mais tous ces choix sont à discuter — j'ai listé les 8 arbitrages explicites en section 11.
