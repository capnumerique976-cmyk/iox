# MeiliSearch Full-Text Search Integration

## Overview

MeiliSearch provides typo-tolerant, instant full-text search for the IOX marketplace. It indexes two collections:

- **Products** (`products` index) — MarketplaceProduct records
- **Sellers** (`sellers` index) — SellerProfile records

## Architecture

```
┌─────────────┐     ┌───────────────────┐     ┌────────────┐
│  Frontend    │────▶│  SearchController  │────▶│ MeiliSearch│
│  SearchBar   │     │  /search/products  │     │  (SDK)     │
│              │     │  /search/sellers   │     └────────────┘
└─────────────┘     │                    │            │
                    │  Fallback path ────│───────▶ Postgres
                    └───────────────────┘      (LIKE queries)
```

### Graceful Degradation

If `MEILISEARCH_HOST` is not set or MeiliSearch is unreachable:
1. Factory creates a null client wrapper (`isConfigured() = false`)
2. SearchService falls back to Postgres LIKE queries automatically
3. Response `meta.backend` field indicates which engine was used

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MEILISEARCH_HOST` | No | MeiliSearch server URL (e.g. `http://localhost:7700`) |
| `MEILISEARCH_API_KEY` | No | MeiliSearch master/admin API key |

## Backend Files

| File | Purpose |
|------|---------|
| `src/search/meilisearch-client.factory.ts` | DI factory (MEILISEARCH_CLIENT token) |
| `src/search/search-indexer.service.ts` | Syncs Prisma records to MeiliSearch indexes |
| `src/search/search.service.ts` | Public search with MeiliSearch + Postgres fallback |
| `src/search/search.controller.ts` | REST endpoints |
| `src/search/search.module.ts` | NestJS module |

## API Endpoints

### `GET /marketplace/search/products` (Public)

Query params: `q`, `category`, `country`, `availabilityMonth`, `moqMax`, `page`, `limit`, `sort`

### `GET /marketplace/search/sellers` (Public)

Query params: `q`, `country`, `region`, `page`, `limit`

### `POST /admin/search/reindex` (Admin only)

Triggers full reindex of all products and sellers. Returns `{ success, products, sellers }`.

## Index Configuration

### Products Index

- **Searchable**: commercialName, subtitle, varietySpecies, productionMethod, descriptionShort, sellerDisplayName, categoryName
- **Filterable**: categoryId, categorySlug, originCountry, originRegion, qualityAttributes, temperatureRequirements, availabilityMonths, minimumOrderQuantity, isYearRound, sellerStatus, publicationStatus, exportReadinessStatus, sellerProfileId
- **Sortable**: featuredRank, createdAt

### Sellers Index

- **Searchable**: publicDisplayName, slug, descriptionShort, country, region
- **Filterable**: country, region, status
- **Sortable**: createdAt

## Hash-Based Index Skip

Each record stores `searchIndexHash` (SHA256 prefix) and `searchIndexedAt`. On reindex, if the hash matches, the record is skipped — avoids unnecessary MeiliSearch writes.

## Database Migration

Migration `20260503120000_meilisearch_search_indexed_at` adds:
- `marketplace_products.search_indexed_at` (nullable timestamp)
- `marketplace_products.search_index_hash` (nullable text)
- `seller_profiles.search_indexed_at` (nullable timestamp)
- `seller_profiles.search_index_hash` (nullable text)

## Frontend

`SearchSuggest.tsx` calls both `/marketplace/search/products` and `/marketplace/search/sellers` with debounce, showing combined results in an autocomplete dropdown.

## Local Development

```bash
# Start MeiliSearch (Docker)
docker run -d -p 7700:7700 -e MEILI_MASTER_KEY=dev-key getmeili/meilisearch:v1.7

# Add to .env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=dev-key

# Trigger initial index
curl -X POST http://localhost:3001/api/v1/admin/search/reindex \
  -H "Authorization: Bearer <admin-jwt>"
```
