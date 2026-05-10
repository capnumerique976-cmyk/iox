import { Controller, Get } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Get('seller/summary')
  @Roles(UserRole.MARKETPLACE_SELLER)
  getSellerSummary(@CurrentUser() actor: RequestUser) {
    return this.service.getSellerSummary(actor);
  }

  @Get('admin/summary')
  @Roles(UserRole.ADMIN, UserRole.QUALITY_MANAGER)
  getAdminSummary() {
    return this.service.getAdminSummary();
  }

  @Get('admin/sellers')
  @Roles(UserRole.ADMIN, UserRole.QUALITY_MANAGER)
  getAdminSellersList() {
    return this.service.getAdminSellersList();
  }
}
