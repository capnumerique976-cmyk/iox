// MP-CATEGORY-1 — Module catégories marketplace.

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceCategoriesController } from './marketplace-categories.controller';
import { MarketplaceCategoriesService } from './marketplace-categories.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [MarketplaceCategoriesController],
  providers: [MarketplaceCategoriesService],
  exports: [MarketplaceCategoriesService],
})
export class MarketplaceCategoriesModule {}
