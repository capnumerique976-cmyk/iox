import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateSellerProfileDto,
  UpdateSellerProfileDto,
  UpdateMySellerProfileDto,
} from './seller-profile.dto';

describe('SellerProfile DTOs — ArrayMaxSize guards', () => {
  describe('CreateSellerProfileDto', () => {
    const base = {
      companyId: '00000000-0000-0000-0000-000000000001',
      publicDisplayName: 'Test Seller',
      slug: 'test-seller',
      country: 'FR',
    };

    it('rejects languages array > 20 items', async () => {
      const dto = plainToInstance(CreateSellerProfileDto, {
        ...base,
        languages: Array(21).fill('fr'),
      });
      const errors = await validate(dto);
      const langError = errors.find((e) => e.property === 'languages');
      expect(langError).toBeDefined();
      expect(langError!.constraints).toHaveProperty('arrayMaxSize');
    });

    it('rejects supportedIncoterms array > 15 items', async () => {
      const dto = plainToInstance(CreateSellerProfileDto, {
        ...base,
        supportedIncoterms: Array(16).fill('FOB'),
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'supportedIncoterms');
      expect(err).toBeDefined();
      expect(err!.constraints).toHaveProperty('arrayMaxSize');
    });

    it('rejects destinationsServed array > 50 items', async () => {
      const dto = plainToInstance(CreateSellerProfileDto, {
        ...base,
        destinationsServed: Array(51).fill('FR'),
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'destinationsServed');
      expect(err).toBeDefined();
      expect(err!.constraints).toHaveProperty('arrayMaxSize');
    });

    it('accepts arrays within limits', async () => {
      const dto = plainToInstance(CreateSellerProfileDto, {
        ...base,
        languages: ['fr', 'en'],
        supportedIncoterms: ['FOB', 'CIF'],
        destinationsServed: ['FR', 'RE', 'YT'],
      });
      const errors = await validate(dto);
      // Filter only array-related errors
      const arrayErrors = errors.filter((e) =>
        ['languages', 'supportedIncoterms', 'destinationsServed'].includes(e.property),
      );
      expect(arrayErrors.length).toBe(0);
    });
  });

  describe('UpdateSellerProfileDto', () => {
    it('rejects languages array > 20 items', async () => {
      const dto = plainToInstance(UpdateSellerProfileDto, {
        languages: Array(21).fill('en'),
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'languages');
      expect(err).toBeDefined();
    });

    it('rejects supportedIncoterms > 15', async () => {
      const dto = plainToInstance(UpdateSellerProfileDto, {
        supportedIncoterms: Array(16).fill('EXW'),
      });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'supportedIncoterms')).toBeDefined();
    });
  });

  describe('UpdateMySellerProfileDto', () => {
    it('rejects languages array > 20 items', async () => {
      const dto = plainToInstance(UpdateMySellerProfileDto, {
        languages: Array(21).fill('fr'),
      });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'languages')).toBeDefined();
    });

    it('rejects supportedIncoterms > 15', async () => {
      const dto = plainToInstance(UpdateMySellerProfileDto, {
        supportedIncoterms: Array(16).fill('FOB'),
      });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'supportedIncoterms')).toBeDefined();
    });

    it('rejects destinationsServed > 50', async () => {
      const dto = plainToInstance(UpdateMySellerProfileDto, {
        destinationsServed: Array(51).fill('FR'),
      });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'destinationsServed')).toBeDefined();
    });

    it('accepts valid payload within limits', async () => {
      const dto = plainToInstance(UpdateMySellerProfileDto, {
        languages: ['fr', 'en', 'mg'],
        supportedIncoterms: ['FOB', 'CIF', 'EXW'],
        destinationsServed: ['FR', 'DE'],
        publicDisplayName: 'Ma Coop',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
