import 'reflect-metadata';
import { validateEnv } from './env.validation';

/**
 * Base env valide pour les tests — développement local.
 * On surcharge les champs nécessaires dans chaque test.
 */
const BASE_DEV: Record<string, unknown> = {
  APP_ENV: 'development',
  DATABASE_URL: 'postgresql://iox:iox@localhost:5434/iox_dev',
  JWT_SECRET: 'dev-only-jwt-secret-remplace-moi-avec-openssl-rand-hex-48',
  JWT_REFRESH_SECRET: 'dev-only-refresh-secret-different-du-jwt-et-32-chars-min',
  MINIO_ACCESS_KEY: 'minioadmin',
  MINIO_SECRET_KEY: 'minioadmin',
};

const BASE_PROD: Record<string, unknown> = {
  APP_ENV: 'production',
  DATABASE_URL: 'postgresql://iox:strongpw@db:5432/iox_prod',
  JWT_SECRET: 'prod-jwt-secret-aaaabbbbccccddddeeeeffffgggghhhh',
  JWT_REFRESH_SECRET: 'prod-refresh-secret-iiiijjjjkkkkllllmmmmnnnnoooopppp',
  MINIO_ACCESS_KEY: 'iox-prod-access-key',
  MINIO_SECRET_KEY: 'iox-prod-secret-key-longue',
};

describe('validateEnv', () => {
  describe('développement — validation basique', () => {
    it('accepte un env dev valide', () => {
      expect(() => validateEnv(BASE_DEV)).not.toThrow();
    });

    it('rejette DATABASE_URL manquant', () => {
      const raw = { ...BASE_DEV };
      delete raw['DATABASE_URL'];
      expect(() => validateEnv(raw)).toThrow();
    });

    it('rejette JWT_SECRET trop court', () => {
      expect(() => validateEnv({ ...BASE_DEV, JWT_SECRET: 'court' })).toThrow();
    });
  });

  describe('assertNoPlaceholder — secrets de démo en prod', () => {
    it('rejette minioadmin en production', () => {
      expect(() =>
        validateEnv({
          ...BASE_PROD,
          MINIO_ACCESS_KEY: 'minioadmin',
          MINIO_SECRET_KEY: 'minioadmin',
        }),
      ).toThrow(/minioadmin|Secrets de démo/i);
    });

    it('rejette JWT_SECRET === JWT_REFRESH_SECRET en production', () => {
      const secret = 'prod-jwt-secret-aaaabbbbccccddddeeeeffffgggghhhh';
      expect(() =>
        validateEnv({ ...BASE_PROD, JWT_SECRET: secret, JWT_REFRESH_SECRET: secret }),
      ).toThrow(/identiques/i);
    });

    it('accepte un env prod valide sans Stripe', () => {
      // Stripe est optionnel — warning, pas d'erreur
      expect(() => validateEnv(BASE_PROD)).not.toThrow();
    });
  });

  describe('warnMissingOptional — warnings Stripe en staging/prod', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('émet warning STRIPE_SECRET_KEY absent en production', () => {
      validateEnv({ ...BASE_PROD });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('STRIPE_SECRET_KEY absent'),
      );
    });

    it('émet warning STRIPE_WEBHOOK_SECRET absent en production', () => {
      validateEnv({ ...BASE_PROD, STRIPE_SECRET_KEY: 'sk_live_xxxx' });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('STRIPE_WEBHOOK_SECRET absent'),
      );
    });

    it('émet warning si clé TEST utilisée en production', () => {
      validateEnv({
        ...BASE_PROD,
        STRIPE_SECRET_KEY: 'sk_test_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc123',
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('clé TEST en production'),
      );
    });

    it('no warning clé test en staging (pas production)', () => {
      validateEnv({
        ...BASE_PROD,
        APP_ENV: 'staging',
        STRIPE_SECRET_KEY: 'sk_test_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc123',
      });
      // sk_test_ warning ne s'applique qu'à APP_ENV=production
      const testKeyWarning = warnSpy.mock.calls.find((c: string[]) =>
        c[0]?.includes('clé TEST en production'),
      );
      expect(testKeyWarning).toBeUndefined();
    });

    it('émet warning APP_URL absent en production', () => {
      validateEnv({ ...BASE_PROD });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('APP_URL absent'),
      );
    });

    it('no warning en développement (warnings ignorés)', () => {
      validateEnv(BASE_DEV);
      // aucun warning Stripe en dev
      const stripeWarning = warnSpy.mock.calls.find((c: string[]) =>
        c[0]?.includes('[IOX]'),
      );
      expect(stripeWarning).toBeUndefined();
    });

    it('no warning si Stripe live configuré en production', () => {
      validateEnv({
        ...BASE_PROD,
        STRIPE_SECRET_KEY: 'sk_live_xxxx',
        STRIPE_WEBHOOK_SECRET: 'whsec_xxxx',
        APP_URL: 'https://iox.example',
      });
      const stripeAbsentWarning = warnSpy.mock.calls.find((c: string[]) =>
        c[0]?.includes('absent'),
      );
      expect(stripeAbsentWarning).toBeUndefined();
    });
  });
});
