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

async function seedAdminUser(organizationId: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@amu.edu.et' } });
  if (existing) {
    console.log('Admin user already seeded — skipping.');
    return existing.id;
  }

  // Dev-only seed admin — change this password immediately in any shared/staging
  // environment.
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
  return admin.id;
}

// Namespaced permission keys. New modules should add their own keys here
// following the same "<module>.<action>" convention rather than inventing
// a different scheme.
const PERMISSION_KEYS = [
  'organization.view',
  'organization.manage',
  'user.view',
  'user.manage',
  'role.view',
  'role.manage',
  'store.view',
  'store.manage',
  'inventory.view',
  'inventory.issue',
  'inventory.receive',
  'inventory.adjust',
  'transfer.request',
  'transfer.approve',
  'request.create',
  'request.approve',
  'purchase.create',
  'purchase.approve',
  'disposal.request',
  'disposal.approve',
  'audit.view',
  'report.view',
];

// code -> { name, permissions }. "*" grants every permission in
// PERMISSION_KEYS, resolved at seed time so new permissions automatically
// flow to System Administrator without editing this list.
const ROLE_DEFINITIONS: Record<string, { name: string; permissions: string[] | '*' }> = {
  SYSTEM_ADMINISTRATOR: { name: 'System Administrator', permissions: '*' },
  UNIVERSITY_ADMINISTRATOR: {
    name: 'University Administrator',
    permissions: ['organization.view', 'organization.manage', 'user.view', 'report.view', 'audit.view'],
  },
  COLLEGE_ADMINISTRATOR: {
    name: 'College Administrator',
    permissions: ['organization.view', 'user.view', 'report.view'],
  },
  DEPARTMENT_HEAD: {
    name: 'Department Head',
    permissions: ['request.approve', 'transfer.approve', 'report.view'],
  },
  STORE_MANAGER: {
    name: 'Store Manager',
    permissions: [
      'inventory.view',
      'inventory.issue',
      'inventory.receive',
      'inventory.adjust',
      'transfer.approve',
      'request.approve',
    ],
  },
  STORE_KEEPER: {
    name: 'Store Keeper',
    permissions: ['inventory.view', 'inventory.issue', 'inventory.receive'],
  },
  FINANCE_OFFICER: {
    name: 'Finance Officer',
    permissions: ['purchase.approve', 'report.view'],
  },
  PROCUREMENT_OFFICER: {
    name: 'Procurement Officer',
    permissions: ['purchase.create', 'purchase.approve'],
  },
  REQUESTER: {
    name: 'Requester',
    permissions: ['request.create', 'transfer.request'],
  },
  AUDITOR: {
    name: 'Auditor',
    permissions: ['audit.view', 'report.view'],
  },
  EXTERNAL_USER: {
    name: 'External User',
    permissions: ['request.create'],
  },
};

async function seedPermissions(): Promise<Map<string, string>> {
  const keyToId = new Map<string, string>();
  for (const key of PERMISSION_KEYS) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
    keyToId.set(key, permission.id);
  }
  console.log(`Seeded ${PERMISSION_KEYS.length} permissions.`);
  return keyToId;
}

async function seedRoles(permissionKeyToId: Map<string, string>): Promise<Map<string, string>> {
  const codeToId = new Map<string, string>();

  for (const [code, def] of Object.entries(ROLE_DEFINITIONS)) {
    const role = await prisma.role.upsert({
      where: { code },
      update: {},
      create: { code, name: def.name, isSystem: true },
    });
    codeToId.set(code, role.id);

    const permissionKeys = def.permissions === '*' ? PERMISSION_KEYS : def.permissions;
    const permissionIds = permissionKeys
      .map((k) => permissionKeyToId.get(k))
      .filter((id): id is string => Boolean(id));

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      }),
    ]);
  }

  console.log(`Seeded ${Object.keys(ROLE_DEFINITIONS).length} roles.`);
  return codeToId;
}

async function seedAdminRoleAssignment(userId: string, roleId: string): Promise<void> {
  const existing = await prisma.userRole.findFirst({
    where: { userId, roleId, scopeType: 'GLOBAL' },
  });
  if (existing) {
    console.log('Admin role assignment already seeded — skipping.');
    return;
  }

  await prisma.userRole.create({
    data: { userId, roleId, scopeType: 'GLOBAL', scopeId: null },
  });
  console.log('Assigned System Administrator (GLOBAL scope) to the admin user.');
}

async function seedSampleStore(organizationId: string, managerId: string): Promise<void> {
  const existing = await prisma.store.findUnique({ where: { code: 'ICT-STORE-01' } });
  if (existing) {
    console.log('Sample store already seeded — skipping.');
    return;
  }

  await prisma.store.create({
    data: {
      name: 'ICT Store',
      code: 'ICT-STORE-01',
      location: 'ICT Directorate Building, Ground Floor',
      organizationId,
      managerId,
    },
  });
  console.log('Seeded sample store: ICT Store (ICT-STORE-01).');
}

async function main() {
  const ictId = await seedOrganizationTree();
  const adminUserId = await seedAdminUser(ictId);

  const permissionKeyToId = await seedPermissions();
  const roleCodeToId = await seedRoles(permissionKeyToId);

  const systemAdminRoleId = roleCodeToId.get('SYSTEM_ADMINISTRATOR')!;
  await seedAdminRoleAssignment(adminUserId, systemAdminRoleId);

  await seedSampleStore(ictId, adminUserId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
