import { Module } from '@nestjs/common';
import { SupplyContractsService } from './supply-contracts.service';
import { SupplyContractsController } from './supply-contracts.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [SupplyContractsService],
  controllers: [SupplyContractsController],
  exports: [SupplyContractsService],
})
export class SupplyContractsModule {}
