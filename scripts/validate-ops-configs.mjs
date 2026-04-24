#!/usr/bin/env node
/**
 * validate-ops-configs.mjs — vérifie que tous les fichiers de `ops/` sont
 * structurellement valides (parseable YAML/JSON). Ne valide pas la sémantique
 * (ex. règles Prometheus correctes), mais attrape les corruptions
 * d'indentation / virgules manquantes avant qu'elles n'atteignent Prometheus
 * ou Grafana.
 *
 * Usage :
 *   node scripts/validate-ops-configs.mjs
 *
 * Exit code :
 *   0 — tout OK
 *   1 — au moins un fichier invalide
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);

// js-yaml est une dépendance transitive ; on résout via require tree.
let yaml;
try {
  yaml = require('js-yaml');
} catch {
  // Fallback : scanner node_modules/.pnpm pour la version pinned.
  const hit = execSync(
    "find node_modules/.pnpm -maxdepth 3 -type d -name 'js-yaml@*' | head -n 1",
    { encoding: 'utf8' },
  ).trim();
  if (!hit) {
    console.error('❌ js-yaml introuvable. Lancer `pnpm install` à la racine.');
    process.exit(1);
  }
  yaml = require(join(process.cwd(), hit, 'node_modules/js-yaml'));
}

const ROOT = 'ops';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(ROOT).filter((f) =>
  ['.yml', '.yaml', '.json'].includes(extname(f)),
);

let failed = 0;
for (const f of files) {
  const rel = relative('.', f);
  const raw = readFileSync(f, 'utf8');
  try {
    if (extname(f) === '.json') {
      JSON.parse(raw);
    } else {
      yaml.loadAll(raw); // supporte les docs multi-YAML
    }
    console.log(`  ✓ ${rel}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${rel} — ${err.message}`);
  }
}

console.log(`\n${files.length - failed}/${files.length} fichiers valides.`);

// ── Bonus : valider la syntaxe des scripts bash deploy/vps/*.sh ──────
// `bash -n` est rapide (pas d'exécution) et attrape les erreurs de
// syntaxe introduites par une édition maladroite.
const DEPLOY_VPS = 'deploy/vps';
let bashFailed = 0;
try {
  const shFiles = readdirSync(DEPLOY_VPS).filter((f) => f.endsWith('.sh'));
  if (shFiles.length > 0) {
    console.log('\nScripts shell (deploy/vps) :');
    for (const f of shFiles) {
      const rel = join(DEPLOY_VPS, f);
      try {
        execSync(`bash -n ${rel}`, { stdio: 'pipe' });
        console.log(`  ✓ ${rel}`);
      } catch (err) {
        bashFailed += 1;
        const stderr = err.stderr?.toString() ?? err.message;
        console.error(`  ✗ ${rel} — ${stderr.trim()}`);
      }
    }
  }
} catch {
  // Répertoire absent — pas d'erreur, juste rien à valider.
}

process.exit(failed === 0 && bashFailed === 0 ? 0 : 1);
