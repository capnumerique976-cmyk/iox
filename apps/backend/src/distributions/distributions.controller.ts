import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DistributionsService } from './distributions.service';
import {
  CreateDistributionDto,
  UpdateDistributionDto,
  ChangeDistributionStatusDto,
  QueryDistributionsDto,
} from './dto/distribution.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@iox/shared';

const READ_ROLES = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.BENEFICIARY_MANAGER,
  UserRole.LOGISTICS_MANAGER,
  UserRole.AUDITOR,
  UserRole.COMMERCIAL_MANAGER,
  UserRole.QUALITY_MANAGER,
];
const WRITE_ROLES = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.LOGISTICS_MANAGER,
  UserRole.BENEFICIARY_MANAGER,
];

@Controller('distributions')
export class DistributionsController {
  constructor(private readonly svc: DistributionsService) {}

  @Get()
  @Roles(...READ_ROLES)
  findAll(@Query() query: QueryDistributionsDto) {
    return this.svc.findAll(query);
  }

  @Get('stats')
  @Roles(...READ_ROLES)
  getStats() {
    return this.svc.getStats();
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreateDistributionDto, @CurrentUser() user: any) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateDistributionDto, @CurrentUser() user: any) {
    return this.svc.update(id, dto, user.sub);
  }

  @Patch(':id/status')
  @Roles(...WRITE_ROLES)
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeDistributionStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.changeStatus(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.sub);
  }
}
