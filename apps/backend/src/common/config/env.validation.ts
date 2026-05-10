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

  // ── NOTIF EMAIL (MP-NOTIF-1 + MP-NOTIF-2) ──────────
  @IsIn(['mock', 'smtp-stream', 'resend'])
  @IsOptional()
  NOTIF_EMAIL_TRANSPORT: string = 'mock';

  @IsString()
  @IsOptional()
  NOTIF_EMAIL_FROM: string = 'noreply@iox.mch';

  @IsString()
  @IsOptional()
  NOTIF_EMAIL_REPLY_TO?: string;

  // MP-NOTIF-2 — clé API Resend (obligatoire si NOTIF_EMAIL_TRANSPORT=resend ;
  // la factory throw au boot si manquante).
  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  // MP-NOTIF-2 — secret JWT pour signer les tokens unsubscribe (LOT 2).
  // Default fallback : `${JWT_SECRET}-unsub` si non fourni (cf. service).
  @IsString()
  @IsOptional()
  UNSUBSCRIBE_JWT_SECRET?: string;

  // ── OBSERVABILITÉ (optionnel) ──────────────────────
  // Si défini, /api/v1/metrics exige `Authorization: Bearer <METRICS_TOKEN>`.
  // Sinon l'endpoint est public (scrape Prometheus stateless en réseau privé).
  @IsString()
  @IsOptional()
  METRICS_TOKEN?: string;

  // ── PAY-1 phase 1 — STRIPE CONNECT EXPRESS ───────────────────────────────
  // Optionnelles : si absentes, les endpoints paiement throwent au call time.
  // En production, un WARNING est émis au boot si manquantes ou en mode test.
  @IsString()
  @IsOptional()
  STRIPE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  STRIPE_PUBLISHABLE_KEY?: string;

  // ── MEILISEARCH (optionnel — fallback Postgres si absent) ───────────────
  @IsString()
  @IsOptional()
  MEILISEARCH_HOST?: string;

  @IsString()
  @IsOptional()
  MEILISEARCH_API_KEY?: string;
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

/**
 * Avertissements non bloquants pour les variables optionnelles critiques.
 * Utilise console.warn (visible dans les logs PM2/Docker) sans jamais logger
 * les valeurs des secrets.
 */
function warnMissingOptional(env: EnvSchema, raw: Record<string, unknown>): void {
  if (env.APP_ENV === NodeEnv.development || env.APP_ENV === NodeEnv.test) return;

  const isProd = env.APP_ENV === NodeEnv.production;

  // Stripe : payments non fonctionnels si absent en production
  if (!env.STRIPE_SECRET_KEY) {
    console.warn(
      `⚠️  [IOX] STRIPE_SECRET_KEY absent — paiements désactivés (${env.APP_ENV}). ` +
        `Configurer avant ouverture.`,
    );
  } else if (isProd && env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    console.warn(
      `⚠️  [IOX] STRIPE_SECRET_KEY est une clé TEST en production. ` +
        `Remplacer par sk_live_ avant les premières transactions réelles.`,
    );
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.warn(
      `⚠️  [IOX] STRIPE_WEBHOOK_SECRET absent — webhooks Stripe non vérifiés (${env.APP_ENV}).`,
    );
  }

  // APP_URL : liens emails RFQ pointent vers fallback si absent
  if (!raw['APP_URL'] && isProd) {
    console.warn(
      `⚠️  [IOX] APP_URL absent — les liens dans les emails RFQ utiliseront le fallback 'https://iox.example'.`,
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
  warnMissingOptional(instance, raw);
  return instance;
}
