import { Test, TestingModule } from '@nestjs/testing';
import { CodeGeneratorService } from './code-generator.service';
import { PrismaService } from '../../database/prisma.service';

describe('CodeGeneratorService', () => {
  let service: CodeGeneratorService;
  let prisma: { $queryRawUnsafe: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRawUnsafe: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CodeGeneratorService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CodeGeneratorService);
  });

  describe('generate (sans année)', () => {
    it('génère BEN-0001 quand la table est vide', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ max_num: null }]);
      const code = await service.generate('beneficiary');
      expect(code).toBe('BEN-0001');
    });

    it('incrémente à partir du max existant', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ max_num: 7 }]);
      const code = await service.generate('beneficiary');
      expect(code).toBe('BEN-0008');
    });

    it('pad sur 4 chiffres même à 100+', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ max_num: 99 }]);
      const code = await service.generate('product');
      expect(code).toBe('PRD-0100');
    });

    it('utilise la bonne table pour chaque modèle', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ max_num: 0 }]);
      await service.generate('company');
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('FROM "companies"'),
      );
    });
  });

  describe('generate (avec année infixée)', () => {
    it("inclut l'année dans le préfixe pour inboundBatch", async () => {
      const year = new Date().getFullYear();
      prisma.$queryRawUnsafe.mockResolvedValue([{ max_num: 0 }]);
      const code = await service.generate('inboundBatch');
      expect(code).toBe(`IB-${year}-0001`);
    });

    it('incrémente dans la même année pour productBatch', async () => {
      const year = new Date().getFullYear();
      prisma.$queryRawUnsafe.mockResolvedValue([{ max_num: 42 }]);
      const code = await service.generate('productBatch');
      expect(code).toBe(`PB-${year}-0043`);
    });

    it('filtre par année dans la requête SQL', async () => {
      const year = new Date().getFullYear();
      prisma.$queryRawUnsafe.mockResolvedValue([{ max_num: 0 }]);
      await service.generate('distribution');
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(`DIST-${year}-%`),
      );
    });
  });

  describe('préfixes tous définis', () => {
    const models = [
      ['beneficiary', 'BEN'],
      ['product', 'PRD'],
      ['company', 'ENT'],
      ['supplyContract', 'SC'],
      ['inboundBatch', 'IB'],
      ['transformationOperation', 'TO'],
      ['productBatch', 'PB'],
      ['incident', 'INC'],
      ['distribution', 'DIST'],
    ] as const;

    it.each(models)('%s → préfixe %s', async (model, prefix) => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ max_num: 0 }]);
      const code = await service.generate(model);
      expect(code.startsWith(prefix + '-')).toBe(true);
    });
  });
});
