import { PrismaClient, Role, TransactionType, RequestStatus, MaterialStatus, SupplierStatus } from '@prisma/client';
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

  // 2. Users (5 Roles)
  const passwordHash = await argon2.hash('password123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@store.com' },
    update: {},
    create: {
      fullName: 'System Administrator',
      email: 'admin@store.com',
      phone: '+251911001122',
      passwordHash,
      role: Role.ADMINISTRATOR,
      departmentId: adminDept.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@store.com' },
    update: {},
    create: {
      fullName: 'Abebe Kebede (Store Manager)',
      email: 'manager@store.com',
      phone: '+251911223344',
      passwordHash,
      role: Role.STORE_MANAGER,
      departmentId: storeDept.id,
    },
  });

  const keeper = await prisma.user.upsert({
    where: { email: 'keeper@store.com' },
    update: {},
    create: {
      fullName: 'Tigist Haile (Storekeeper)',
      email: 'keeper@store.com',
      phone: '+251911334455',
      passwordHash,
      role: Role.STOREKEEPER,
      departmentId: storeDept.id,
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@store.com' },
    update: {},
    create: {
      fullName: 'Dawit Solomon (Internal Auditor)',
      email: 'auditor@store.com',
      phone: '+251911445566',
      passwordHash,
      role: Role.AUDITOR,
      departmentId: finDept.id,
    },
  });

  const requester = await prisma.user.upsert({
    where: { email: 'requester@store.com' },
    update: {},
    create: {
      fullName: 'Dr. Chala Bekele (Requester / CS Lecturer)',
      email: 'requester@store.com',
      phone: '+251911556677',
      passwordHash,
      role: Role.REQUESTER,
      departmentId: csDept.id,
    },
  });

  console.log('✅ 5 System Users Seeded:');
  console.log('   - Administrator: admin@store.com / password123');
  console.log('   - Store Manager: manager@store.com / password123');
  console.log('   - Storekeeper: keeper@store.com / password123');
  console.log('   - Auditor: auditor@store.com / password123');
  console.log('   - Requester: requester@store.com / password123');

  // 3. Employees
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

  // 4. Suppliers
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

  // 5. Material Categories
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

  // 6. Materials
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

  // 7. Stock Summaries (Initial Stock In)
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

  // 8. Sample Stock In Transactions
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

  // 9. Sample Material Requests
  // Pending request
  const req1 = await prisma.materialRequest.upsert({
    where: { requestNumber: 'REQ-2026-001' },
    update: {},
    create: {
      requestNumber: 'REQ-2026-001',
      purpose: 'End of Semester Examinations Printing',
      status: RequestStatus.PENDING,
      requesterId: requester.id,
      departmentId: csDept.id,
      items: {
        create: [
          { materialId: matPaper.id, quantityRequested: 10, quantityIssued: 0 },
          { materialId: matPen.id, quantityRequested: 2, quantityIssued: 0 },
        ],
      },
    },
  });

  // Approved request ready for Storekeeper to issue
  const req2 = await prisma.materialRequest.upsert({
    where: { requestNumber: 'REQ-2026-002' },
    update: {},
    create: {
      requestNumber: 'REQ-2026-002',
      purpose: 'Lab Setup & Printer Maintenance',
      status: RequestStatus.APPROVED,
      managerRemarks: 'Approved for CS Department Computer Lab 2',
      requesterId: requester.id,
      departmentId: csDept.id,
      approvedById: manager.id,
      approvedAt: new Date(),
      items: {
        create: [
          { materialId: matToner.id, quantityRequested: 2, quantityIssued: 0 },
        ],
      },
    },
  });

  // Issued request
  const req3 = await prisma.materialRequest.upsert({
    where: { requestNumber: 'REQ-2026-003' },
    update: {},
    create: {
      requestNumber: 'REQ-2026-003',
      purpose: 'Faculty Office Setup',
      status: RequestStatus.ISSUED,
      managerRemarks: 'Approved as requested',
      requesterId: requester.id,
      departmentId: csDept.id,
      approvedById: manager.id,
      approvedAt: new Date(Date.now() - 86400000),
      items: {
        create: [
          { materialId: matChair.id, quantityRequested: 2, quantityIssued: 2 },
        ],
      },
    },
  });

  // Stock Out transaction for Issued Request
  await prisma.inventoryTransaction.upsert({
    where: { transactionCode: 'TXN-OUT-001' },
    update: {},
    create: {
      transactionCode: 'TXN-OUT-001',
      type: TransactionType.STOCK_OUT,
      materialId: matChair.id,
      quantity: 2,
      requestId: req3.id,
      employeeId: emp1.id,
      departmentId: csDept.id,
      issuedById: keeper.id,
      approvedById: manager.id,
      purpose: 'Faculty Office Setup',
      remarks: 'Issued 2 mesh chairs to Dr. Chala Bekele',
    },
  });

  console.log('✅ Sample Material Requests & Transactions seeded');
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
