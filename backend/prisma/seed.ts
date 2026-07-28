import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function seedOrganizationTree(): Promise<string> {
  const existing = await prisma.organizationUnit.findFirst({
    where: { type: 'UNIVERSITY' },
  });
  if (existing) {
    console.log('Organization tree already seeded — skipping.');
    // Still need the ICT Directorate id for admin seeding below.
    const ict = await prisma.organizationUnit.findFirst({ where: { name: 'ICT Directorate' } });
    return ict!.id;
  }

  const university = await prisma.organizationUnit.create({
    data: { name: 'Arba Minch University', type: 'UNIVERSITY' },
  });

  const engineering = await prisma.organizationUnit.create({
    data: { name: 'College of Engineering', type: 'COLLEGE', parentId: university.id },
  });

  await prisma.organizationUnit.create({
    data: { name: 'Computer Science Department', type: 'DEPARTMENT', parentId: engineering.id },
  });

  await prisma.organizationUnit.create({
    data: {
      name: 'Information Technology Department',
      type: 'DEPARTMENT',
      parentId: engineering.id,
    },
  });

  await prisma.organizationUnit.create({
    data: { name: 'College of Medicine', type: 'COLLEGE', parentId: university.id },
  });

  await prisma.organizationUnit.create({
    data: { name: 'Finance Office', type: 'OFFICE', parentId: university.id },
  });

  await prisma.organizationUnit.create({
    data: { name: 'Library', type: 'OFFICE', parentId: university.id },
  });

  const ict = await prisma.organizationUnit.create({
    data: { name: 'ICT Directorate', type: 'DIRECTORATE', parentId: university.id },
  });

  await prisma.organizationUnit.create({
    data: { name: 'Administration Office', type: 'OFFICE', parentId: university.id },
  });

  console.log('Seeded organization tree for Arba Minch University.');
  return ict.id;
}

async function seedAdminUser(organizationId: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@amu.edu.et' } });
  if (existing) {
    console.log('Admin user already seeded — skipping.');
    return;
  }

  // Dev-only seed admin — change this password immediately in any shared/staging
  // environment. Role assignment (System Administrator) lands in Phase 1.3.
  const adminPasswordHash = await argon2.hash('ChangeMe123!');
  const admin = await prisma.user.create({
    data: {
      fullName: 'System Administrator',
      email: 'admin@amu.edu.et',
      passwordHash: adminPasswordHash,
      organizationId,
    },
  });

  console.log(`Seeded admin user: ${admin.email} / ChangeMe123! (change this password)`);
}

async function main() {
  const ictId = await seedOrganizationTree();
  await seedAdminUser(ictId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
