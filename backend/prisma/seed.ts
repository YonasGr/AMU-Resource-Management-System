import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

interface OrgIds {
  ictId: string;
  csDeptId: string;
  itDeptId: string;
}

async function seedOrganizationTree(): Promise<OrgIds> {
  const existing = await prisma.organizationUnit.findFirst({
    where: { type: 'UNIVERSITY' },
  });
  if (existing) {
    console.log('Organization tree already seeded — skipping.');
    const ict = await prisma.organizationUnit.findFirst({ where: { name: 'ICT Directorate' } });
    const csDept = await prisma.organizationUnit.findFirst({
      where: { name: 'Computer Science Department' },
    });
    const itDept = await prisma.organizationUnit.findFirst({
      where: { name: 'Information Technology Department' },
    });
    return { ictId: ict!.id, csDeptId: csDept!.id, itDeptId: itDept!.id };
  }

  const university = await prisma.organizationUnit.create({
    data: { name: 'Arba Minch University', type: 'UNIVERSITY' },
  });

  const engineering = await prisma.organizationUnit.create({
    data: { name: 'College of Engineering', type: 'COLLEGE', parentId: university.id },
  });

  const csDept = await prisma.organizationUnit.create({
    data: { name: 'Computer Science Department', type: 'DEPARTMENT', parentId: engineering.id },
  });

  const itDept = await prisma.organizationUnit.create({
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
  return { ictId: ict.id, csDeptId: csDept.id, itDeptId: itDept.id };
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
  'purchase.view',
  'purchase.approve',
  'purchase.manage',
  'purchase.receive',
  'supplier.manage',
  'distribution.view',
  'distribution.manage',
  'distribution.confirm',
  'disposal.request',
  'disposal.approve',
  'item.view',
  'item.manage',
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
    permissions: [
      'organization.view',
      'organization.manage',
      'user.view',
      'item.view',
      'item.manage',
      'report.view',
      'audit.view',
    ],
  },
  COLLEGE_ADMINISTRATOR: {
    name: 'College Administrator',
    permissions: ['organization.view', 'user.view', 'item.view', 'report.view'],
  },
  DEPARTMENT_HEAD: {
    name: 'Department Head',
    permissions: ['request.approve', 'transfer.approve', 'item.view', 'report.view'],
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
      'purchase.view',
      'purchase.receive',
      'distribution.view',
      'distribution.confirm',
      'item.view',
    ],
  },
  STORE_KEEPER: {
    name: 'Store Keeper',
    permissions: ['inventory.view', 'inventory.issue', 'inventory.receive', 'item.view'],
  },
  FINANCE_OFFICER: {
    name: 'Finance Officer',
    permissions: ['purchase.view', 'purchase.approve', 'item.view', 'report.view'],
  },
  PROCUREMENT_OFFICER: {
    name: 'Procurement Officer',
    permissions: ['purchase.create', 'purchase.view', 'purchase.approve', 'purchase.manage', 'purchase.receive', 'supplier.manage', 'distribution.view', 'distribution.manage', 'item.view', 'item.manage'],
  },
  REQUESTER: {
    name: 'Requester',
    permissions: ['request.create', 'transfer.request', 'purchase.create', 'item.view'],
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

async function seedSampleStore(organizationId: string, managerId: string): Promise<string> {
  const existing = await prisma.store.findUnique({ where: { code: 'ICT-STORE-01' } });
  if (existing) {
    console.log('Sample store already seeded — skipping.');
    return existing.id;
  }

  const store = await prisma.store.create({
    data: {
      name: 'ICT Store',
      code: 'ICT-STORE-01',
      location: 'ICT Directorate Building, Ground Floor',
      organizationId,
      managerId,
    },
  });
  console.log('Seeded sample store: ICT Store (ICT-STORE-01).');
  return store.id;
}

async function seedItemCatalog(): Promise<void> {
  const categoryNames = [
    'IT Equipment',
    'Furniture',
    'Stationery',
    'Laboratory Equipment',
    'Vehicles',
    'Consumables',
  ];

  const categoryIds = new Map<string, string>();
  for (const name of categoryNames) {
    const category = await prisma.itemCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryIds.set(name, category.id);
  }
  console.log(`Seeded ${categoryNames.length} item categories.`);

  const sampleItems: {
    name: string;
    category: string;
    unit: string;
    serialRequired?: boolean;
    assetType?: 'CONSUMABLE' | 'FIXED_ASSET';
  }[] = [
    { name: 'Laptop Dell Latitude', category: 'IT Equipment', unit: 'piece', serialRequired: true, assetType: 'FIXED_ASSET' },
    { name: 'Printer HP LaserJet', category: 'IT Equipment', unit: 'piece', serialRequired: true, assetType: 'FIXED_ASSET' },
    { name: 'A4 Paper', category: 'Stationery', unit: 'ream', assetType: 'CONSUMABLE' },
    { name: 'Projector', category: 'IT Equipment', unit: 'piece', serialRequired: true, assetType: 'FIXED_ASSET' },
    { name: 'Office Chair', category: 'Furniture', unit: 'piece', assetType: 'FIXED_ASSET' },
  ];

  let createdCount = 0;
  for (const item of sampleItems) {
    const existing = await prisma.item.findFirst({ where: { name: item.name } });
    if (existing) continue;

    await prisma.item.create({
      data: {
        name: item.name,
        unit: item.unit,
        serialRequired: item.serialRequired ?? false,
        assetType: item.assetType ?? 'CONSUMABLE',
        categoryId: categoryIds.get(item.category)!,
      },
    });
    createdCount += 1;
  }
  console.log(`Seeded ${createdCount} sample catalog item(s) (skipped any already present).`);
}

async function seedSampleInventory(storeId: string, createdById: string): Promise<void> {
  const laptop = await prisma.item.findFirst({ where: { name: 'Laptop Dell Latitude' } });
  if (!laptop) {
    console.log('Laptop item not found — skipping sample inventory seed.');
    return;
  }

  const existing = await prisma.storeInventory.findUnique({
    where: { storeId_itemId: { storeId, itemId: laptop.id } },
  });
  if (existing) {
    console.log('Sample inventory already seeded — skipping.');
    return;
  }

  // Bootstraps initial stock the same way the app would: a movement row
  // justifies the quantity, even here in the seed script — there's no
  // "just set the number" path anywhere in this system, including seeding.
  await prisma.$transaction([
    prisma.storeInventory.create({
      data: { storeId, itemId: laptop.id, quantity: 20, minimumStock: 5 },
    }),
    prisma.inventoryMovement.create({
      data: {
        itemId: laptop.id,
        toStoreId: storeId,
        quantity: 20,
        movementType: 'PURCHASE_RECEIVE',
        referenceId: 'seed-initial-stock',
        createdById,
      },
    }),
  ]);
  console.log('Seeded initial inventory: 20x Laptop Dell Latitude at ICT Store.');
}

interface WorkflowStepDef {
  order: number;
  name: string;
  approverResolutionType:
    | 'FIXED_ROLE'
    | 'ORG_ROLE_AT_CONTEXT_ORG'
    | 'STORE_ROLE_AT_CONTEXT_STORE'
    | 'ORG_ROLE_AT_NEXT_LEVEL_UP';
  roleCode: string;
  contextOrgKey?: string;
  contextStoreKey?: string;
}

// Matches the chains described in the spec (sections 13-15, 20).
const WORKFLOW_TEMPLATES: Record<string, { name: string; steps: WorkflowStepDef[] }> = {
  ITEM_REQUEST: {
    name: 'Item Request',
    steps: [
      {
        order: 1,
        name: 'Department Head Approval',
        approverResolutionType: 'ORG_ROLE_AT_CONTEXT_ORG',
        roleCode: 'DEPARTMENT_HEAD',
        contextOrgKey: 'requesterOrganizationId',
      },
      {
        order: 2,
        name: 'Store Manager Approval',
        approverResolutionType: 'STORE_ROLE_AT_CONTEXT_STORE',
        roleCode: 'STORE_MANAGER',
        contextStoreKey: 'targetStoreId',
      },
    ],
  },
  TRANSFER_REQUEST: {
    name: 'Department-to-Department Transfer',
    steps: [
      {
        order: 1,
        name: 'Requester Department Head Approval',
        approverResolutionType: 'ORG_ROLE_AT_CONTEXT_ORG',
        roleCode: 'DEPARTMENT_HEAD',
        contextOrgKey: 'requesterOrganizationId',
      },
      {
        order: 2,
        name: 'Source Store Manager Approval',
        approverResolutionType: 'STORE_ROLE_AT_CONTEXT_STORE',
        roleCode: 'STORE_MANAGER',
        contextStoreKey: 'sourceStoreId',
      },
      {
        order: 3,
        name: 'Receiving Store Manager Approval',
        approverResolutionType: 'STORE_ROLE_AT_CONTEXT_STORE',
        roleCode: 'STORE_MANAGER',
        contextStoreKey: 'destinationStoreId',
      },
    ],
  },
  PURCHASE_REQUEST: {
    name: 'University Purchase',
    steps: [
      {
        order: 1,
        name: 'Department Head Approval',
        approverResolutionType: 'ORG_ROLE_AT_CONTEXT_ORG',
        roleCode: 'DEPARTMENT_HEAD',
        contextOrgKey: 'requesterOrganizationId',
      },
      {
        order: 2,
        name: 'Finance Approval',
        approverResolutionType: 'FIXED_ROLE',
        roleCode: 'FINANCE_OFFICER',
      },
      {
        order: 3,
        name: 'Procurement Approval',
        approverResolutionType: 'FIXED_ROLE',
        roleCode: 'PROCUREMENT_OFFICER',
      },
    ],
  },
  DISPOSAL_REQUEST: {
    name: 'Asset Disposal',
    steps: [
      {
        order: 1,
        name: 'Store Manager Inspection',
        approverResolutionType: 'STORE_ROLE_AT_CONTEXT_STORE',
        roleCode: 'STORE_MANAGER',
        contextStoreKey: 'targetStoreId',
      },
      {
        order: 2,
        name: 'University Administrator Approval',
        approverResolutionType: 'FIXED_ROLE',
        roleCode: 'UNIVERSITY_ADMINISTRATOR',
      },
    ],
  },
  BORROW_REQUEST: {
    name: 'Item Borrowing',
    steps: [
      {
        order: 1,
        name: 'Store Manager Approval',
        approverResolutionType: 'STORE_ROLE_AT_CONTEXT_STORE',
        roleCode: 'STORE_MANAGER',
        contextStoreKey: 'targetStoreId',
      },
    ],
  },
};

async function seedWorkflowTemplates(): Promise<void> {
  for (const [code, def] of Object.entries(WORKFLOW_TEMPLATES)) {
    const template = await prisma.workflowTemplate.upsert({
      where: { code },
      update: { name: def.name },
      create: { code, name: def.name },
    });

    await prisma.$transaction([
      prisma.workflowStepTemplate.deleteMany({ where: { workflowTemplateId: template.id } }),
      prisma.workflowStepTemplate.createMany({
        data: def.steps.map((s) => ({
          workflowTemplateId: template.id,
          order: s.order,
          name: s.name,
          approverResolutionType: s.approverResolutionType,
          roleCode: s.roleCode,
          contextOrgKey: s.contextOrgKey,
          contextStoreKey: s.contextStoreKey,
        })),
      }),
    ]);
  }
  console.log(`Seeded ${Object.keys(WORKFLOW_TEMPLATES).length} workflow templates.`);
}

/**
 * Dev-only test accounts so the Transfer Request workflow (3 approval steps,
 * 3 different resolution strategies) can be exercised end-to-end without
 * manually creating users/stores/role-assignments through Swagger first.
 * Password for all three: "ChangeMe123!" (same as the seed admin).
 */
async function seedWorkflowTestData(
  csDeptId: string,
  itDeptId: string,
  roleCodeToId: Map<string, string>,
): Promise<{ sourceStoreId: string; destStoreId: string }> {
  const passwordHash = await argon2.hash('ChangeMe123!');

  async function ensureUser(email: string, fullName: string, organizationId: string): Promise<string> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return existing.id;
    const user = await prisma.user.create({
      data: { fullName, email, passwordHash, organizationId },
    });
    return user.id;
  }

  async function ensureStore(code: string, name: string, organizationId: string, managerId: string): Promise<string> {
    const existing = await prisma.store.findUnique({ where: { code } });
    if (existing) return existing.id;
    const store = await prisma.store.create({
      data: { code, name, organizationId, managerId },
    });
    return store.id;
  }

  async function ensureRoleAssignment(
    userId: string,
    roleId: string,
    scopeType: 'ORGANIZATION' | 'STORE',
    scopeId: string,
  ): Promise<void> {
    const existing = await prisma.userRole.findFirst({ where: { userId, roleId, scopeType, scopeId } });
    if (existing) return;
    await prisma.userRole.create({ data: { userId, roleId, scopeType, scopeId } });
  }

  const deptHeadRoleId = roleCodeToId.get('DEPARTMENT_HEAD')!;
  const storeManagerRoleId = roleCodeToId.get('STORE_MANAGER')!;

  const deptHeadUserId = await ensureUser(
    'wftest.depthead@amu.edu.et',
    'Workflow Test — CS Dept Head',
    csDeptId,
  );
  await ensureRoleAssignment(deptHeadUserId, deptHeadRoleId, 'ORGANIZATION', csDeptId);

  const sourceManagerUserId = await ensureUser(
    'wftest.sourcemanager@amu.edu.et',
    'Workflow Test — Source Store Manager',
    csDeptId,
  );
  const sourceStoreId = await ensureStore(
    'WF-TEST-SOURCE-01',
    'Workflow Test Source Store',
    csDeptId,
    sourceManagerUserId,
  );
  await ensureRoleAssignment(sourceManagerUserId, storeManagerRoleId, 'STORE', sourceStoreId);

  const destManagerUserId = await ensureUser(
    'wftest.destmanager@amu.edu.et',
    'Workflow Test — Destination Store Manager',
    itDeptId,
  );
  const destStoreId = await ensureStore(
    'WF-TEST-DEST-01',
    'Workflow Test Destination Store',
    itDeptId,
    destManagerUserId,
  );
  await ensureRoleAssignment(destManagerUserId, storeManagerRoleId, 'STORE', destStoreId);

  // A requester who actually belongs to CS Department — request.organizationId
  // comes from the REQUESTER's own org, not whoever happens to submit it, so
  // submitting as admin (home org: ICT Directorate) would route to the wrong
  // department head. This user exists specifically so the "CS needs 10
  // chairs" scenario resolves to wftest.depthead correctly.
  const requesterRoleId = roleCodeToId.get('REQUESTER')!;
  const requesterUserId = await ensureUser(
    'wftest.requester@amu.edu.et',
    'Workflow Test — CS Dept Requester',
    csDeptId,
  );
  await ensureRoleAssignment(requesterUserId, requesterRoleId, 'ORGANIZATION', csDeptId);

  console.log('Seeded workflow test users/stores (password for all: ChangeMe123!):');
  console.log('  wftest.requester@amu.edu.et      — Requester, in CS Department (use this to submit test requests)');
  console.log('  wftest.depthead@amu.edu.et       — Department Head, scoped to CS Department');
  console.log(`  wftest.sourcemanager@amu.edu.et  — Store Manager of WF-TEST-SOURCE-01 (${sourceStoreId})`);
  console.log(`  wftest.destmanager@amu.edu.et    — Store Manager of WF-TEST-DEST-01 (${destStoreId})`);
  console.log(`  CS Department id: ${csDeptId}`);

  return { sourceStoreId, destStoreId };
}

/**
 * Stocks the workflow test source store with Office Chairs — matches the
 * spec's own "CS needs 10 chairs" example (section 14) exactly, so the
 * Transfer Request end-to-end test has real stock to move.
 */
async function seedTransferScenarioStock(sourceStoreId: string, createdById: string): Promise<void> {
  const chair = await prisma.item.findFirst({ where: { name: 'Office Chair' } });
  if (!chair) {
    console.log('Office Chair item not found — skipping transfer scenario stock seed.');
    return;
  }

  const existing = await prisma.storeInventory.findUnique({
    where: { storeId_itemId: { storeId: sourceStoreId, itemId: chair.id } },
  });
  if (existing) {
    console.log('Transfer scenario stock already seeded — skipping.');
    return;
  }

  await prisma.$transaction([
    prisma.storeInventory.create({
      data: { storeId: sourceStoreId, itemId: chair.id, quantity: 20, minimumStock: 5 },
    }),
    prisma.inventoryMovement.create({
      data: {
        itemId: chair.id,
        toStoreId: sourceStoreId,
        quantity: 20,
        movementType: 'PURCHASE_RECEIVE',
        referenceId: 'seed-transfer-scenario-stock',
        createdById,
      },
    }),
  ]);
  console.log('Seeded 20x Office Chair at the workflow test source store.');
}

async function main() {
  const { ictId, csDeptId, itDeptId } = await seedOrganizationTree();
  const adminUserId = await seedAdminUser(ictId);

  const permissionKeyToId = await seedPermissions();
  const roleCodeToId = await seedRoles(permissionKeyToId);

  const systemAdminRoleId = roleCodeToId.get('SYSTEM_ADMINISTRATOR')!;
  await seedAdminRoleAssignment(adminUserId, systemAdminRoleId);

  const storeId = await seedSampleStore(ictId, adminUserId);
  await seedItemCatalog();
  await seedSampleInventory(storeId, adminUserId);

  await seedWorkflowTemplates();
  const { sourceStoreId } = await seedWorkflowTestData(csDeptId, itDeptId, roleCodeToId);
  await seedTransferScenarioStock(sourceStoreId, adminUserId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
