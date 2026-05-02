import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';

@ApiTags('exports')
@ApiBearerAuth('access-token')
@Controller('exports')
@Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.AUDITOR)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  /* ------------------------------------------------------------------ */
  /*  Product batches                                                     */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export product batches as CSV' })
  @Get('product-batches')
  async exportProductBatches(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportsService.exportProductBatchesCsv({ status, from, to });
    this.sendCsv(res!, 'lots-finis', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Inbound batches                                                     */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export inbound batches as CSV' })
  @Get('inbound-batches')
  async exportInboundBatches(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportsService.exportInboundBatchesCsv({ status, from, to });
    this.sendCsv(res!, 'lots-entrants', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Market release decisions                                            */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export market-release decisions as CSV' })
  @Get('market-decisions')
  async exportMarketDecisions(
    @Query('decision') decision?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportsService.exportMarketDecisionsCsv({ decision, from, to });
    this.sendCsv(res!, 'decisions-marche', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Helper                                                              */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /*  Incidents                                                          */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export incidents as CSV' })
  @Get('incidents')
  async exportIncidents(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportsService.exportIncidentsCsv({ status, severity, from, to });
    this.sendCsv(res!, 'incidents', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Bénéficiaires                                                       */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export beneficiaries as CSV' })
  @Get('beneficiaries')
  async exportBeneficiaries(
    @Query('status') status?: string,
    @Query('sector') sector?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportsService.exportBeneficiariesCsv({ status, sector });
    this.sendCsv(res!, 'beneficiaires', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Entreprises                                                         */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export companies as CSV' })
  @Get('companies')
  async exportCompanies(
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportsService.exportCompaniesCsv({ type, isActive });
    this.sendCsv(res!, 'entreprises', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Produits                                                            */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export products as CSV' })
  @Get('products')
  async exportProducts(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportsService.exportProductsCsv({ status, category });
    this.sendCsv(res!, 'produits', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Contrats d'approvisionnement                                        */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export supply contracts as CSV' })
  @Get('supply-contracts')
  async exportSupplyContracts(@Query('status') status?: string, @Res() res?: Response) {
    const csv = await this.exportsService.exportSupplyContractsCsv({ status });
    this.sendCsv(res!, 'contrats-appro', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Distributions                                                       */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export distributions as CSV' })
  @Get('distributions')
  async exportDistributions(
    @Query('status') status?: string,
    @Query('beneficiaryId') beneficiaryId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportsService.exportDistributionsCsv({
      status,
      beneficiaryId,
      from,
      to,
    });
    this.sendCsv(res!, 'distributions', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Opérations de transformation                                        */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export transformation operations as CSV' })
  @Get('transformation-operations')
  async exportTransformationOperations(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportsService.exportTransformationOperationsCsv({ from, to });
    this.sendCsv(res!, 'transformations', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Validations d'étiquetage                                            */
  /* ------------------------------------------------------------------ */

  @ApiOperation({ summary: 'Export label validations as CSV' })
  @Get('label-validations')
  async exportLabelValidations(@Query('isValid') isValid?: string, @Res() res?: Response) {
    const csv = await this.exportsService.exportLabelValidationsCsv({ isValid });
    this.sendCsv(res!, 'validations-etiquetage', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Helper                                                              */
  /* ------------------------------------------------------------------ */

  private sendCsv(res: Response, basename: string, csv: string) {
    const date = new Date().toISOString().slice(0, 10);
    const filename = `iox-${basename}-${date}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM for Excel UTF-8 compatibility
    res.send('\uFEFF' + csv);
  }
}
