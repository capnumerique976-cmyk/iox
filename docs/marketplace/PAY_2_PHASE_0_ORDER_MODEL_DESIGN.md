# PAY-2 — Phase 0 : Design Order model

**Statut** : Design — non implémenté
**Mandat** : PAY-2 (post-M138)
**Auteur** : Caveman session, 2026-05-23
**Prérequis** : PAY-1 phase 1 livré (Stripe Connect onboarding + checkout buyer + webhooks)

---

## Contexte

Le flow actuel s'arrête à `Payment SUCCEEDED` + `Invoice ISSUED`. Mais le
cycle commercial B2B continue : confirmation seller, expédition,
réception buyer, litige éventuel, clôture. Aujourd'hui `/buyer/orders`
affiche simplement les RFQ `status=WON` comme proxy, ce qui :

1. Mélange étape pré-commerciale (négociation) avec étape post-paiement
2. Ne permet pas de tracker shipping / fulfillment / livraison
3. Bloque les KPI seller (orders shipped / on time / disputed)
4. Empêche payout seller automatisé (PAY-1 phase 2 dépend de "Order
   delivered" pour libérer escrow)

## Objectif

Introduire entité **Order** matérialisant la transition RFQ.WON → vente
réelle, avec lifecycle propre, ownership clair, et trigger payout
seller à `DELIVERED` (PAY-1 phase 2).

## Modèle Prisma proposé

```prisma
enum OrderStatus {
  PENDING_PAYMENT    // Order créé, attente paiement Stripe
  CONFIRMED          // Payment SUCCEEDED, seller doit traiter
  PREPARING          // Seller prépare (optionnel, manuel)
  SHIPPED            // Seller marque envoyé (avec tracking)
  DELIVERED          // Buyer confirme réception → trigger payout
  COMPLETED          // 14j après DELIVERED sans dispute → escrow released
  DISPUTED           // Litige ouvert par buyer
  CANCELED           // Annulé avant SHIPPED (refund automatique)
  REFUNDED           // Refund total après dispute
}

model Order {
  id                      String      @id @default(uuid())

  // Lien amont (1:1 avec RFQ WON)
  quoteRequestId          String      @unique @map("quote_request_id")
  marketplaceOfferId      String      @map("marketplace_offer_id")

  // Parties (dénormalisées depuis RFQ pour résilience)
  sellerProfileId         String      @map("seller_profile_id")
  buyerCompanyId          String      @map("buyer_company_id")
  buyerUserId             String      @map("buyer_user_id")

  // Numéro commercial : ORD-YYYY-NNNNNN (séparé d'invoice number)
  orderNumber             String      @unique @map("order_number")

  // Données économiques (verrouillées à la création depuis RFQ)
  quantity                Decimal     @db.Decimal(12, 3)
  unit                    String
  unitPriceCents          Int         @map("unit_price_cents")
  totalAmountCents        Int         @map("total_amount_cents")
  currency                String      @default("EUR")
  incoterm                String?     // FOB, CIF, EXW, DAP…
  deliveryCountry         String?     @map("delivery_country")
  deliveryAddress         String?     @map("delivery_address")

  // Lifecycle
  status                  OrderStatus @default(PENDING_PAYMENT)

  // Lien aval (1:1 Payment + 1:1 Invoice)
  paymentId               String?     @unique @map("payment_id")
  invoiceId               String?     @unique @map("invoice_id")

  // Shipping
  shippedAt               DateTime?   @map("shipped_at")
  trackingCarrier         String?     @map("tracking_carrier")
  trackingNumber          String?     @map("tracking_number")
  trackingUrl             String?     @map("tracking_url")
  estimatedDeliveryDate   DateTime?   @map("estimated_delivery_date")

  // Delivery + escrow
  deliveredAt             DateTime?   @map("delivered_at")
  deliveryConfirmedBy     String?     @map("delivery_confirmed_by") // userId
  escrowReleaseScheduledAt DateTime?  @map("escrow_release_scheduled_at")
  escrowReleasedAt        DateTime?   @map("escrow_released_at")
  stripeTransferId        String?     @map("stripe_transfer_id")

  // Dispute
  disputeReason           String?     @map("dispute_reason")
  disputeOpenedAt         DateTime?   @map("dispute_opened_at")
  disputeResolvedAt       DateTime?   @map("dispute_resolved_at")

  // Cancel/refund
  canceledAt              DateTime?   @map("canceled_at")
  cancelReason            String?     @map("cancel_reason")

  createdAt               DateTime    @default(now()) @map("created_at")
  updatedAt               DateTime    @updatedAt @map("updated_at")

  // Relations
  quoteRequest    QuoteRequest      @relation(fields: [quoteRequestId], references: [id], onDelete: Restrict)
  marketplaceOffer MarketplaceOffer @relation(fields: [marketplaceOfferId], references: [id], onDelete: Restrict)
  sellerProfile   SellerProfile     @relation(fields: [sellerProfileId], references: [id], onDelete: Restrict)
  buyerCompany    Company           @relation("OrderBuyerCompany", fields: [buyerCompanyId], references: [id], onDelete: Restrict)
  buyerUser       User              @relation("OrderBuyerUser", fields: [buyerUserId], references: [id], onDelete: Restrict)
  payment         Payment?          @relation(fields: [paymentId], references: [id], onDelete: SetNull)
  invoice         Invoice?          @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  events          OrderEvent[]

  @@index([buyerCompanyId, status, createdAt])
  @@index([sellerProfileId, status, createdAt])
  @@index([status, createdAt])
  @@map("orders")
}

// Journal d'événements lifecycle (audit complet du parcours)
model OrderEvent {
  id          String      @id @default(uuid())
  orderId     String      @map("order_id")
  type        String      // STATUS_CHANGE | SHIPPING_UPDATE | DISPUTE_OPENED | …
  fromStatus  OrderStatus? @map("from_status")
  toStatus    OrderStatus? @map("to_status")
  message     String?
  actorUserId String?     @map("actor_user_id")
  metadata    Json?
  createdAt   DateTime    @default(now()) @map("created_at")

  order       Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  actorUser   User?       @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([orderId, createdAt])
  @@map("order_events")
}
```

## Lifecycle (state machine)

```
PENDING_PAYMENT ──payment.succeeded──→ CONFIRMED
                                          │
                                          ├─seller.markPreparing─→ PREPARING
                                          │
                                          ├─seller.markShipped(tracking)─→ SHIPPED
                                          │                                  │
                                          │                                  ├─buyer.confirmDelivery─→ DELIVERED
                                          │                                  │                          │
                                          │                                  │                          ├─T+14j cron, no dispute─→ COMPLETED (escrow released)
                                          │                                  │                          │
                                          │                                  │                          └─buyer.openDispute─→ DISPUTED
                                          │                                  │
                                          │                                  └─buyer.openDispute─→ DISPUTED
                                          │
                                          └─buyer/admin.cancel(pre-shipped)─→ CANCELED (refund auto)

DISPUTED ──admin.resolve(refund)─→ REFUNDED
DISPUTED ──admin.resolve(deliver)─→ COMPLETED
```

## Migrations Prisma

Migration additive (pas de breaking) :
1. Créer enum `OrderStatus`
2. Créer table `orders` + `order_events`
3. Ajouter `orderId` nullable sur `Payment` et `Invoice` (backref optionnelle)
4. Pas de seed initial pour les RFQ WON existantes — script de backfill
   séparé si besoin (mode dry-run d'abord)

## Endpoints backend (API surface)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/orders` | (interne) | Créé automatiquement quand RFQ → WON (idempotent via quoteRequestId unique) |
| GET | `/orders` | BUYER, SELLER, ADMIN | Liste scopée + filtres status |
| GET | `/orders/:id` | BUYER (own), SELLER (own), ADMIN | Détail |
| PATCH | `/orders/:id/shipping` | SELLER (own) | Body: { carrier, trackingNumber, trackingUrl, estimatedDeliveryDate } → status: SHIPPED |
| POST | `/orders/:id/confirm-delivery` | BUYER (own), ADMIN | → DELIVERED + escrow scheduled at T+14j |
| POST | `/orders/:id/open-dispute` | BUYER (own) | Body: { reason } → DISPUTED |
| POST | `/orders/:id/resolve-dispute` | ADMIN | Body: { resolution: 'REFUND' \| 'DELIVER' } → REFUNDED / COMPLETED |
| POST | `/orders/:id/cancel` | BUYER (pre-shipped), ADMIN | → CANCELED + refund Stripe |

## Triggers backend

- **RFQ status → WON** → create Order automatiquement (transaction)
  - Lock `agreedAmountCents` dans Order.totalAmountCents
  - Lock `agreedCurrency` dans Order.currency
- **Payment.succeeded** (webhook Stripe) → Order.status = CONFIRMED + Order.paymentId
- **Invoice.create** (existant) → Order.invoiceId
- **Cron T+14j post-DELIVERED** → Order.status = COMPLETED + trigger Stripe Transfer vers seller (escrow release) → PAY-1 phase 2 dépendance
- **Order.canceled** → Stripe refund automatique + Payment.status = REFUNDED

## Découpage en lots

**LOT 1 — Schéma + création auto** (~ 1 jour)
- Migration Prisma additive
- OrdersService.createFromWonRfq()
- Hook dans QuoteRequestsService.transition() : `WON → create Order`
- Tests : idempotence, dataset RFQ WON existantes (backfill)

**LOT 2 — Liste/détail buyer + seller** (~ 0.5 jour)
- GET /orders, GET /orders/:id avec ownership
- Remplacer `/buyer/orders` actuel (proxy RFQ WON) par vraie liste Order
- Espace `/seller/orders` nouveau

**LOT 3 — Shipping workflow seller** (~ 0.5 jour)
- PATCH /orders/:id/shipping
- UI seller : form tracking
- Email notif buyer : "Commande expédiée"

**LOT 4 — Delivery + escrow scheduling** (~ 0.5 jour)
- POST /orders/:id/confirm-delivery
- Champ `escrowReleaseScheduledAt`
- Cron tick T+14j → COMPLETED + Stripe Transfer (PAY-1 phase 2)

**LOT 5 — Dispute + cancel + refund** (~ 1 jour)
- POST /orders/:id/open-dispute / resolve-dispute / cancel
- UI admin : queue de disputes
- Stripe refund integration (déjà partiellement existant via PaymentsService.refund)

## Décisions ouvertes

1. **Délai escrow** : 14j fixé ici. Configurable par seller / par pays ?
2. **Multiple orders depuis 1 RFQ ?** : Non (1:1 via `quoteRequestId @unique`). Reposer une nouvelle RFQ si besoin.
3. **Split shipments** : V1 = pas géré (1 order = 1 expédition). V2 = sub-orders / parcels ?
4. **Cancelation post-SHIPPED** : interdite en V1 (passe par dispute). À reconsidérer si feedback métier.
5. **Notifications** : 6 nouveaux templates email (CONFIRMED, SHIPPED, DELIVERED_REMINDER, DISPUTE_OPENED, REFUNDED, COMPLETED). À ajouter dans `notif-email` module.

## Hors scope (V2+)

- Sub-orders / split shipments
- Pre-orders / future inventory commitments
- Subscription orders (récurrent)
- B2B PO formal workflow (purchase orders signés)
- Multi-leg shipping (broker → port → buyer)

---

*Document de design — implémentation à lancer après merge PR #136 (M138)
et activation Stripe test réel.*
