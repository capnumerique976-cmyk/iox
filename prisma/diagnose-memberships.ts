/**
 * Diagnostic CLI des memberships seller (lecture seule).
 *
 * Conçu pour être exécuté avant/après un backfill et pendant l'exploitation
 * pour répondre à une seule question : "combien de sellers sont prêts à
 * ouvrir la marketplace, et qui manque-t-il ?".
 *
 * Usage :
 *   pnpm memberships:diagnose               # synthèse globale
 *   pnpm memberships:diagnose -- --verbose  # + liste des sellers orphelins
 *
 * Ne modifie jamais la base. Sortie JSON sur `--json` pour pipeline CI.
 */
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

interface Diagnostic {
  totalSellerUsers: number;
  sellersWithMembership: number;
  sellersWithoutMembership: number;
  totalMemberships: number;
  membershipsWithoutSellerProfile: number;
  companiesWithSellerProfile: number;
}

function parseArgs(argv: string[]) {
  return {
    verbose: argv.includes('--verbose'),
    json: argv.includes('--json'),
  };
}

async function run() {
  const args = parseArgs(process.argv);

  const sellerUsers = await prisma.user.findMany({
    where: { role: UserRole.MARKETPLACE_SELLER, deletedAt: null, isActive: true },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      companyMemberships: {
        select: {
          id: true,
          isPrimary: true,
          company: {
            select: { id: true, code: true, name: true, sellerProfile: { select: { id: true } } },
          },
        },
      },
    },
    orderBy: { email: 'asc' },
  });

  const orphans = sellerUsers.filter((u) => u.companyMemberships.length === 0);
  const withMembership = sellerUsers.length - orphans.length;

  const totalMemberships = await prisma.userCompanyMembership.count();
  const membershipsWithoutSellerProfile = await prisma.userCompanyMembership.count({
    where: { company: { sellerProfile: null } },
  });
  const companiesWithSellerProfile = await prisma.sellerProfile.count();

  const diagnostic: Diagnostic = {
    totalSellerUsers: sellerUsers.length,
    sellersWithMembership: withMembership,
    sellersWithoutMembership: orphans.length,
    totalMemberships,
    membershipsWithoutSellerProfile,
    companiesWithSellerProfile,
  };

  if (args.json) {
    console.log(
      JSON.stringify(
        { diagnostic, orphans: orphans.map((u) => ({ id: u.id, email: u.email })) },
        null,
        2,
      ),
    );
  } else {
    console.log('── Diagnostic memberships seller ─────────────');
    console.log(`  Total users MARKETPLACE_SELLER actifs : ${diagnostic.totalSellerUsers}`);
    console.log(`   → avec membership                    : ${diagnostic.sellersWithMembership}`);
    console.log(`   → SANS membership (orphelins)        : ${diagnostic.sellersWithoutMembership}`);
    console.log(`  Total memberships en base             : ${diagnostic.totalMemberships}`);
    console.log(
      `   → dont company sans sellerProfile    : ${diagnostic.membershipsWithoutSellerProfile}`,
    );
    console.log(
      `  Companies avec sellerProfile (1:1)    : ${diagnostic.companiesWithSellerProfile}`,
    );

    if (args.verbose && orphans.length > 0) {
      console.log('\n── Sellers orphelins (à rattacher) ──────────');
      for (const u of orphans) {
        console.log(`  • ${u.email}  (${u.firstName} ${u.lastName})  id=${u.id}`);
      }
    }

    console.log('\n── Verdict ──────────────────────────────────');
    if (diagnostic.sellersWithoutMembership === 0 && diagnostic.totalSellerUsers > 0) {
      console.log('  ✅ READY — 0 seller orphelin.');
    } else if (diagnostic.totalSellerUsers === 0) {
      console.log('  ⚠ NO_SELLERS — aucun user MARKETPLACE_SELLER actif.');
    } else {
      console.log(
        `  ❌ NOT_READY — ${diagnostic.sellersWithoutMembership} seller(s) sans membership.`,
      );
      console.log('     → préparer le CSV et lancer `pnpm backfill:memberships -- --apply`.');
    }
    if (diagnostic.membershipsWithoutSellerProfile > 0) {
      console.log(
        `  ⚠  ${diagnostic.membershipsWithoutSellerProfile} membership(s) pointent vers une company sans SellerProfile.`,
      );
    }
  }

  process.exit(diagnostic.sellersWithoutMembership === 0 ? 0 : 2);
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
