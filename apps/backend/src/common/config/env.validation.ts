import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsIn,
  MinLength,
  IsInt,
  Min,
  Max,
  IsEmail,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  development = 'development',
  test = 'test',
  staging = 'staging',
  production = 'production',
}

/**
 * Secrets à bannir en préprod/prod — valeurs par défaut du dépôt, jamais
 * à ré-utiliser en environnement non-local.
 */
const FORBIDDEN_SECRETS = new Set<string>([
  'change-me-in-production-use-a-long-random-string',
  'change-me-refresh-secret',
  'change-me',
  'secret',
  'password',
  'minioadmin', // cred MinIO dev par défaut
]);

class EnvSchema {
  // ── APP ─────────────────────────────────────────────
  @IsEnum(NodeEnv)
  @IsOptional()
  APP_ENV: NodeEnv = NodeEnv.development;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  APP_PORT: number = 3001;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000';

  // ── DATABASE ────────────────────────────────────────
  @IsString()
  @MinLength(10, { message: 'DATABASE_URL requis (ex: postgresql://…)' })
  DATABASE_URL!: string;

  // ── REDIS (optionnel) ───────────────────────────────
  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  // ── JWT ─────────────────────────────────────────────
  @IsString()
  @MinLength(32, {
    message: 'JWT_SECRET doit faire au moins 32 caractères en préprod/prod',
  })
  JWT_SECRET!: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET doit faire au moins 32 caractères en préprod/prod',
  })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  // ── MINIO ──────────────────────────────────────────
  @IsString()
  @IsOptional()
  MINIO_ENDPOINT: string = 'localhost';

  @IsInt()
  @IsOptional()
  MINIO_PORT: number = 9000;

  @IsString()
  @MinLength(3)
  MINIO_ACCESS_KEY!: string;

  @IsString()
  @MinLength(8, { message: 'MINIO_SECRET_KEY doit faire au moins 8 caractères' })
  MINIO_SECRET_KEY!: string;

  @IsString()
  @IsOptional()
  MINIO_BUCKET: string = 'iox-documents';

  @IsIn(['true', 'false'])
  @IsOptional()
  MINIO_USE_SSL: string = 'false';

  // ── MAIL (optionnel) ────────────────────────────────
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsOptional()
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsEmail()
  @IsOptional()
  MAIL_FROM?: string;

  // ── OBSERVABILITÉ (optionnel) ──────────────────────
  // Si défini, /api/v1/metrics exige `Authorization: Bearer <METRICS_TOKEN>`.
  // Sinon l'endpoint est public (scrape Prometheus stateless en réseau privé).
  @IsString()
  @IsOptional()
  METRICS_TOKEN?: string;
}

function assertNoPlaceholder(env: EnvSchema) {
  if (env.APP_ENV === NodeEnv.development || env.APP_ENV === NodeEnv.test) return;

  const checks: Array<[keyof EnvSchema, string | undefined]> = [
    ['JWT_SECRET', env.JWT_SECRET],
    ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
    ['MINIO_ACCESS_KEY', env.MINIO_ACCESS_KEY],
    ['MINIO_SECRET_KEY', env.MINIO_SECRET_KEY],
  ];
  const leaks = checks.filter(([, v]) => v && FORBIDDEN_SECRETS.has(v));
  if (leaks.length) {
    throw new Error(
      `🔒 Secrets de démo détectés en ${env.APP_ENV} : ${leaks.map(([k]) => k).join(', ')}. ` +
        `Remplace-les par des valeurs uniques et aléatoires.`,
    );
  }

  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error(
      `🔒 JWT_SECRET et JWT_REFRESH_SECRET ne doivent pas être identiques en ${env.APP_ENV}.`,
    );
  }
}

export function validateEnv(raw: Record<string, unknown>): EnvSchema {
  const instance = plainToInstance(EnvSchema, raw, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(instance, {
    skipMissingProperties: false,
    whitelist: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const summary = errors
      .map((e) => {
        const constraints = Object.values(e.constraints ?? {}).join(', ');
        return `  • ${e.property}: ${constraints}`;
      })
      .join('\n');
    throw new Error(
      `\n❌ Configuration d'environnement invalide :\n${summary}\n\n` +
        `Copiez apps/backend/.env.example → apps/backend/.env et renseignez les valeurs.`,
    );
  }

  assertNoPlaceholder(instance);
  return instance;
}
