import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ExportsService {
  constructor(private prisma: PrismaService) {}

  /* ------------------------------------------------------------------ */
  /*  Generic CSV builder                                                 */
  /* ------------------------------------------------------------------ */

  private toCsv(headers: string[], rows: string[][]): string {
    const escape = (v: string) =>
      v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;

    const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
    return lines.join('\r\n');
  }

  private fmt(d: Date | null | undefined): string {
    if (!d) return '';
    return new Date(d).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Lots finis (ProductBatch)                                          */
  /* ------------------------------------------------------------------ */

  async exportProductBatchesCsv(filters?: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters?.status) where['status'] = filters.status;
    if (filters?.from || filters?.to) {
      const range: Record<string, unknown> = {};
      if (filters.from) range['gte'] = new Date(filters.from);
      if (filters.to) range['lte'] = new Date(filters.to);
      where['createdAt'] = range;
    }

    const batches = await this.prisma.productBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        code: true,
        status: true,
        quantity: true,
        unit: true,
        productionDate: true,
        expiryDate: true,
        createdAt: true,
        product: { select: { name: true, code: true } },
        labelValidations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { isValid: true },
        },
        marketReleaseDecisions: {
          where: { isActive: true },
          take: 1,
          select: { decision: true },
        },
      },
    });

    const headers = [
      'Code lot',
      'Produit',
      'Code produit',
      'Statut',
      'Quantité',
      'Unité',
      'Date production',
      'Date expiration',
      'Étiquetage',
      'Décision marché',
      'Créé le',
    ];

    const rows = batches.map((b) => [
      b.code,
      b.product?.name ?? '',
      b.product?.code ?? '',
      b.status,
      String(b.quantity),
      b.unit,
      this.fmt(b.productionDate),
      this.fmt(b.expiryDate),
      b.labelValidations[0]?.isValid === true
        ? 'Conforme'
        : b.labelValidations[0]?.isValid === false
          ? 'Non conforme'
          : '',
      b.marketReleaseDecisions[0]?.decision ?? '',
      this.fmt(b.createdAt),
    ]);

    return this.toCsv(headers, rows);
  }

  /* ------------------------------------------------------------------ */
  /*  Lots entrants (InboundBatch)                                       */
  /* ------------------------------------------------------------------ */

  async exportInboundBatchesCsv(filters?: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters?.status) where['status'] = filters.status;
    if (filters?.from || filters?.to) {
      const range: Record<string, unknown> = {};
      if (filters.from) range['gte'] = new Date(filters.from);
      if (filters.to) range['lte'] = new Date(filters.to);
      where['createdAt'] = range;
    }

    const batches = await this.prisma.inboundBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        code: true,
        status: true,
        quantity: true,
        unit: true,
        receivedAt: true,
        createdAt: true,
        product: { select: { name: true, code: true } },
        supplier: { select: { name: true } },
        supplyContract: { select: { code: true } },
      },
    });

    const headers = [
      'Code lot',
      'Produit',
      'Code produit',
      'Fournisseur',
      'Contrat',
      'Statut',
      'Quantité',
      'Unité',
      'Date réception',
      'Créé le',
    ];

    const rows = batches.map((b) => [
      b.code,
      b.product?.name ?? '',
      b.product?.code ?? '',
      b.supplier?.name ?? '',
      b.supplyContract?.code ?? '',
      b.status,
      String(b.quantity),
      b.unit,
      this.fmt(b.receivedAt),
      this.fmt(b.createdAt),
    ]);

    return this.toCsv(headers, rows);
  }

  /* ------------------------------------------------------------------ */
  /*  Décisions de mise en marché (MarketReleaseDecision)               */
  /* ------------------------------------------------------------------ */

  async exportMarketDecisionsCsv(filters?: {
    decision?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const where: Record<string, unknown> = { isActive: true };
    if (filters?.decision) where['decision'] = filters.decision;
    if (filters?.from || filters?.to) {
      const range: Record<string, unknown> = {};
      if (filters.from) range['gte'] = new Date(filters.from);
      if (filters.to) range['lte'] = new Date(filters.to);
      where['decidedAt'] = range;
    }

    const decisions = await this.prisma.marketReleaseDecision.findMany({
      where,
      orderBy: { decidedAt: 'desc' },
      select: {
        decision: true,
        decidedAt: true,
        notes: true,
        blockingReason: true,
        createdAt: true,
        productBatch: {
          select: {
            code: true,
            product: { select: { name: true, code: true } },
          },
        },
        validatedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const headers = [
      'Lot fini',
      'Produit',
      'Code produit',
      'Décision',
      'Décidé le',
      'Validé par',
      'Notes',
      'Motif blocage',
      'Créé le',
    ];

    const rows = decisions.map((d) => [
      d.productBatch?.code ?? '',
      d.productBatch?.product?.name ?? '',
      d.productBatch?.product?.code ?? '',
      d.decision,
      this.fmt(d.decidedAt),
      d.validatedBy ? `${d.validatedBy.firstName} ${d.validatedBy.lastName}` : '',
      d.notes ?? '',
      d.blockingReason ?? '',
      this.fmt(d.createdAt),
    ]);

    return this.toCsv(headers, rows);
  }

  /* ------------------------------------------------------------------ */
  /*  Incidents                                                          */
  /* ------------------------------------------------------------------ */

  async exportIncidentsCsv(filters?: {
    status?: string;
    severity?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters?.status) where['status'] = filters.status;
    if (filters?.severity) where['severity'] = filters.severity;
    if (filters?.from || filters?.to) {
      const range: Record<string, unknown> = {};
      if (filters?.from) range['gte'] = new Date(filters.from);
      if (filters?.to) range['lte'] = new Date(filters.to);
      where['incidentDate'] = range;
    }

    const incidents = await this.prisma.incident.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      select: {
        code: true,
        title: true,
        status: true,
        severity: true,
        incidentDate: true,
        resolvedAt: true,
        linkedEntityType: true,
        linkedEntityId: true,
        resolution: true,
        actionsTaken: true,
        createdAt: true,
      },
    });

    const headers = [
      'Code',
      'Titre',
      'Statut',
      'Sévérité',
      'Date incident',
      'Date résolution',
      'Entité liée',
      'ID entité',
      'Résolution',
      'Actions prises',
      'Créé le',
    ];

    const rows = incidents.map((i) => [
      i.code,
      i.title,
      i.status,
      i.severity,
      this.fmt(i.incidentDate),
      this.fmt(i.resolvedAt),
      i.linkedEntityType ?? '',
      i.linkedEntityId ?? '',
      i.resolution ?? '',
      i.actionsTaken ?? '',
      this.fmt(i.createdAt),
    ]);

    return this.toCsv(headers, rows);
  }

  /* ------------------------------------------------------------------ */
  /*  Entreprises (Companies)                                             */
  /* ------------------------------------------------------------------ */

  async exportCompaniesCsv(filters?: { type?: string; isActive?: string }): Promise<string> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters?.type) where['types'] = { has: filters.type };
    if (filters?.isActive) where['isActive'] = filters.isActive === 'true';

    const companies = await this.prisma.company.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        code: true,
        name: true,
        types: true,
        isActive: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        country: true,
        vatNumber: true,
        createdAt: true,
        _count: { select: { supplyContracts: true, inboundBatches: true } },
      },
    });

    const headers = [
      'Code',
      'Nom',
      'Types',
      'Actif',
      'Email',
      'Téléphone',
      'Site web',
      'Adresse',
      'Ville',
      'Pays',
      'N° TVA',
      'Nb contrats',
      'Nb lots entrants',
      'Créée le',
    ];

    const rows = companies.map((c) => [
      c.code,
      c.name,
      (c.types ?? []).join(' | '),
      c.isActive ? 'Oui' : 'Non',
      c.email ?? '',
      c.phone ?? '',
      c.website ?? '',
      c.address ?? '',
      c.city ?? '',
      c.country ?? '',
      c.vatNumber ?? '',
      String(c._count?.supplyContracts ?? 0),
      String(c._count?.inboundBatches ?? 0),
      this.fmt(c.createdAt),
    ]);

    return this.toCsv(headers, rows);
  }

  /* ------------------------------------------------------------------ */
  /*  Produits                                                            */
  /* ------------------------------------------------------------------ */

  async exportProductsCsv(filters?: { status?: string; category?: string }): Promise<string> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters?.status) where['status'] = filters.status;
    if (filters?.category) where['category'] = filters.category;

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        code: true,
        name: true,
        commercialName: true,
        category: true,
        status: true,
        version: true,
        description: true,
        allergens: true,
        storageConditions: true,
        shelfLife: true,
        createdAt: true,
        beneficiary: { select: { code: true, name: true } },
        _count: { select: { productBatches: true, documents: true } },
      },
    });

    const headers = [
      'Code',
      'Nom',
      'Nom commercial',
      'Catégorie',
      'Statut',
      'Version',
      'Bénéficiaire',
      'Code bénéficiaire',
      'Allergènes',
      'Conditions de stockage',
      'DLC (jours)',
      'Nb lots finis',
      'Nb documents',
      'Créé le',
    ];

    const rows = products.map((p) => [
      p.code,
      p.name,
      p.commercialName ?? '',
      p.category ?? '',
      p.status ?? '',
      String(p.version ?? 1),
      p.beneficiary?.name ?? '',
      p.beneficiary?.code ?? '',
      (p.allergens ?? []).join(' | '),
      p.storageConditions ?? '',
      p.shelfLife != null ? String(p.shelfLife) : '',
      String(p._count?.productBatches ?? 0),
      String(p._count?.documents ?? 0),
      this.fmt(p.createdAt),
    ]);

    return this.toCsv(headers, rows);
  }

  /* ------------------------------------------------------------------ */
  /*  Contrats d'approvisionnement                                        */
  /* ------------------------------------------------------------------ */

  async exportSupplyContractsCsv(filters?: { status?: string }): Promise<string> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters?.status) where['status'] = filters.status;

    const contracts = await this.prisma.supplyContract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        code: true,
        status: true,
        startDate: true,
        endDate: true,
        volumeCommitted: true,
        unit: true,
        paymentTerms: true,
        notes: true,
        createdAt: true,
        supplier: { select: { code: true, name: true } },
        products: { select: { code: true, name: true } },
        _count: { select: { inboundBatches: true, documents: true } },
      },
    });

    const headers = [
      'Code',
      'Fournisseur',
      'Code fournisseur',
      'Statut',
      'Date début',
      'Date fin',
      'Volume engagé',
      'Unité',
      'Conditions de paiement',
      'Produits couverts',
      'Nb lots entrants',
      'Nb documents',
      'Notes',
      'Créé le',
    ];

    const rows = contracts.map((c) => [
      c.code,
      c.supplier?.name ?? '',
      c.supplier?.code ?? '',
      c.status ?? '',
      c.startDate ? this.fmt(c.startDate) : '',
      c.endDate ? this.fmt(c.endDate) : '',
      c.volumeCommitted != null ? String(c.volumeCommitted) : '',
      c.unit ?? '',
      c.paymentTerms ?? '',
      (c.products ?? []).map((p) => p.name).join(' | '),
      String(c._count?.inboundBatches ?? 0),
      String(c._count?.documents ?? 0),
      c.notes ?? '',
      this.fmt(c.createdAt),
    ]);

    return this.toCsv(headers, rows);
  }

  /* ------------------------------------------------------------------ */
  /*  Bénéficiaires                                                       */
  /* ------------------------------------------------------------------ */

  async exportBeneficiariesCsv(filters?: { status?: string; sector?: string }): Promise<string> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters?.status) where['status'] = filters.status;
    if (filters?.sector) where['sector'] = filters.sector;

    const beneficiaries = await this.prisma.beneficiary.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        code: true,
        name: true,
        type: true,
        status: true,
        sector: true,
        city: true,
        postalCode: true,
        email: true,
        phone: true,
        siret: true,
        legalStatus: true,
        employeeCount: true,
        certifications: true,
        createdAt: true,
        referent: { select: { firstName: true, lastName: true, email: true } },
        diagnostic: { select: { maturityLevel: true, conductedAt: true } },
        _count: { select: { actions: true, documents: true } },
      },
    });

    const headers = [
      'Code',
      'Nom',
      'Type',
      'Statut',
      'Filière',
      'Ville',
      'Code postal',
      'Email',
      'Téléphone',
      'SIRET',
      'Forme juridique',
      'Effectif',
      'Certifications',
      'Maturité',
      'Date diagnostic',
      'Référent',
      'Email référent',
      'Nb actions',
      'Nb documents',
      'Créé le',
    ];

    const rows = beneficiaries.map((b) => [
      b.code,
      b.name,
      b.type ?? '',
      b.status ?? '',
      b.sector ?? '',
      b.city ?? '',
      b.postalCode ?? '',
      b.email ?? '',
      b.phone ?? '',
      b.siret ?? '',
      b.legalStatus ?? '',
      b.employeeCount != null ? String(b.employeeCount) : '',
      (b.certifications ?? []).join(' | '),
      b.diagnostic?.maturityLevel ?? '',
      b.diagnostic?.conductedAt ? this.fmt(b.diagnostic.conductedAt) : '',
      b.referent ? `${b.referent.firstName} ${b.referent.lastName}` : '',
      b.referent?.email ?? '',
      String(b._count?.actions ?? 0),
      String(b._count?.documents ?? 0),
      this.fmt(b.createdAt),
    ]);

    return this.toCsv(headers, rows);
  }

  /* ------------------------------------------------------------------ */
  /*  Distributions                                                       */
  /* ------------------------------------------------------------------ */

  async exportDistributionsCsv(filters?: {
    status?: string;
    beneficiaryId?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters?.status) where['status'] = filters.status;
    if (filters?.beneficiaryId) where['beneficiaryId'] = filters.beneficiaryId;
    if (filters?.from || filters?.to) {
      const range: Record<string, unknown> = {};
      if (filters?.from) range['gte'] = new Date(filters.from);
      if (filters?.to) range['lte'] = new Date(filters.to);
      where['distributionDate'] = range;
    }

    const distributions = await this.prisma.distribution.findMany({
      where,
      orderBy: { distributionDate: 'desc' },
      select: {
        code: true,
        status: true,
        distributionDate: true,
        notes: true,
        createdAt: true,
        beneficiary: { select: { code: true, name: true } },
        lines: {
          select: {
            quantity: true,
            unit: true,
            productBatch: { select: { code: true, product: { select: { name: true } } } },
          },
        },
      },
    });

    const headers = [
      'Code distribution',
      'Bénéficiaire',
      'Code bénéficiaire',
      'Statut',
      'Date distribution',
      'Nb lignes',
      'Lots distribués',
      'Notes',
      'Créé le',
    ];

    const rows = distributions.map((d) => [
      d.code,
      d.beneficiary?.name ?? '',
      d.beneficiary?.code ?? '',
      d.status,
      this.fmt(d.distributionDate),
      String(d.lines.length),
      d.lines.map((l) => `${l.productBatch?.code ?? ''} (${l.quantity} ${l.unit})`).join(' | '),
      d.notes ?? '',
      this.fmt(d.createdAt),
    ]);

    return this.toCsv(headers, rows);
  }

  /* ------------------------------------------------------------------ */
  /*  Transformation operations                                           */
  /* ------------------------------------------------------------------ */

  async exportTransformationOperationsCsv(filters: { from?: string; to?: string } = {}) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range.gte = new Date(filters.from);
      if (filters.to) range.lte = new Date(filters.to);
      where.operationDate = range;
    }

    const ops = await this.prisma.transformationOperation.findMany({
      where,
      orderBy: { operationDate: 'desc' },
      select: {
        code: true,
        name: true,
        operationDate: true,
        site: true,
        yieldRate: true,
        description: true,
        operatorNotes: true,
        createdAt: true,
        inboundBatch: {
          select: {
            code: true,
            product: { select: { name: true, code: true } },
            supplier: { select: { name: true, code: true } },
          },
        },
        productBatches: { select: { code: true, quantity: true, unit: true } },
      },
    });

    const headers = [
      'Code opération',
      'Nom',
      'Date opération',
      'Site',
      'Taux de rendement (%)',
      'Lot entrant',
      'Produit',
      'Code produit',
      'Fournisseur',
      'Lots finis produits',
      'Quantité totale produite',
      'Description',
      'Notes opérateur',
      'Créé le',
    ];

    const rows = ops.map((op) => {
      const totalProduced = op.productBatches.reduce(
        (s: number, b) => s + Number(b.quantity ?? 0),
        0,
      );
      const batchCodes = op.productBatches.map((b) => b.code).join(' | ');
      return [
        op.code,
        op.name,
        this.fmt(op.operationDate),
        op.site ?? '',
        op.yieldRate != null ? String(op.yieldRate) : '',
        op.inboundBatch?.code ?? '',
        op.inboundBatch?.product?.name ?? '',
        op.inboundBatch?.product?.code ?? '',
        op.inboundBatch?.supplier?.name ?? '',
        batchCodes,
        String(totalProduced),
        op.description ?? '',
        op.operatorNotes ?? '',
        this.fmt(op.createdAt),
      ];
    });

    return this.toCsv(headers, rows);
  }

  /* ------------------------------------------------------------------ */
  /*  Label validations                                                   */
  /* ------------------------------------------------------------------ */

  async exportLabelValidationsCsv(filters: { isValid?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (filters.isValid !== undefined && filters.isValid !== '') {
      where.isValid = filters.isValid === 'true';
    }

    const validations = await this.prisma.labelValidation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        isValid: true,
        notes: true,
        reservations: true,
        validatedAt: true,
        createdAt: true,
        productBatch: {
          select: {
            code: true,
            status: true,
            quantity: true,
            unit: true,
            product: { select: { name: true, code: true } },
          },
        },
        validatedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const headers = [
      'Résultat',
      'Lot fini',
      'Produit',
      'Code produit',
      'Statut lot',
      'Quantité lot',
      'Unité lot',
      'Validé par',
      'Email validateur',
      'Date validation',
      'Réserves',
      'Notes',
      'Créé le',
    ];

    const rows = validations.map((v) => [
      v.isValid ? 'Conforme' : 'Non conforme',
      v.productBatch?.code ?? '',
      v.productBatch?.product?.name ?? '',
      v.productBatch?.product?.code ?? '',
      v.productBatch?.status ?? '',
      v.productBatch?.quantity != null ? String(v.productBatch.quantity) : '',
      v.productBatch?.unit ?? '',
      v.validatedBy ? `${v.validatedBy.firstName} ${v.validatedBy.lastName}` : '',
      v.validatedBy?.email ?? '',
      this.fmt(v.validatedAt ?? v.createdAt),
      (v.reservations ?? []).join(' | '),
      v.notes ?? '',
      this.fmt(v.createdAt),
    ]);

    return this.toCsv(headers, rows);
  }
}
