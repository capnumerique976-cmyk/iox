import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [MembershipsService],
  controllers: [MembershipsController],
  exports: [MembershipsService],
})
export class MembershipsModule {}
