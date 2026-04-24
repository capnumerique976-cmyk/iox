import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.AUDITOR,
    UserRole.QUALITY_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
  )
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('alerts')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.AUDITOR,
    UserRole.QUALITY_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
  )
  getAlerts() {
    return this.dashboardService.getAlerts();
  }

  @Get('recent-activity')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.AUDITOR,
    UserRole.QUALITY_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
  )
  getRecentActivity(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.dashboardService.getRecentActivity(limit);
  }
}
