import { Module } from '@nestjs/common';
import { MarketplaceOffersService } from './marketplace-offers.service';
import { MarketplaceOffersController } from './marketplace-offers.controller';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceReviewModule } from '../marketplace-review/marketplace-review.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [AuditModule, MarketplaceReviewModule, PaymentsModule],
  providers: [MarketplaceOffersService],
  controllers: [MarketplaceOffersController],
  exports: [MarketplaceOffersService],
})
export class MarketplaceOffersModule {}
