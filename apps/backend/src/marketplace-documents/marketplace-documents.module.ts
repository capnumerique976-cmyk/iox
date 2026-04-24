import { Module } from '@nestjs/common';
import { MarketplaceDocumentsService } from './marketplace-documents.service';
import { MarketplaceDocumentsController } from './marketplace-documents.controller';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceReviewModule } from '../marketplace-review/marketplace-review.module';

@Module({
  imports: [AuditModule, MarketplaceReviewModule],
  providers: [MarketplaceDocumentsService],
  controllers: [MarketplaceDocumentsController],
  exports: [MarketplaceDocumentsService],
})
export class MarketplaceDocumentsModule {}
