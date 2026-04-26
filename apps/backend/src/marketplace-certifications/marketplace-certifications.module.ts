import { Module } from '@nestjs/common';
import { MarketplaceCertificationsService } from './marketplace-certifications.service';
import { MarketplaceCertificationsController } from './marketplace-certifications.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [MarketplaceCertificationsService],
  controllers: [MarketplaceCertificationsController],
  exports: [MarketplaceCertificationsService],
})
export class MarketplaceCertificationsModule {}
