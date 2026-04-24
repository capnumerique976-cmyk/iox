import { Module } from '@nestjs/common';
import { ProductBatchesService } from './product-batches.service';
import { ProductBatchesController } from './product-batches.controller';
import { AuditModule } from '../audit/audit.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [AuditModule, ProductsModule],
  providers: [ProductBatchesService],
  controllers: [ProductBatchesController],
  exports: [ProductBatchesService],
})
export class ProductBatchesModule {}
