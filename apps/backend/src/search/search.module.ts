import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { meiliSearchClientProvider } from './meilisearch-client.factory';
import { SearchService } from './search.service';
import { SearchIndexerService } from './search-indexer.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [SearchController],
  providers: [meiliSearchClientProvider, SearchService, SearchIndexerService],
  exports: [SearchService, SearchIndexerService, meiliSearchClientProvider],
})
export class SearchModule {}
