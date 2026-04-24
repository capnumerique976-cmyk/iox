import { Module } from '@nestjs/common';
import { MarketplaceCatalogService } from './marketplace-catalog.service';
import { MarketplaceCatalogController } from './marketplace-catalog.controller';

@Module({
  providers: [MarketplaceCatalogService],
  controllers: [MarketplaceCatalogController],
  exports: [MarketplaceCatalogService],
})
export class MarketplaceCatalogModule {}
