// MeiliSearch client factory — DI token pattern (same as Stripe factory).
//
// If MEILISEARCH_HOST / MEILISEARCH_API_KEY absent at boot → graceful
// degradation: search falls back to Postgres (catalog service).

import type { Provider } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const MEILISEARCH_CLIENT = 'MEILISEARCH_CLIENT';

/** Minimal typed surface of the MeiliSearch SDK we actually use. */
export interface MeiliSearchIndex {
  search(query: string, params?: Record<string, unknown>): Promise<{
    hits: Record<string, unknown>[];
    estimatedTotalHits?: number;
    totalHits?: number;
    processingTimeMs?: number;
  }>;
  addDocuments(documents: Record<string, unknown>[], options?: { primaryKey?: string }): Promise<unknown>;
  updateSettings(settings: Record<string, unknown>): Promise<unknown>;
}

export interface MeiliSearchClient {
  index(uid: string): MeiliSearchIndex;
}

export interface MeiliSearchClientWrapper {
  isConfigured(): boolean;
  client(): MeiliSearchClient;
}

class MeiliSearchClientWrapperImpl implements MeiliSearchClientWrapper {
  private readonly logger = new Logger('MeiliSearchClient');
  private readonly meili: MeiliSearchClient | null;

  constructor(host: string | undefined, apiKey: string | undefined) {
    if (host && host.length > 0) {
      // Dynamic require — meilisearch package exports `Meilisearch` (lowercase s)
      // when consumed via CJS require. Handles both named and default exports.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pkg = require('meilisearch');
      const MeiliCtor = pkg.Meilisearch ?? pkg.MeiliSearch ?? pkg.default?.Meilisearch ?? pkg.default;
      this.meili = new MeiliCtor({ host, apiKey: apiKey ?? '' }) as MeiliSearchClient;
      this.logger.log(`MeiliSearch client configured host=${host}`);
    } else {
      this.meili = null;
      this.logger.warn(
        'MEILISEARCH_HOST not set — full-text search will fall back to Postgres',
      );
    }
  }

  isConfigured(): boolean {
    return this.meili !== null;
  }

  client(): MeiliSearchClient {
    if (!this.meili) {
      throw new Error(
        'MeiliSearch SDK not configured. Set MEILISEARCH_HOST env var to enable full-text search.',
      );
    }
    return this.meili;
  }
}

export const meiliSearchClientProvider: Provider = {
  provide: MEILISEARCH_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): MeiliSearchClientWrapper => {
    const host = config.get<string>('MEILISEARCH_HOST');
    const apiKey = config.get<string>('MEILISEARCH_API_KEY');
    return new MeiliSearchClientWrapperImpl(host, apiKey);
  },
};
