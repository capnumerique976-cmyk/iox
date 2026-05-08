# OSS Marketplace Patterns Audit — Medusa v2 & Vendure

> IOX mini-audit: what patterns from mature open-source commerce platforms
> could strengthen our marketplace architecture? Docs only — no code changes.

## 1. Medusa v2 (medusajs.com)

### Architecture

Medusa v2 uses a **modular monolith** with explicit module boundaries. Each
domain (Product, Cart, Order, Payment, Fulfillment) is a separate module with:
- Its own data models and migrations
- A service layer exposed through a well-defined API
- Event-based communication between modules (pub/sub via EventBusService)

### Patterns Worth Noting

| Pattern | Medusa Approach | IOX Status |
|---------|----------------|------------|
| **Module isolation** | Each module has its own Mikro-ORM repository, service, and subscriber layers. Modules communicate only via events or explicit service calls. | IOX modules share a single Prisma client. Good enough at current scale, but module boundaries are softer. |
| **Workflow engine** | Medusa v2 introduces `@medusajs/workflows-sdk` — compensating transactions with rollback steps. Payment capture, order creation, fulfillment happen in a single workflow with automatic compensation on failure. | IOX uses manual `$transaction` blocks. For multi-step flows (payment → invoice → notification), a lightweight saga/workflow would reduce partial failure risk. |
| **Plugin system** | First-class plugin API: plugins register services, routes, models, subscribers. Third-party integrations (Stripe, SendGrid) are plugins. | IOX uses NestJS DI modules — functionally similar but no dynamic plugin loading. Adequate for a single-tenant B2B marketplace. |
| **Tax & Region modules** | Dedicated TaxModule and RegionModule for multi-region pricing, tax calculations, currency support. | IOX is single-currency (EUR implied). Not needed now, but worth noting for international expansion. |
| **Event subscribers** | All side effects (email, analytics, index updates) are event subscribers, not inline service calls. | IOX mixes inline calls (e.g., `safeNotifyBuyer()` in webhook handler) with some event-driven patterns. Could benefit from a lightweight event bus for search indexing triggers. |
| **Admin SDK** | Auto-generated admin dashboard with customizable widgets and routes. | IOX admin is hand-built Next.js pages. More control but higher maintenance. |

### Key Takeaway

Medusa's workflow engine is the most compelling pattern. IOX's payment flow
(checkout → webhook → invoice → email) would benefit from explicit
compensating transactions rather than try/catch chains.

---

## 2. Vendure (vendure.io)

### Architecture

Vendure uses NestJS (same as IOX) with TypeORM. Architecture is plugin-based
with a strong focus on multi-channel, multi-vendor scenarios.

### Patterns Worth Noting

| Pattern | Vendure Approach | IOX Status |
|---------|-----------------|------------|
| **Channel system** | Every entity belongs to one or more Channels. Enables multi-tenant, multi-storefront from a single DB. Each Channel has its own currency, language, and tax settings. | IOX is single-channel. The `company_id` field on many entities serves a similar isolation purpose but isn't formalized as a Channel concept. |
| **Asset system** | Dedicated AssetModule with preview generation, focal point cropping, and pluggable storage strategies (S3, local, custom). | IOX uses MinIO with a simpler MediaAssetsModule. The Vendure approach of a pluggable storage strategy behind an interface is cleaner. |
| **Custom fields** | Runtime-extensible entities via `customFields` configuration. No migrations needed for tenant-specific fields. | IOX uses Prisma with explicit schema changes. Custom fields would add flexibility but also complexity. Not recommended for current stage. |
| **Order state machine** | Explicit FSM for Order lifecycle (AddingItems → ArrangingPayment → PaymentAuthorized → PaymentSettled → Shipped → Delivered). Each transition has guards and side effects. | IOX quote requests have status transitions but no formal FSM. Payment states rely on Stripe webhook events. A state machine for the Order/QuoteRequest lifecycle would improve reliability. |
| **Search plugin** | Pluggable search with built-in support for Elasticsearch, MeiliSearch, or SQLite FTS. The search index is maintained via event subscribers that listen to ProductEvent, CollectionEvent, etc. | IOX just added MeiliSearch with manual `indexProduct()` calls. Should adopt event-driven indexing (call `indexProduct()` from a Prisma middleware or NestJS event subscriber when products change). |
| **Job queue** | Built-in BullMQ job queue for background tasks: email sending, search re-indexing, asset processing. | IOX processes everything synchronously or in webhook handlers. Background job queue would help with reindex, PDF generation, email retries. |
| **GraphQL API** | Primary API is GraphQL with Shop API (public) and Admin API (internal) separation. REST available via plugin. | IOX uses REST exclusively. GraphQL would reduce over-fetching on the catalog page but adds complexity. REST is fine for current needs. |

### Key Takeaway

Vendure's event-driven search indexing is directly applicable: instead of
manually calling `indexProduct()` after every product mutation, register a
NestJS event listener that triggers indexing whenever a product is
created/updated. This ensures the search index stays in sync automatically.

---

## 3. Cross-Cutting Observations

### What IOX Does Well

1. **Prisma as single source of truth** — simpler than TypeORM/Mikro-ORM for
   a small team. Schema is readable, migrations are predictable.
2. **Graceful degradation pattern** — MeiliSearch and Stripe factories both
   handle missing configuration without crashing at boot. This is better than
   Medusa's approach (which requires explicit module opt-in).
3. **Monorepo with shared types** — `@iox/shared` package ensures type safety
   between frontend and backend. Medusa achieves this differently via generated
   SDK clients.
4. **Simple auth model** — JWT with role-based guards covers the B2B use case
   without the complexity of Vendure's Channel+Permission matrix.

### Gaps to Consider

| Priority | Gap | Effort | Impact |
|----------|-----|--------|--------|
| **High** | Event-driven search indexing | 1-2 days | Eliminates stale search index |
| **High** | Background job queue (BullMQ) | 2-3 days | Reliable emails, PDF gen, reindex |
| **Medium** | Order/QuoteRequest state machine | 1-2 days | Prevents invalid state transitions |
| **Medium** | Workflow/saga for payment flow | 2-3 days | Handles partial failures cleanly |
| **Low** | Pluggable storage strategy for MinIO | 1 day | Easier cloud migration |
| **Low** | Admin dashboard framework | N/A | Current hand-built approach works |

### Not Recommended

- **Custom fields system** — over-engineering for current stage
- **GraphQL migration** — REST endpoints are well-structured and sufficient
- **Multi-channel support** — IOX serves a single marketplace; Channel abstraction would be premature
- **Plugin system** — NestJS modules provide enough modularity without dynamic loading

---

## 4. Recommended Next Steps (Priority Order)

1. **Add NestJS EventEmitter for search indexing** — when a product or seller
   is created/updated, emit an event. A subscriber calls `indexProduct()` or
   `indexSeller()`. This replaces manual calls and keeps the index in sync.

2. **Add BullMQ job queue** — for email sending, search reindexing, and future
   PDF generation. Redis is already optional in the stack (`REDIS_URL` env var).

3. **Formalize QuoteRequest state machine** — define valid transitions with
   guards. Prevents bugs where a quote moves from REJECTED to PAID.

4. **Consider workflow pattern for payment flow** — the current
   webhook → invoice → email chain works but has no rollback. A simple
   saga pattern (even without Medusa's SDK) would improve reliability.
