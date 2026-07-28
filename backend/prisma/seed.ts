import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.organizationUnit.findFirst({
    where: { type: 'UNIVERSITY' },
  });
  if (existing) {
    console.log('Organization tree already seeded — skipping.');
    return;
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

  await prisma.organizationUnit.create({
    data: { name: 'ICT Directorate', type: 'DIRECTORATE', parentId: university.id },
  });

  await prisma.organizationUnit.create({
    data: { name: 'Administration Office', type: 'OFFICE', parentId: university.id },
  });

  console.log('Seeded organization tree for Arba Minch University.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
