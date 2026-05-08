// Search service — public-facing search via MeiliSearch with Postgres fallback.
//
// If MeiliSearch is down or not configured, falls back to the existing
// marketplace-catalog Postgres LIKE search (graceful degradation).

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  MEILISEARCH_CLIENT,
  type MeiliSearchClientWrapper,
} from './meilisearch-client.factory';
import { PRODUCTS_INDEX, SELLERS_INDEX } from './search-indexer.service';

export interface SearchProductsQuery {
  q?: string;
  category?: string;
  country?: string;
  certifications?: string; // comma-separated
  availabilityMonth?: string;
  moqMax?: number;
  availableOnly?: boolean;
  page?: number;
  limit?: number;
  sort?: string; // 'createdAt:desc' | 'featuredRank:asc'
}

export interface SearchSellersQuery {
  q?: string;
  country?: string;
  region?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    backend: 'meilisearch' | 'postgres';
    processingTimeMs?: number;
  };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEILISEARCH_CLIENT)
    private readonly meiliWrapper: MeiliSearchClientWrapper,
  ) {}

  async searchProducts(query: SearchProductsQuery): Promise<SearchResult<Record<string, unknown>>> {
    if (!this.meiliWrapper.isConfigured()) {
      return this.searchProductsPostgres(query);
    }

    try {
      return await this.searchProductsMeili(query);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(`MeiliSearch products search failed, falling back to Postgres: ${msg}`);
      return this.searchProductsPostgres(query);
    }
  }

  async searchSellers(query: SearchSellersQuery): Promise<SearchResult<Record<string, unknown>>> {
    if (!this.meiliWrapper.isConfigured()) {
      return this.searchSellersPostgres(query);
    }

    try {
      return await this.searchSellersMeili(query);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(`MeiliSearch sellers search failed, falling back to Postgres: ${msg}`);
      return this.searchSellersPostgres(query);
    }
  }

  // ─── MeiliSearch implementations ──────────────────────────────────────────

  private async searchProductsMeili(
    query: SearchProductsQuery,
  ): Promise<SearchResult<Record<string, unknown>>> {
    const client = this.meiliWrapper.client();
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 100);

    // Build filter array
    const filters: string[] = ['publicationStatus = "PUBLISHED"'];
    if (query.category) filters.push(`categorySlug = "${query.category}"`);
    if (query.country) filters.push(`originCountry = "${query.country}"`);
    if (query.availabilityMonth) {
      filters.push(`availabilityMonths = "${query.availabilityMonth}"`);
    }
    if (query.moqMax != null) {
      filters.push(`minimumOrderQuantity <= ${query.moqMax}`);
    }

    const sort = query.sort ? [query.sort] : ['createdAt:desc'];

    const result = await client.index(PRODUCTS_INDEX).search(query.q ?? '', {
      filter: filters,
      sort,
      offset: (page - 1) * limit,
      limit,
    });

    const total = result.estimatedTotalHits ?? result.totalHits ?? 0;

    return {
      data: result.hits as Record<string, unknown>[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        backend: 'meilisearch',
        processingTimeMs: result.processingTimeMs,
      },
    };
  }

  private async searchSellersMeili(
    query: SearchSellersQuery,
  ): Promise<SearchResult<Record<string, unknown>>> {
    const client = this.meiliWrapper.client();
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 100);

    const filters: string[] = ['status = "APPROVED"'];
    if (query.country) filters.push(`country = "${query.country}"`);
    if (query.region) filters.push(`region = "${query.region}"`);

    const result = await client.index(SELLERS_INDEX).search(query.q ?? '', {
      filter: filters,
      offset: (page - 1) * limit,
      limit,
    });

    const total = result.estimatedTotalHits ?? result.totalHits ?? 0;

    return {
      data: result.hits as Record<string, unknown>[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        backend: 'meilisearch',
        processingTimeMs: result.processingTimeMs,
      },
    };
  }

  // ─── Postgres fallbacks ───────────────────────────────────────────────────

  private async searchProductsPostgres(
    query: SearchProductsQuery,
  ): Promise<SearchResult<Record<string, unknown>>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      publicationStatus: 'PUBLISHED',
    };

    if (query.q) {
      where.OR = [
        { commercialName: { contains: query.q, mode: 'insensitive' } },
        { subtitle: { contains: query.q, mode: 'insensitive' } },
        { varietySpecies: { contains: query.q, mode: 'insensitive' } },
        { descriptionShort: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.country) {
      where.originCountry = { contains: query.country, mode: 'insensitive' };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.marketplaceProduct.findMany({
        where: where as never,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          commercialName: true,
          subtitle: true,
          slug: true,
          originCountry: true,
          originRegion: true,
          publicationStatus: true,
          exportReadinessStatus: true,
          qualityAttributes: true,
          sellerProfileId: true,
          createdAt: true,
        },
      }),
      this.prisma.marketplaceProduct.count({ where: where as never }),
    ]);

    return {
      data: data as unknown as Record<string, unknown>[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        backend: 'postgres',
      },
    };
  }

  private async searchSellersPostgres(
    query: SearchSellersQuery,
  ): Promise<SearchResult<Record<string, unknown>>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { status: 'APPROVED' };

    if (query.q) {
      where.OR = [
        { publicDisplayName: { contains: query.q, mode: 'insensitive' } },
        { descriptionShort: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.country) {
      where.country = { contains: query.country, mode: 'insensitive' };
    }
    if (query.region) {
      where.region = { contains: query.region, mode: 'insensitive' };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sellerProfile.findMany({
        where: where as never,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          publicDisplayName: true,
          slug: true,
          descriptionShort: true,
          country: true,
          region: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.sellerProfile.count({ where: where as never }),
    ]);

    return {
      data: data as unknown as Record<string, unknown>[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        backend: 'postgres',
      },
    };
  }
}
