import { Module } from '@nestjs/common';
import { MediaAssetsService } from './media-assets.service';
import { MediaAssetsController } from './media-assets.controller';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceReviewModule } from '../marketplace-review/marketplace-review.module';

@Module({
  imports: [AuditModule, MarketplaceReviewModule],
  providers: [MediaAssetsService],
  controllers: [MediaAssetsController],
  exports: [MediaAssetsService],
})
export class MediaAssetsModule {}
