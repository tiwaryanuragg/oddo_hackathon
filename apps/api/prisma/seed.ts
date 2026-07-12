/**
 * Idempotent database seed. Bootstraps the first SUPER_ADMIN (so the platform
 * can be logged into) plus a handful of departments and categories that the
 * later modules build on. Safe to run repeatedly — every write is an upsert.
 *
 *   npm run prisma:seed -w @assetflow/api
 */
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@assetflow.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Administrator',
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const departments = [
    { name: 'Information Technology', code: 'IT' },
    { name: 'Facilities', code: 'FAC' },
    { name: 'Finance', code: 'FIN' },
    { name: 'Human Resources', code: 'HR' },
  ];
  for (const d of departments) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: { ...d, managerId: admin.id },
    });
  }

  const categories = [
    { name: 'Laptops', slug: 'laptops' },
    { name: 'Monitors', slug: 'monitors' },
    { name: 'Furniture', slug: 'furniture' },
    { name: 'Vehicles', slug: 'vehicles' },
    { name: 'Meeting Rooms', slug: 'meeting-rooms' },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Seed complete. Super admin: ${adminEmail}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
