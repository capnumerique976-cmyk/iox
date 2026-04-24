import { Module } from '@nestjs/common';
import { LabelValidationsService } from './label-validations.service';
import { LabelValidationsController } from './label-validations.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [LabelValidationsService],
  controllers: [LabelValidationsController],
  exports: [LabelValidationsService],
})
export class LabelValidationsModule {}
