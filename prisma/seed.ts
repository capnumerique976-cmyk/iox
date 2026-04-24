import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed de la base de données IOX...');

  // Utilisateur admin par défaut
  const adminHash = await bcrypt.hash('Admin@IOX2026!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@iox.mch' },
    update: {},
    create: {
      email: 'admin@iox.mch',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'IOX',
      role: UserRole.ADMIN,
    },
  });

  // Coordinateur ADAAM
  const coordHash = await bcrypt.hash('Coord@IOX2026!', 12);
  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinateur@iox.mch' },
    update: {},
    create: {
      email: 'coordinateur@iox.mch',
      passwordHash: coordHash,
      firstName: 'Coordinateur',
      lastName: 'ADAAM',
      role: UserRole.COORDINATOR,
    },
  });

  // Valideur mise en marché
  const valideurHash = await bcrypt.hash('Valid@IOX2026!', 12);
  const valideur = await prisma.user.upsert({
    where: { email: 'valideur@iox.mch' },
    update: {},
    create: {
      email: 'valideur@iox.mch',
      passwordHash: valideurHash,
      firstName: 'Valideur',
      lastName: 'MCH',
      role: UserRole.MARKET_VALIDATOR,
    },
  });

  console.log(
    `✅ Utilisateurs créés : admin (${admin.id}), coordinateur (${coordinator.id}), valideur (${valideur.id})`,
  );

  // ─── V2 Ownership — exemple seller + membership company ───────────────────
  // Le seed démontre la liaison User ↔ Company pour un user de rôle
  // MARKETPLACE_SELLER. En MVP production, les memberships sont créés par un
  // administrateur via l'API (endpoint à exposer en V2+) ou par un import
  // contrôlé.

  const sellerHash = await bcrypt.hash('Seller@IOX2026!', 12);
  const sellerUser = await prisma.user.upsert({
    where: { email: 'seller.demo@iox.mch' },
    update: {},
    create: {
      email: 'seller.demo@iox.mch',
      passwordHash: sellerHash,
      firstName: 'Seller',
      lastName: 'Demo',
      role: UserRole.MARKETPLACE_SELLER,
    },
  });

  const demoCompany = await prisma.company.upsert({
    where: { code: 'SUP-DEMO-001' },
    update: {},
    create: {
      code: 'SUP-DEMO-001',
      name: 'Coopérative Démo Mayotte',
      types: ['SUPPLIER', 'COOPERATIVE'],
      country: 'YT',
      city: 'Mamoudzou',
      isActive: true,
    },
  });

  await prisma.userCompanyMembership.upsert({
    where: { userId_companyId: { userId: sellerUser.id, companyId: demoCompany.id } },
    update: {},
    create: {
      userId: sellerUser.id,
      companyId: demoCompany.id,
      isPrimary: true,
      createdById: admin.id,
    },
  });

  console.log(`✅ Seller demo : ${sellerUser.email} → company ${demoCompany.code}`);
  console.log('');
  console.log('Identifiants de test :');
  console.log('  Admin         : admin@iox.mch / Admin@IOX2026!');
  console.log('  Coordinateur  : coordinateur@iox.mch / Coord@IOX2026!');
  console.log('  Valideur      : valideur@iox.mch / Valid@IOX2026!');
  console.log('  Seller démo   : seller.demo@iox.mch / Seller@IOX2026!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
