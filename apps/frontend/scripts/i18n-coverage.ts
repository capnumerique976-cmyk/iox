// I18N-1 phase 1 — script de coverage clés traduction.
//
// Compare les fichiers de traduction en cherchant les clés manquantes
// par rapport à `fr.json` (référence). Émet un warning par clé manquante
// sur stderr, et un résumé final sur stdout.
//
// Usage :
//   pnpm i18n:check
//   pnpm i18n:check --strict   (fail si clés manquantes — phase 2+)

/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(__dirname, '..', 'messages');

const REFERENCE_LOCALE = 'fr';
const TARGET_LOCALES = ['en'];

interface FlatMessages {
  [key: string]: string;
}

function flatten(obj: any, prefix = ''): FlatMessages {
  const out: FlatMessages = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else if (typeof v === 'string') {
      out[key] = v;
    }
  }
  return out;
}

function loadLocale(locale: string): FlatMessages {
  const path = resolve(messagesDir, `${locale}.json`);
  if (!existsSync(path)) {
    console.error(`✗ messages/${locale}.json introuvable`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  return flatten(raw);
}

function main() {
  const strict = process.argv.includes('--strict');
  const reference = loadLocale(REFERENCE_LOCALE);
  const referenceKeys = Object.keys(reference);

  let totalMissing = 0;
  for (const locale of TARGET_LOCALES) {
    const target = loadLocale(locale);
    const missing = referenceKeys.filter((k) => !(k in target));
    const extra = Object.keys(target).filter((k) => !(k in reference));

    console.log(`\n=== ${locale}.json ===`);
    console.log(`  reference: ${referenceKeys.length} clés`);
    console.log(`  target:    ${Object.keys(target).length} clés`);
    console.log(`  missing:   ${missing.length}`);
    console.log(`  extra:     ${extra.length}`);

    if (missing.length > 0) {
      console.error(`\n  ⚠ clés manquantes (présentes en ${REFERENCE_LOCALE}, absentes en ${locale}) :`);
      for (const k of missing) console.error(`    - ${k}`);
    }
    if (extra.length > 0) {
      console.warn(`\n  ⚠ clés en trop (présentes en ${locale}, absentes en ${REFERENCE_LOCALE}) :`);
      for (const k of extra) console.warn(`    - ${k}`);
    }

    totalMissing += missing.length;
  }

  console.log(`\nTotal missing: ${totalMissing}`);
  if (strict && totalMissing > 0) {
    console.error('✗ strict mode: fail');
    process.exit(1);
  }
  console.log('✓ done');
}

main();
