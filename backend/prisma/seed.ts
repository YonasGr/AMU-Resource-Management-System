import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Phase 1+ seed data (organizations, roles, permissions, admin user) will go here.
  console.log('Seed placeholder — no seed data yet (Phase 0).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
