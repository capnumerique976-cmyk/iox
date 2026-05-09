// PAY-2 — Invoices controller.
//
// Endpoints :
//  - GET    /invoices         (ADMIN, COORDINATOR, MARKETPLACE_BUYER, MARKETPLACE_SELLER)
//  - GET    /invoices/:id     (same roles)
//  - POST   /invoices         (ADMIN, COORDINATOR) — body: { paymentId }
//  - GET    /invoices/:id/pdf (same roles) — PDF download

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/payments.dto';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.MARKETPLACE_BUYER,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Liste les factures (filtré par buyer/seller selon rôle)' })
  async list(
    @Query('buyerCompanyId') buyerCompanyId?: string,
    @Query('sellerProfileId') sellerProfileId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() actor?: RequestUser,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    if (buyerCompanyId) {
      return this.invoices.listByBuyer(
        buyerCompanyId,
        { page: pageNum, limit: limitNum },
        actor!,
      );
    }
    if (sellerProfileId) {
      return this.invoices.listBySeller(
        sellerProfileId,
        { page: pageNum, limit: limitNum },
        actor!,
      );
    }

    // Default : buyer scope if MARKETPLACE_BUYER, seller scope if MARKETPLACE_SELLER.
    if (actor?.role === UserRole.MARKETPLACE_BUYER && actor.companyIds?.length) {
      return this.invoices.listByBuyer(
        actor.companyIds[0],
        { page: pageNum, limit: limitNum },
        actor,
      );
    }
    if (actor?.role === UserRole.MARKETPLACE_SELLER && actor.sellerProfileIds?.length) {
      return this.invoices.listBySeller(
        actor.sellerProfileIds[0],
        { page: pageNum, limit: limitNum },
        actor,
      );
    }

    return { data: [], meta: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 } };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.MARKETPLACE_BUYER,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Détail d\'une facture' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.invoices.findById(id, actor);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une facture à partir d\'un paiement' })
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.invoices.createFromPayment(dto.paymentId, actor);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.MARKETPLACE_BUYER,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Télécharger le PDF d\'une facture' })
  @ApiProduces('application/pdf')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.invoices.generatePdf(id, actor);

    // Fetch invoice number for filename
    const invoice = await this.invoices.findById(id, actor);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'private, no-cache',
    });
    res.end(pdfBuffer);
  }
}
