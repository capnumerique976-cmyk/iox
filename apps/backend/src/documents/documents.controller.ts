import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto, UpdateDocumentStatusDto, QueryDocumentsDto } from './dto/document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  findAll(@Query() query: QueryDocumentsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Get(':id/url')
  getDownloadUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getDownloadUrl(id);
  }

  @Post('upload')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
  )
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Request() req: Express.Request & { user: { sub: string } },
  ) {
    return this.service.upload(dto, file, req.user?.sub);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentStatusDto,
    @Request() req: Express.Request & { user: { sub: string } },
  ) {
    return this.service.updateStatus(id, dto, req.user?.sub);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: Express.Request & { user: { sub: string } },
  ) {
    return this.service.delete(id, req.user?.sub);
  }
}
