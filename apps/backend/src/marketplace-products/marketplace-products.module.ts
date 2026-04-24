import { Module } from '@nestjs/common';
import { MarketplaceProductsService } from './marketplace-products.service';
import { MarketplaceProductsController } from './marketplace-products.controller';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceReviewModule } from '../marketplace-review/marketplace-review.module';

@Module({
  imports: [AuditModule, MarketplaceReviewModule],
  providers: [MarketplaceProductsService],
  controllers: [MarketplaceProductsController],
  exports: [MarketplaceProductsService],
})
export class MarketplaceProductsModule {}
