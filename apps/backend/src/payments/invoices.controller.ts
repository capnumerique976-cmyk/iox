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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/payments.dto';
import { InvoiceResponseDto, PaginatedInvoicesDto } from '../common/dto/swagger-responses.dto';

const INVOICE_ROLES = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.MARKETPLACE_BUYER,
  UserRole.MARKETPLACE_SELLER,
] as const;

@ApiTags('invoices')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
@Controller('invoices')
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVOICE_ROLES)
  @ApiOperation({
    summary: 'Liste les factures (filtré par buyer/seller selon rôle)',
    description:
      'Scoping automatique selon le rôle : ' +
      'MARKETPLACE_BUYER → factures de sa compagnie ; ' +
      'MARKETPLACE_SELLER → factures de son profil vendeur ; ' +
      'ADMIN/COORDINATOR → filtrage explicite via `buyerCompanyId` ou `sellerProfileId`. ' +
      'Les montants sont en centimes. La devise est EUR ou USD.',
  })
  @ApiQuery({ name: 'buyerCompanyId', required: false, description: 'Filtrer par compagnie acheteuse (UUID)' })
  @ApiQuery({ name: 'sellerProfileId', required: false, description: 'Filtrer par profil vendeur (UUID)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: PaginatedInvoicesDto })
  @ApiForbiddenResponse({ description: 'Rôle insuffisant' })
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
  @Roles(...INVOICE_ROLES)
  @ApiOperation({
    summary: 'Détail d\'une facture',
    description:
      'Ownership : buyer/seller voient uniquement leurs propres factures. ' +
      'Admin/Coordinator voient toutes les factures.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la facture' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiNotFoundResponse({ description: 'Facture introuvable ou accès refusé' })
  @ApiForbiddenResponse({ description: 'Ownership non respectée' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.invoices.findById(id, actor);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une facture à partir d\'un paiement',
    description:
      'Génère une facture PDF à partir d\'un paiement SUCCEEDED. ' +
      'La facture reçoit un numéro auto-incrémenté (INV-YYYY-NNNNN). ' +
      'Rôles : ADMIN, COORDINATOR.',
  })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  @ApiBadRequestResponse({ description: 'Paiement introuvable ou non en statut SUCCEEDED' })
  @ApiForbiddenResponse({ description: 'Rôles ADMIN ou COORDINATOR requis' })
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.invoices.createFromPayment(dto.paymentId, actor);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVOICE_ROLES)
  @ApiOperation({
    summary: 'Télécharger le PDF d\'une facture',
    description:
      'Génère ou retourne le PDF de la facture. ' +
      'Content-Type : application/pdf. ' +
      'Content-Disposition : attachment; filename="facture-INV-YYYY-NNNNN.pdf". ' +
      'Ownership identique à GET /invoices/:id.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la facture' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'PDF de la facture (binary)',
    content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiNotFoundResponse({ description: 'Facture introuvable ou accès refusé' })
  @ApiForbiddenResponse({ description: 'Ownership non respectée' })
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.invoices.generatePdf(id, actor);

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
