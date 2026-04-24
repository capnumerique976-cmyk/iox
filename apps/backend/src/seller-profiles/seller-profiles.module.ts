import { Module } from '@nestjs/common';
import { SellerProfilesService } from './seller-profiles.service';
import { SellerProfilesController } from './seller-profiles.controller';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceReviewModule } from '../marketplace-review/marketplace-review.module';

@Module({
  imports: [AuditModule, MarketplaceReviewModule],
  providers: [SellerProfilesService],
  controllers: [SellerProfilesController],
  exports: [SellerProfilesService],
})
export class SellerProfilesModule {}
