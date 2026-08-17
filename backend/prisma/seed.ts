import { PrismaClient, Role, ScopeType, TransactionType, RequestStatus, MaterialStatus, SupplierStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Store Management System Database...');

  // 1. Departments
  const csDept = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: {
      code: 'CS',
      name: 'Computer Science Department',
      description: 'Department of Computer Science & IT',
    },
  });

  const eeDept = await prisma.department.upsert({
    where: { code: 'EE' },
    update: {},
    create: {
      code: 'EE',
      name: 'Electrical Engineering Department',
      description: 'Department of Electrical & Computer Engineering',
    },
  });

  const storeDept = await prisma.department.upsert({
    where: { code: 'STORE' },
    update: {},
    create: {
      code: 'STORE',
      name: 'Store & Inventory Management',
      description: 'Central Store & Warehouse Directorate',
    },
  });

  const adminDept = await prisma.department.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: 'General Administration',
      description: 'Central General Administration',
    },
  });

  const finDept = await prisma.department.upsert({
    where: { code: 'FIN' },
    update: {},
    create: {
      code: 'FIN',
      name: 'Finance & Procurement',
      description: 'Finance and Budgeting Directorate',
    },
  });

  console.log('✅ Departments seeded');

  // 2. Stores
  const storeA = await prisma.store.upsert({
    where: { code: 'STORE-MAIN' },
    update: {
      name: 'Central Warehouse Store',
      location: 'Main Campus Building A',
      departmentId: storeDept.id,
    },
    create: {
      code: 'STORE-MAIN',
      name: 'Central Warehouse Store',
      location: 'Main Campus Building A',
      departmentId: storeDept.id,
    },
  });

  const storeB = await prisma.store.upsert({
    where: { code: 'STORE-ENG' },
    update: {
      name: 'Engineering Faculty Store',
      location: 'Technology Campus Block 3',
      departmentId: eeDept.id,
    },
    create: {
      code: 'STORE-ENG',
      name: 'Engineering Faculty Store',
      location: 'Technology Campus Block 3',
      departmentId: eeDept.id,
    },
  });

  console.log('✅ Stores seeded:');
  console.log('   - Store A (Central Warehouse): STORE-MAIN');
  console.log('   - Store B (Engineering Faculty): STORE-ENG');

  // 3. Users (7 System Users with Scopes)
  const passwordHash = await argon2.hash('password123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@store.com' },
    update: {
      fullName: 'System Administrator',
      role: Role.ADMINISTRATOR,
      scopeType: ScopeType.GLOBAL,
      departmentId: adminDept.id,
      storeId: null,
    },
    create: {
      fullName: 'System Administrator',
      email: 'admin@store.com',
      phone: '+251911001122',
      passwordHash,
      role: Role.ADMINISTRATOR,
      scopeType: ScopeType.GLOBAL,
      departmentId: adminDept.id,
      storeId: null,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@store.com' },
    update: {
      fullName: 'Abebe Kebede (Central Store Manager)',
      role: Role.STORE_MANAGER,
      scopeType: ScopeType.STORE,
      storeId: storeA.id,
      departmentId: storeDept.id,
    },
    create: {
      fullName: 'Abebe Kebede (Central Store Manager)',
      email: 'manager@store.com',
      phone: '+251911223344',
      passwordHash,
      role: Role.STORE_MANAGER,
      scopeType: ScopeType.STORE,
      storeId: storeA.id,
      departmentId: storeDept.id,
    },
  });

  const engManager = await prisma.user.upsert({
    where: { email: 'engmanager@store.com' },
    update: {
      fullName: 'Almaz Tefera (Engineering Store Manager)',
      role: Role.STORE_MANAGER,
      scopeType: ScopeType.STORE,
      storeId: storeB.id,
      departmentId: eeDept.id,
    },
    create: {
      fullName: 'Almaz Tefera (Engineering Store Manager)',
      email: 'engmanager@store.com',
      phone: '+251911223345',
      passwordHash,
      role: Role.STORE_MANAGER,
      scopeType: ScopeType.STORE,
      storeId: storeB.id,
      departmentId: eeDept.id,
    },
  });

  const globalManager = await prisma.user.upsert({
    where: { email: 'globalmanager@store.com' },
    update: {
      fullName: 'Kassahun Belay (Global Store Manager)',
      role: Role.STORE_MANAGER,
      scopeType: ScopeType.GLOBAL,
      storeId: null,
      departmentId: adminDept.id,
    },
    create: {
      fullName: 'Kassahun Belay (Global Store Manager)',
      email: 'globalmanager@store.com',
      phone: '+251911223346',
      passwordHash,
      role: Role.STORE_MANAGER,
      scopeType: ScopeType.GLOBAL,
      storeId: null,
      departmentId: adminDept.id,
    },
  });

  const keeper = await prisma.user.upsert({
    where: { email: 'keeper@store.com' },
    update: {
      fullName: 'Tigist Haile (Storekeeper)',
      role: Role.STOREKEEPER,
      scopeType: ScopeType.STORE,
      storeId: storeA.id,
      departmentId: storeDept.id,
    },
    create: {
      fullName: 'Tigist Haile (Storekeeper)',
      email: 'keeper@store.com',
      phone: '+251911334455',
      passwordHash,
      role: Role.STOREKEEPER,
      scopeType: ScopeType.STORE,
      storeId: storeA.id,
      departmentId: storeDept.id,
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@store.com' },
    update: {
      fullName: 'Dawit Solomon (Internal Auditor)',
      role: Role.AUDITOR,
      scopeType: ScopeType.GLOBAL,
      storeId: null,
      departmentId: finDept.id,
    },
    create: {
      fullName: 'Dawit Solomon (Internal Auditor)',
      email: 'auditor@store.com',
      phone: '+251911445566',
      passwordHash,
      role: Role.AUDITOR,
      scopeType: ScopeType.GLOBAL,
      storeId: null,
      departmentId: finDept.id,
    },
  });

  const requester = await prisma.user.upsert({
    where: { email: 'requester@store.com' },
    update: {
      fullName: 'Dr. Chala Bekele (Requester / CS Lecturer)',
      role: Role.REQUESTER,
      scopeType: ScopeType.STORE,
      departmentId: csDept.id,
    },
    create: {
      fullName: 'Dr. Chala Bekele (Requester / CS Lecturer)',
      email: 'requester@store.com',
      phone: '+251911556677',
      passwordHash,
      role: Role.REQUESTER,
      scopeType: ScopeType.STORE,
      departmentId: csDept.id,
    },
  });

  console.log('✅ 7 System Users Seeded:');
  console.log('   - Administrator: admin@store.com (GLOBAL)');
  console.log('   - Store Manager (Store A): manager@store.com (STORE: STORE-MAIN)');
  console.log('   - Store Manager (Store B): engmanager@store.com (STORE: STORE-ENG)');
  console.log('   - Global Store Manager: globalmanager@store.com (GLOBAL)');
  console.log('   - Storekeeper: keeper@store.com (STORE: STORE-MAIN)');
  console.log('   - Auditor: auditor@store.com (GLOBAL)');
  console.log('   - Requester: requester@store.com (STORE: CS)');

  // 4. Employees
  const emp1 = await prisma.employee.upsert({
    where: { employeeCode: 'EMP-101' },
    update: {},
    create: {
      employeeCode: 'EMP-101',
      fullName: 'Dr. Chala Bekele',
      email: 'chala.bekele@university.edu',
      phone: '+251911556677',
      position: 'Assistant Professor',
      departmentId: csDept.id,
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: { employeeCode: 'EMP-102' },
    update: {},
    create: {
      employeeCode: 'EMP-102',
      fullName: 'Sara Tadesse',
      email: 'sara.tadesse@university.edu',
      phone: '+251911889900',
      position: 'Lab Technologist',
      departmentId: eeDept.id,
    },
  });

  console.log('✅ Employees seeded');

  // 5. Suppliers
  const supp1 = await prisma.supplier.upsert({
    where: { supplierCode: 'SUP-001' },
    update: {},
    create: {
      supplierCode: 'SUP-001',
      name: 'Ethio Stationery Supplies PLC',
      contactPerson: 'Mulugeta Alemu',
      email: 'info@ethiostationery.com',
      phone: '+251111552233',
      address: 'Arada Sub-City, Addis Ababa',
      status: SupplierStatus.ACTIVE,
    },
  });

  const supp2 = await prisma.supplier.upsert({
    where: { supplierCode: 'SUP-002' },
    update: {},
    create: {
      supplierCode: 'SUP-002',
      name: 'Global IT Hardware Distributors',
      contactPerson: 'Kethan Patel',
      email: 'sales@globalithardware.com',
      phone: '+251116633444',
      address: 'Bole Sub-City, Addis Ababa',
      status: SupplierStatus.ACTIVE,
    },
  });

  console.log('✅ Suppliers seeded');

  // 6. Material Categories
  const catOffice = await prisma.materialCategory.upsert({
    where: { name: 'Office & Paper Supplies' },
    update: {},
    create: {
      name: 'Office & Paper Supplies',
      description: 'A4 Paper, Markers, Folders, Pens, Staples',
    },
  });

  const catIT = await prisma.materialCategory.upsert({
    where: { name: 'IT & Electronics' },
    update: {},
    create: {
      name: 'IT & Electronics',
      description: 'Computers, Keyboards, Ethernet Cables, Toners',
    },
  });

  const catFurniture = await prisma.materialCategory.upsert({
    where: { name: 'Furniture & Fixtures' },
    update: {},
    create: {
      name: 'Furniture & Fixtures',
      description: 'Office Chairs, Desks, Storage Cabinets',
    },
  });

  console.log('✅ Material Categories seeded');

  // 7. Materials
  const matPaper = await prisma.material.upsert({
    where: { materialCode: 'MAT-1001' },
    update: {},
    create: {
      materialCode: 'MAT-1001',
      name: 'A4 Printing Paper (80gsm)',
      unit: 'Ream',
      minimumStock: 20,
      location: 'Shelf A-01',
      barcode: '8901234567890',
      description: 'Standard 80gsm white A4 printing reams (500 sheets/ream)',
      categoryId: catOffice.id,
      status: MaterialStatus.ACTIVE,
    },
  });

  const matPen = await prisma.material.upsert({
    where: { materialCode: 'MAT-1002' },
    update: {},
    create: {
      materialCode: 'MAT-1002',
      name: 'Blue Ballpoint Pens (Box of 50)',
      unit: 'Box',
      minimumStock: 10,
      location: 'Shelf A-02',
      barcode: '8901234567891',
      description: 'Smooth writing medium ballpoint pens',
      categoryId: catOffice.id,
      status: MaterialStatus.ACTIVE,
    },
  });

  const matCable = await prisma.material.upsert({
    where: { materialCode: 'MAT-2001' },
    update: {},
    create: {
      materialCode: 'MAT-2001',
      name: 'CAT6 Ethernet Cable (305m Roll)',
      unit: 'Roll',
      minimumStock: 3,
      location: 'Rack B-05',
      barcode: '8901234567892',
      description: 'High speed gigabit UTP network cable roll',
      categoryId: catIT.id,
      status: MaterialStatus.ACTIVE,
    },
  });

  const matToner = await prisma.material.upsert({
    where: { materialCode: 'MAT-2002' },
    update: {},
    create: {
      materialCode: 'MAT-2002',
      name: 'HP LaserJet Toner Cartridge 85A',
      unit: 'Piece',
      minimumStock: 5,
      location: 'Rack B-08',
      barcode: '8901234567893',
      description: 'Black LaserJet printer toner cartridge',
      categoryId: catIT.id,
      status: MaterialStatus.ACTIVE,
    },
  });

  const matChair = await prisma.material.upsert({
    where: { materialCode: 'MAT-3001' },
    update: {},
    create: {
      materialCode: 'MAT-3001',
      name: 'Ergonomic Mesh Office Chair',
      unit: 'Piece',
      minimumStock: 4,
      location: 'Warehouse Floor Bay 3',
      barcode: '8901234567894',
      description: 'Adjustable height mesh back office swivel chair',
      categoryId: catFurniture.id,
      status: MaterialStatus.ACTIVE,
    },
  });

  console.log('✅ Materials seeded');

  // 8. Stock Summaries (Initial Stock In)
  await prisma.stockSummary.upsert({
    where: { materialId: matPaper.id },
    update: { quantityReceived: 100, quantityIssued: 15, remainingQuantity: 85 },
    create: {
      materialId: matPaper.id,
      quantityReceived: 100,
      quantityIssued: 15,
      remainingQuantity: 85,
    },
  });

  await prisma.stockSummary.upsert({
    where: { materialId: matPen.id },
    update: { quantityReceived: 50, quantityIssued: 10, remainingQuantity: 40 },
    create: {
      materialId: matPen.id,
      quantityReceived: 50,
      quantityIssued: 10,
      remainingQuantity: 40,
    },
  });

  await prisma.stockSummary.upsert({
    where: { materialId: matCable.id },
    update: { quantityReceived: 10, quantityIssued: 8, remainingQuantity: 2 }, // Low stock! (Min is 3)
    create: {
      materialId: matCable.id,
      quantityReceived: 10,
      quantityIssued: 8,
      remainingQuantity: 2,
    },
  });

  await prisma.stockSummary.upsert({
    where: { materialId: matToner.id },
    update: { quantityReceived: 25, quantityIssued: 5, remainingQuantity: 20 },
    create: {
      materialId: matToner.id,
      quantityReceived: 25,
      quantityIssued: 5,
      remainingQuantity: 20,
    },
  });

  await prisma.stockSummary.upsert({
    where: { materialId: matChair.id },
    update: { quantityReceived: 15, quantityIssued: 12, remainingQuantity: 3 }, // Low stock! (Min is 4)
    create: {
      materialId: matChair.id,
      quantityReceived: 15,
      quantityIssued: 12,
      remainingQuantity: 3,
    },
  });

  console.log('✅ Stock Summaries seeded');

  // 9. Sample Stock In Transactions
  await prisma.inventoryTransaction.createMany({
    data: [
      {
        transactionCode: 'TXN-IN-001',
        type: TransactionType.STOCK_IN,
        materialId: matPaper.id,
        quantity: 100,
        unitPrice: 450.00,
        supplierId: supp1.id,
        issuedById: keeper.id,
        approvedById: manager.id,
        purpose: 'Initial Store Procurement',
        remarks: 'Received in good condition',
      },
      {
        transactionCode: 'TXN-IN-002',
        type: TransactionType.STOCK_IN,
        materialId: matCable.id,
        quantity: 10,
        unitPrice: 2800.00,
        supplierId: supp2.id,
        issuedById: keeper.id,
        approvedById: manager.id,
        purpose: 'Network Lab Upgrade Stocking',
        remarks: 'Delivered by Global IT',
      },
    ],
    skipDuplicates: true,
  });

  // 10. Sample Material Requests with Store Scoping
  // REQ-2026-001: Pending request targeting Store A
  const req1 = await prisma.materialRequest.upsert({
    where: { requestNumber: 'REQ-2026-001' },
    update: {
      storeId: storeA.id,
      status: RequestStatus.PENDING,
      departmentId: csDept.id,
      requesterId: requester.id,
    },
    create: {
      requestNumber: 'REQ-2026-001',
      purpose: 'End of Semester Examinations Printing',
      status: RequestStatus.PENDING,
      requesterId: requester.id,
      departmentId: csDept.id,
      storeId: storeA.id,
      items: {
        create: [
          { materialId: matPaper.id, quantityRequested: 10, quantityIssued: 0 },
          { materialId: matPen.id, quantityRequested: 2, quantityIssued: 0 },
        ],
      },
    },
  });

  // REQ-2026-002: Pending request targeting Store B
  const req2 = await prisma.materialRequest.upsert({
    where: { requestNumber: 'REQ-2026-002' },
    update: {
      storeId: storeB.id,
      status: RequestStatus.PENDING,
      departmentId: csDept.id,
      requesterId: requester.id,
    },
    create: {
      requestNumber: 'REQ-2026-002',
      purpose: 'Lab Setup & Printer Maintenance',
      status: RequestStatus.PENDING,
      requesterId: requester.id,
      departmentId: csDept.id,
      storeId: storeB.id,
      items: {
        create: [
          { materialId: matToner.id, quantityRequested: 2, quantityIssued: 0 },
        ],
      },
    },
  });

  // REQ-2026-003: Approved request for Store A
  const req3 = await prisma.materialRequest.upsert({
    where: { requestNumber: 'REQ-2026-003' },
    update: {
      storeId: storeA.id,
      status: RequestStatus.APPROVED,
      departmentId: csDept.id,
      requesterId: requester.id,
      approvedById: manager.id,
      approvedAt: new Date(),
    },
    create: {
      requestNumber: 'REQ-2026-003',
      purpose: 'Faculty Office Setup',
      status: RequestStatus.APPROVED,
      managerRemarks: 'Approved for Faculty Offices',
      requesterId: requester.id,
      departmentId: csDept.id,
      storeId: storeA.id,
      approvedById: manager.id,
      approvedAt: new Date(),
      items: {
        create: [
          { materialId: matChair.id, quantityRequested: 2, quantityIssued: 0 },
        ],
      },
    },
  });

  // REQ-2026-004: Issued request for Store A
  const req4 = await prisma.materialRequest.upsert({
    where: { requestNumber: 'REQ-2026-004' },
    update: {
      storeId: storeA.id,
      status: RequestStatus.ISSUED,
      departmentId: csDept.id,
      requesterId: requester.id,
      approvedById: manager.id,
      approvedAt: new Date(Date.now() - 86400000),
    },
    create: {
      requestNumber: 'REQ-2026-004',
      purpose: 'Network Lab Cabling Deployment',
      status: RequestStatus.ISSUED,
      managerRemarks: 'Approved and issued for network upgrade',
      requesterId: requester.id,
      departmentId: csDept.id,
      storeId: storeA.id,
      approvedById: manager.id,
      approvedAt: new Date(Date.now() - 86400000),
      items: {
        create: [
          { materialId: matCable.id, quantityRequested: 1, quantityIssued: 1 },
        ],
      },
    },
  });

  // Stock Out transaction for Issued Request (REQ-2026-004)
  await prisma.inventoryTransaction.upsert({
    where: { transactionCode: 'TXN-OUT-001' },
    update: {
      requestId: req4.id,
    },
    create: {
      transactionCode: 'TXN-OUT-001',
      type: TransactionType.STOCK_OUT,
      materialId: matCable.id,
      quantity: 1,
      requestId: req4.id,
      employeeId: emp1.id,
      departmentId: csDept.id,
      issuedById: keeper.id,
      approvedById: manager.id,
      purpose: 'Network Lab Cabling Deployment',
      remarks: 'Issued 1 roll CAT6 Cable to Dr. Chala Bekele',
    },
  });

  console.log('✅ Sample Material Requests (REQ-2026-001 to 004) & Transactions seeded');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
