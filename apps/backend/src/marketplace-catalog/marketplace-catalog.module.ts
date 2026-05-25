import { Module } from '@nestjs/common';
import { MarketplaceCatalogService } from './marketplace-catalog.service';
import { MarketplaceCatalogController } from './marketplace-catalog.controller';
import { MarketplaceVisibilityFilter } from './domain/marketplace-visibility-filter.service';

@Module({
  providers: [MarketplaceCatalogService, MarketplaceVisibilityFilter],
  controllers: [MarketplaceCatalogController],
  exports: [MarketplaceCatalogService, MarketplaceVisibilityFilter],
})
export class MarketplaceCatalogModule {}
