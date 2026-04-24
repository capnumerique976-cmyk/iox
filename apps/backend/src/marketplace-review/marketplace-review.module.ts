import { Module } from '@nestjs/common';
import { MarketplaceReviewService } from './marketplace-review.service';
import { MarketplaceReviewController } from './marketplace-review.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [MarketplaceReviewService],
  controllers: [MarketplaceReviewController],
  exports: [MarketplaceReviewService],
})
export class MarketplaceReviewModule {}
