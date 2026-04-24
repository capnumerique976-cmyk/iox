import { Module } from '@nestjs/common';
import { MarketplaceOffersService } from './marketplace-offers.service';
import { MarketplaceOffersController } from './marketplace-offers.controller';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceReviewModule } from '../marketplace-review/marketplace-review.module';

@Module({
  imports: [AuditModule, MarketplaceReviewModule],
  providers: [MarketplaceOffersService],
  controllers: [MarketplaceOffersController],
  exports: [MarketplaceOffersService],
})
export class MarketplaceOffersModule {}
