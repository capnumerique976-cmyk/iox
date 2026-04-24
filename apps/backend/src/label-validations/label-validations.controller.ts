import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';
import { LabelValidationsService } from './label-validations.service';
import {
  CreateLabelValidationDto,
  UpdateLabelValidationDto,
  QueryLabelValidationsDto,
} from './dto/label-validation.dto';

@Controller('label-validations')
export class LabelValidationsController {
  constructor(private readonly service: LabelValidationsService) {}

  @Get()
  findAll(@Query() query: QueryLabelValidationsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
  )
  create(
    @Body() dto: CreateLabelValidationDto,
    @Request() req: Express.Request & { user: { sub: string } },
  ) {
    return this.service.create(dto, req.user?.sub);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLabelValidationDto,
    @Request() req: Express.Request & { user: { sub: string } },
  ) {
    return this.service.update(id, dto, req.user?.sub);
  }
}
