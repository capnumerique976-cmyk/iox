import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

type CodeModel =
  | 'beneficiary'
  | 'product'
  | 'company'
  | 'supplyContract'
  | 'inboundBatch'
  | 'transformationOperation'
  | 'productBatch'
  | 'incident'
  | 'distribution';

const CODE_CONFIG: Record<CodeModel, { prefix: string; width: number; yearInfix?: boolean }> = {
  beneficiary: { prefix: 'BEN', width: 4 },
  product: { prefix: 'PRD', width: 4 },
  company: { prefix: 'ENT', width: 4 },
  supplyContract: { prefix: 'SC', width: 4 },
  inboundBatch: { prefix: 'IB', width: 4, yearInfix: true },
  transformationOperation: { prefix: 'TO', width: 4, yearInfix: true },
  productBatch: { prefix: 'PB', width: 4, yearInfix: true },
  incident: { prefix: 'INC', width: 4 },
  distribution: { prefix: 'DIST', width: 4, yearInfix: true },
};

@Injectable()
export class CodeGeneratorService {
  constructor(private prisma: PrismaService) {}

  async generate(model: CodeModel): Promise<string> {
    const config = CODE_CONFIG[model];
    const year = new Date().getFullYear();
    const prefix = config.yearInfix ? `${config.prefix}-${year}` : config.prefix;

    // Requête atomique : trouve le max existant et incrémente
    const result = await this.prisma.$queryRawUnsafe<Array<{ max_num: number | null }>>(
      `SELECT MAX(CAST(SPLIT_PART(code, '-', ${config.yearInfix ? 3 : 2}) AS INTEGER)) as max_num
       FROM "${this.tableName(model)}"
       WHERE code LIKE '${prefix}-%'`,
    );

    const maxNum = result[0]?.max_num ?? 0;
    const next = (maxNum ?? 0) + 1;
    const padded = String(next).padStart(config.width, '0');

    return `${prefix}-${padded}`;
  }

  private tableName(model: CodeModel): string {
    const map: Record<CodeModel, string> = {
      beneficiary: 'beneficiaries',
      product: 'products',
      company: 'companies',
      supplyContract: 'supply_contracts',
      inboundBatch: 'inbound_batches',
      transformationOperation: 'transformation_operations',
      productBatch: 'product_batches',
      incident: 'incidents',
      distribution: 'distributions',
    };
    return map[model];
  }
}
