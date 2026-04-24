#!/usr/bin/env node
/**
 * IOX — Preflight checks avant déploiement préprod/prod.
 *
 * Vérifie sans dépendance externe :
 *   - variables d'environnement critiques présentes
 *   - secrets non triviaux, JWT différents, longueur suffisante
 *   - APP_ENV cohérent avec FRONTEND_URL
 *   - migrations Prisma présentes (si non-dev)
 *
 * Sortie : 0 si OK, 1 sinon. Imprime une checklist lisible.
 *
 * Usage :
 *   APP_ENV=staging JWT_SECRET=... JWT_REFRESH_SECRET=... \
 *   MINIO_SECRET_KEY=... DATABASE_URL=... node scripts/preflight.mjs
 */

import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const FORBIDDEN = new Set([
  'change-me-in-production-use-a-long-random-string',
  'change-me-refresh-secret',
  'change-me',
  'secret',
  'password',
  'minioadmin',
  'dev-only-jwt-secret-remplace-moi-avec-openssl-rand-hex-48',
  'dev-only-refresh-secret-different-du-jwt-et-32-chars-min',
]);

const results = [];
const env = process.env;
const APP_ENV = env.APP_ENV || 'development';
const isRealEnv = APP_ENV === 'staging' || APP_ENV === 'production';

function ok(name, detail = '') {
  results.push({ ok: true, name, detail });
}
function fail(name, detail) {
  results.push({ ok: false, name, detail });
}

// ── Variables obligatoires ────────────────────────────────
const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
];
for (const key of required) {
  if (!env[key]) fail(key, 'variable manquante');
  else ok(key, 'défini');
}

// ── JWT : longueur ≥ 32 ───────────────────────────────────
for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
  const v = env[key];
  if (v && v.length < 32) fail(`${key} length`, `${v.length} car (< 32)`);
  else if (v) ok(`${key} length`, `${v.length} car`);
}

// ── JWT : valeurs distinctes ─────────────────────────────
if (env.JWT_SECRET && env.JWT_REFRESH_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
  fail('JWT_SECRET vs JWT_REFRESH_SECRET', 'identiques — interdit');
} else if (env.JWT_SECRET && env.JWT_REFRESH_SECRET) {
  ok('JWT_SECRET vs JWT_REFRESH_SECRET', 'distincts');
}

// ── Secrets non-triviaux en préprod/prod ─────────────────
if (isRealEnv) {
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY']) {
    const v = env[key];
    if (v && FORBIDDEN.has(v)) fail(`${key} placeholder`, `valeur de démo détectée en ${APP_ENV}`);
    else if (v) ok(`${key} placeholder`, 'non-démo');
  }
}

// ── MINIO_SECRET_KEY length ≥ 8 ──────────────────────────
if (env.MINIO_SECRET_KEY && env.MINIO_SECRET_KEY.length < 8) {
  fail('MINIO_SECRET_KEY length', `${env.MINIO_SECRET_KEY.length} car (< 8)`);
} else if (env.MINIO_SECRET_KEY) {
  ok('MINIO_SECRET_KEY length', `${env.MINIO_SECRET_KEY.length} car`);
}

// ── FRONTEND_URL cohérent en préprod/prod ────────────────
if (isRealEnv) {
  const fu = env.FRONTEND_URL || '';
  if (!fu.startsWith('https://')) {
    fail('FRONTEND_URL', 'doit être en https:// en préprod/prod');
  } else {
    ok('FRONTEND_URL', fu);
  }
}

// ── Migrations Prisma présentes ──────────────────────────
const migrationsDir = join(ROOT, 'prisma', 'migrations');
if (existsSync(migrationsDir)) {
  const entries = readdirSync(migrationsDir).filter(
    (e) => !e.startsWith('.') && e !== 'migration_lock.toml',
  );
  if (entries.length === 0) {
    if (isRealEnv) fail('prisma migrations', 'aucune migration — boot préprod/prod refusé');
    else ok('prisma migrations', 'aucune migration (dev-only OK)');
  } else {
    ok('prisma migrations', `${entries.length} migration(s) trouvée(s)`);
  }
} else {
  if (isRealEnv) fail('prisma/migrations', 'dossier absent');
  else ok('prisma/migrations', 'absent (dev-only)');
}

// ── DATABASE_URL : schéma postgres:// ────────────────────
if (env.DATABASE_URL && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) {
  fail('DATABASE_URL scheme', 'doit commencer par postgres:// ou postgresql://');
} else if (env.DATABASE_URL) {
  ok('DATABASE_URL scheme', 'postgres://…');
}

// ── DATABASE_URL : pas de localhost en préprod/prod ──────
if (isRealEnv && env.DATABASE_URL && /@(localhost|127\.0\.0\.1)\b/.test(env.DATABASE_URL)) {
  fail('DATABASE_URL host', 'localhost/127.0.0.1 interdit en préprod/prod');
}

// ── DATABASE_URL : sslmode recommandé en préprod/prod ────
if (isRealEnv && env.DATABASE_URL && !/[?&]sslmode=/.test(env.DATABASE_URL)) {
  fail('DATABASE_URL sslmode', 'sslmode=require recommandé (ou verify-full)');
}

// ── METRICS_TOKEN : si défini, doit être non-trivial ─────
if (env.METRICS_TOKEN !== undefined) {
  if (env.METRICS_TOKEN.length < 16) {
    fail('METRICS_TOKEN length', `${env.METRICS_TOKEN.length} car (< 16)`);
  } else if (FORBIDDEN.has(env.METRICS_TOKEN)) {
    fail('METRICS_TOKEN placeholder', 'valeur de démo détectée');
  } else {
    ok('METRICS_TOKEN', `${env.METRICS_TOKEN.length} car`);
  }
}

// ── FRONTEND_URL : pas de trailing slash (casse la CORS) ─
if (env.FRONTEND_URL && env.FRONTEND_URL.endsWith('/')) {
  fail('FRONTEND_URL trailing slash', 'retirer le / final (casse le match CORS)');
}

// ── NODE_ENV cohérent en préprod/prod ────────────────────
if (isRealEnv && env.NODE_ENV && env.NODE_ENV !== 'production') {
  fail('NODE_ENV', `=${env.NODE_ENV} (attendu: production)`);
} else if (isRealEnv) {
  ok('NODE_ENV', 'production (ou non défini → défaut Node)');
}

// ── Output ───────────────────────────────────────────────
let failed = 0;
console.log(`\n🛫  IOX preflight — APP_ENV=${APP_ENV}\n`);
for (const r of results) {
  const icon = r.ok ? '✔' : '✗';
  const line = `  ${icon} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`;
  console.log(r.ok ? line : `\x1b[31m${line}\x1b[0m`);
  if (!r.ok) failed++;
}
console.log('');
if (failed > 0) {
  console.log(`\x1b[31m❌ ${failed} check(s) en échec — déploiement non recommandé.\x1b[0m\n`);
  process.exit(1);
}
console.log(`\x1b[32m✔ Preflight OK (${results.length} checks)\x1b[0m\n`);
process.exit(0);
