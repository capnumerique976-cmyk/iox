import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JourneyService } from './journey.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [UsersService, JourneyService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
