/**
 * Backfill des `UserCompanyMembership` à partir d'un CSV explicite.
 *
 * Stratégie (cf. AUDIT FINDING V2 ownership) : aucun matching automatique n'est
 * possible (pas de FK user.companyId, pas de mapping email↔domain fiable). Tous
 * les rattachements doivent donc être validés manuellement et fournis en CSV.
 *
 * Usage :
 *   pnpm backfill:memberships                    # dry-run sur prisma/backfill-memberships.csv
 *   pnpm backfill:memberships -- --file ./x.csv  # autre fichier, dry-run
 *   pnpm backfill:memberships -- --apply         # écrit vraiment
 *
 * Format CSV (header obligatoire) :
 *   user_email,company_code,is_primary
 *   alice@seller.fr,SELL-0001,true
 *   bob@seller.fr,SELL-0001,
 *
 * - `is_primary` : `true` / `false` / vide (vide = false).
 * - Idempotent : les memberships déjà présents ne sont pas recréés ; les
 *   basculements de primary ne sont appliqués qu'en mode --apply.
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CsvRow {
  line: number;
  userEmail: string;
  companyCode: string;
  isPrimary: boolean;
}

interface Summary {
  total: number;
  created: number;
  alreadyExists: number;
  primaryUpdated: number;
  userNotFound: number;
  companyNotFound: number;
  warnings: number;
  hardErrors: number;
}

function parseArgs(argv: string[]) {
  const args: { file?: string; apply: boolean } = { apply: false };
  for (let i = 2; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--apply') args.apply = true;
    else if (v === '--file') args.file = argv[++i];
  }
  return args;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/);
  const rows: CsvRow[] = [];
  let headerSeen = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    if (raw.trim().startsWith('#')) continue;

    const parts = raw.split(',').map((p) => p.trim());
    if (!headerSeen) {
      const expected = ['user_email', 'company_code', 'is_primary'];
      const ok = expected.every((h, idx) => (parts[idx] ?? '').toLowerCase() === h);
      if (!ok) {
        throw new Error(
          `Header CSV invalide (ligne ${i + 1}). Attendu: "user_email,company_code,is_primary"`,
        );
      }
      headerSeen = true;
      continue;
    }

    const [userEmail, companyCode, isPrimaryRaw] = parts;
    if (!userEmail || !companyCode) {
      throw new Error(`Ligne ${i + 1} invalide : user_email et company_code sont obligatoires`);
    }

    const isPrimary = (isPrimaryRaw ?? '').toLowerCase() === 'true';
    rows.push({
      line: i + 1,
      userEmail: userEmail.toLowerCase(),
      companyCode,
      isPrimary,
    });
  }

  if (!headerSeen) throw new Error('CSV vide ou sans header');
  return rows;
}

async function run() {
  const args = parseArgs(process.argv);
  const filePath = path.resolve(process.cwd(), args.file ?? 'prisma/backfill-memberships.csv');

  console.log(
    `→ Backfill memberships — fichier: ${filePath} — mode: ${args.apply ? 'APPLY' : 'dry-run'}`,
  );

  if (!fs.existsSync(filePath)) {
    console.error(`✗ Fichier introuvable : ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parseCsv(content);
  console.log(`  ${rows.length} ligne(s) à traiter\n`);

  const summary: Summary = {
    total: rows.length,
    created: 0,
    alreadyExists: 0,
    primaryUpdated: 0,
    userNotFound: 0,
    companyNotFound: 0,
    warnings: 0,
    hardErrors: 0,
  };

  for (const row of rows) {
    const user = await prisma.user.findFirst({
      where: { email: row.userEmail, deletedAt: null },
      select: { id: true, role: true, email: true },
    });
    if (!user) {
      console.log(`  [L${row.line}] USER_NOT_FOUND email=${row.userEmail}`);
      summary.userNotFound++;
      continue;
    }

    const company = await prisma.company.findFirst({
      where: { code: row.companyCode, deletedAt: null },
      select: { id: true, code: true, name: true },
    });
    if (!company) {
      console.log(
        `  [L${row.line}] COMPANY_NOT_FOUND code=${row.companyCode} (user=${user.email})`,
      );
      summary.companyNotFound++;
      continue;
    }

    const nonStaffRoles: UserRole[] = [
      UserRole.MARKETPLACE_SELLER,
      UserRole.MARKETPLACE_BUYER,
      UserRole.BENEFICIARY,
      UserRole.FUNDER,
    ];
    const isStaff = !nonStaffRoles.includes(user.role);
    if (user.role !== UserRole.MARKETPLACE_SELLER && !isStaff) {
      console.log(
        `  [L${row.line}] WARN NON_SELLER_ROLE role=${user.role} email=${user.email} — vérifier que ce rattachement est voulu`,
      );
      summary.warnings++;
    }

    const existing = await prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: company.id } },
    });

    if (existing) {
      if (row.isPrimary && !existing.isPrimary) {
        console.log(
          `  [L${row.line}] PRIMARY_UPDATE_NEEDED email=${user.email} company=${company.code}`,
        );
        summary.primaryUpdated++;
        if (args.apply) {
          await prisma.$transaction([
            prisma.userCompanyMembership.updateMany({
              where: { userId: user.id, isPrimary: true },
              data: { isPrimary: false },
            }),
            prisma.userCompanyMembership.update({
              where: { id: existing.id },
              data: { isPrimary: true },
            }),
          ]);
        }
      } else {
        console.log(`  [L${row.line}] ALREADY_EXISTS email=${user.email} company=${company.code}`);
        summary.alreadyExists++;
      }
      continue;
    }

    console.log(
      `  [L${row.line}] CREATED email=${user.email} company=${company.code}${row.isPrimary ? ' (primary)' : ''}`,
    );
    summary.created++;

    if (args.apply) {
      try {
        await prisma.$transaction(async (tx) => {
          if (row.isPrimary) {
            await tx.userCompanyMembership.updateMany({
              where: { userId: user.id, isPrimary: true },
              data: { isPrimary: false },
            });
          }
          await tx.userCompanyMembership.create({
            data: {
              userId: user.id,
              companyId: company.id,
              isPrimary: row.isPrimary,
            },
          });
        });
      } catch (err) {
        console.error(`  [L${row.line}] ERROR ${(err as Error).message}`);
        summary.hardErrors++;
      }
    }
  }

  console.log('\n── Résumé ────────────────────────────────');
  console.log(`  total           : ${summary.total}`);
  console.log(`  created         : ${summary.created}`);
  console.log(`  already_exists  : ${summary.alreadyExists}`);
  console.log(`  primary_updated : ${summary.primaryUpdated}`);
  console.log(`  user_not_found  : ${summary.userNotFound}`);
  console.log(`  company_not_found: ${summary.companyNotFound}`);
  console.log(`  warnings        : ${summary.warnings}`);
  console.log(`  hard_errors     : ${summary.hardErrors}`);
  console.log(`  mode            : ${args.apply ? 'APPLY' : 'dry-run'}`);

  if (!args.apply) {
    console.log("\n  (dry-run — rien n'a été écrit. Relancez avec --apply pour appliquer)");
  }

  const failed = args.apply && summary.hardErrors > 0;
  process.exit(failed ? 1 : 0);
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
