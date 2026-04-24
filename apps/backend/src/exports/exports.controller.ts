import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';

@Controller('exports')
@Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.AUDITOR)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  /* ------------------------------------------------------------------ */
  /*  Product batches                                                     */
  /* ------------------------------------------------------------------ */

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

  @Get('supply-contracts')
  async exportSupplyContracts(@Query('status') status?: string, @Res() res?: Response) {
    const csv = await this.exportsService.exportSupplyContractsCsv({ status });
    this.sendCsv(res!, 'contrats-appro', csv);
  }

  /* ------------------------------------------------------------------ */
  /*  Distributions                                                       */
  /* ------------------------------------------------------------------ */

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
