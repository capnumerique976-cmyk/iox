import { Module } from '@nestjs/common';
import { TransformationOperationsService } from './transformation-operations.service';
import { TransformationOperationsController } from './transformation-operations.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [TransformationOperationsService],
  controllers: [TransformationOperationsController],
  exports: [TransformationOperationsService],
})
export class TransformationOperationsModule {}
