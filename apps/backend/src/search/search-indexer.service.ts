// MeiliSearch indexer — syncs Prisma models to MeiliSearch indexes.
//
// Two indexes: `products` (MarketplaceProduct) and `sellers` (SellerProfile).
// Hash-based skip: only re-indexes if data changed since last index.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  MEILISEARCH_CLIENT,
  type MeiliSearchClientWrapper,
} from './meilisearch-client.factory';

export const PRODUCTS_INDEX = 'products';
export const SELLERS_INDEX = 'sellers';

export interface ProductDocument {
  id: string;
  commercialName: string;
  subtitle: string | null;
  slug: string;
  varietySpecies: string | null;
  productionMethod: string | null;
  descriptionShort: string | null;
  originCountry: string;
  originRegion: string | null;
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  qualityAttributes: string[];
  temperatureRequirements: string | null;
  availabilityMonths: string[];
  isYearRound: boolean;
  minimumOrderQuantity: number | null;
  publicationStatus: string;
  exportReadinessStatus: string;
  sellerProfileId: string;
  sellerDisplayName: string;
  sellerStatus: string;
  featuredRank: number;
  createdAt: number; // epoch ms for sorting
}

export interface SellerDocument {
  id: string;
  publicDisplayName: string;
  slug: string;
  descriptionShort: string | null;
  country: string | null;
  region: string | null;
  status: string;
  createdAt: number;
}

@Injectable()
export class SearchIndexerService {
  private readonly logger = new Logger(SearchIndexerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEILISEARCH_CLIENT)
    private readonly meiliWrapper: MeiliSearchClientWrapper,
  ) {}

  /** Configure index settings (searchable, filterable, sortable). Idempotent. */
  async configureIndexes(): Promise<void> {
    if (!this.meiliWrapper.isConfigured()) return;
    const client = this.meiliWrapper.client();

    // Products index
    const productsIdx = client.index(PRODUCTS_INDEX);
    await productsIdx.updateSettings({
      searchableAttributes: [
        'commercialName',
        'subtitle',
        'varietySpecies',
        'productionMethod',
        'descriptionShort',
        'sellerDisplayName',
        'categoryName',
      ],
      filterableAttributes: [
        'categoryId',
        'categorySlug',
        'originCountry',
        'originRegion',
        'qualityAttributes',
        'temperatureRequirements',
        'availabilityMonths',
        'minimumOrderQuantity',
        'isYearRound',
        'sellerStatus',
        'publicationStatus',
        'exportReadinessStatus',
        'sellerProfileId',
      ],
      sortableAttributes: ['featuredRank', 'createdAt'],
      typoTolerance: { enabled: true },
    });

    // Sellers index
    const sellersIdx = client.index(SELLERS_INDEX);
    await sellersIdx.updateSettings({
      searchableAttributes: [
        'publicDisplayName',
        'slug',
        'descriptionShort',
        'country',
        'region',
      ],
      filterableAttributes: ['country', 'region', 'status'],
      sortableAttributes: ['createdAt'],
      typoTolerance: { enabled: true },
    });

    this.logger.log('MeiliSearch indexes configured');
  }

  /** Hash document data to skip re-indexing unchanged records. */
  private hashDocument(doc: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(doc)).digest('hex').slice(0, 16);
  }

  /** Index a single product by ID. */
  async indexProduct(productId: string): Promise<boolean> {
    if (!this.meiliWrapper.isConfigured()) return false;

    const product = await this.prisma.marketplaceProduct.findUnique({
      where: { id: productId },
      include: {
        sellerProfile: { select: { publicDisplayName: true, status: true } },
        category: { select: { slug: true, nameFr: true } },
      },
    });
    if (!product) return false;

    const doc: ProductDocument = {
      id: product.id,
      commercialName: product.commercialName,
      subtitle: product.subtitle,
      slug: product.slug,
      varietySpecies: product.varietySpecies,
      productionMethod: product.productionMethod,
      descriptionShort: product.descriptionShort,
      originCountry: product.originCountry,
      originRegion: product.originRegion,
      categoryId: product.categoryId,
      categorySlug: product.category?.slug ?? null,
      categoryName: product.category?.nameFr ?? null,
      qualityAttributes: product.qualityAttributes as string[],
      temperatureRequirements: product.temperatureRequirements,
      availabilityMonths: product.availabilityMonths as string[],
      isYearRound: product.isYearRound,
      minimumOrderQuantity: product.minimumOrderQuantity
        ? Number(product.minimumOrderQuantity)
        : null,
      publicationStatus: product.publicationStatus,
      exportReadinessStatus: product.exportReadinessStatus,
      sellerProfileId: product.sellerProfileId,
      sellerDisplayName: product.sellerProfile.publicDisplayName,
      sellerStatus: product.sellerProfile.status,
      featuredRank: 0,
      createdAt: product.createdAt.getTime(),
    };

    const hash = this.hashDocument(doc as unknown as Record<string, unknown>);

    // Skip if hash unchanged
    if (
      product.searchIndexHash === hash &&
      product.searchIndexedAt
    ) {
      return false;
    }

    const client = this.meiliWrapper.client();
    await client.index(PRODUCTS_INDEX).addDocuments([doc] as unknown as Record<string, unknown>[]);

    await this.prisma.marketplaceProduct.update({
      where: { id: productId },
      data: { searchIndexedAt: new Date(), searchIndexHash: hash },
    });

    return true;
  }

  /** Index a single seller by ID. */
  async indexSeller(sellerId: string): Promise<boolean> {
    if (!this.meiliWrapper.isConfigured()) return false;

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });
    if (!seller) return false;

    const doc: SellerDocument = {
      id: seller.id,
      publicDisplayName: seller.publicDisplayName,
      slug: seller.slug,
      descriptionShort: seller.descriptionShort,
      country: seller.country,
      region: seller.region,
      status: seller.status,
      createdAt: seller.createdAt.getTime(),
    };

    const hash = this.hashDocument(doc as unknown as Record<string, unknown>);

    if (
      seller.searchIndexHash === hash &&
      seller.searchIndexedAt
    ) {
      return false;
    }

    const client = this.meiliWrapper.client();
    await client.index(SELLERS_INDEX).addDocuments([doc] as unknown as Record<string, unknown>[]);

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { searchIndexedAt: new Date(), searchIndexHash: hash },
    });

    return true;
  }

  /** Full reindex of all products and sellers. */
  async reindexAll(): Promise<{ products: number; sellers: number }> {
    if (!this.meiliWrapper.isConfigured()) {
      this.logger.warn('reindexAll skipped — MeiliSearch not configured');
      return { products: 0, sellers: 0 };
    }

    await this.configureIndexes();

    // Reindex products (batch 100)
    let productCount = 0;
    let skip = 0;
    const batchSize = 100;

    while (true) {
      const products = await this.prisma.marketplaceProduct.findMany({
        skip,
        take: batchSize,
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (products.length === 0) break;

      for (const p of products) {
        const indexed = await this.indexProduct(p.id);
        if (indexed) productCount++;
      }
      skip += batchSize;
    }

    // Reindex sellers (batch 100)
    let sellerCount = 0;
    skip = 0;

    while (true) {
      const sellers = await this.prisma.sellerProfile.findMany({
        skip,
        take: batchSize,
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (sellers.length === 0) break;

      for (const s of sellers) {
        const indexed = await this.indexSeller(s.id);
        if (indexed) sellerCount++;
      }
      skip += batchSize;
    }

    this.logger.log(
      `reindexAll complete: products=${productCount} sellers=${sellerCount}`,
    );
    return { products: productCount, sellers: sellerCount };
  }
}
