import {
  MaterialStatus,
  PrismaClient,
  UnitCategory,
} from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  ['Office & Paper Supplies', 'Paper, writing instruments, filing, and desk supplies.'],
  ['IT & Networking', 'Computers, peripherals, networking, and structured cabling.'],
  ['Printer & Imaging Supplies', 'Printer toner, ink, drums, and imaging consumables.'],
  ['Electrical & Power', 'Electrical accessories, power distribution, and backup power items.'],
  ['Laboratory & Technical Supplies', 'Technical tools, electronics, and laboratory consumables.'],
  ['Furniture & Fixtures', 'Office, classroom, laboratory, and storage furniture.'],
] as const;

type MaterialSeed = readonly [
  code: string,
  name: string,
  unit: string,
  unitCategory: UnitCategory,
  baseUnit: string,
  minimumStock: number,
  category: string,
  location: string,
  description: string,
];

const materials: MaterialSeed[] = [
  ['MAT-1001', 'A4 Printing Paper (80gsm)', 'Ream', UnitCategory.PACKAGE, 'sheet', 20, 'Office & Paper Supplies', 'Shelf A-01', 'White A4 paper, 500 sheets per ream.'],
  ['MAT-1002', 'Blue Ballpoint Pens (Box of 50)', 'Box', UnitCategory.PACKAGE, 'piece', 10, 'Office & Paper Supplies', 'Shelf A-02', 'Medium-point blue ballpoint pens.'],
  ['MAT-1003', 'Black Ballpoint Pens (Box of 50)', 'Box', UnitCategory.PACKAGE, 'piece', 10, 'Office & Paper Supplies', 'Shelf A-02', 'Medium-point black ballpoint pens.'],
  ['MAT-1004', 'Red Ballpoint Pens (Box of 50)', 'Box', UnitCategory.PACKAGE, 'piece', 5, 'Office & Paper Supplies', 'Shelf A-02', 'Medium-point red ballpoint pens.'],
  ['MAT-1005', 'Permanent Marker Black (Box of 12)', 'Box', UnitCategory.PACKAGE, 'piece', 5, 'Office & Paper Supplies', 'Shelf A-03', 'Permanent black markers.'],
  ['MAT-1006', 'Whiteboard Marker Assorted (Box of 12)', 'Box', UnitCategory.PACKAGE, 'piece', 5, 'Office & Paper Supplies', 'Shelf A-03', 'Assorted whiteboard markers.'],
  ['MAT-1007', 'HB Graphite Pencils (Box of 12)', 'Box', UnitCategory.PACKAGE, 'piece', 5, 'Office & Paper Supplies', 'Shelf A-04', 'HB graphite pencils.'],
  ['MAT-1008', 'A4 Lever Arch File', 'Piece', UnitCategory.COUNT, 'piece', 20, 'Office & Paper Supplies', 'Shelf A-05', 'A4 lever arch filing folder.'],
  ['MAT-1009', 'A4 Document Folder', 'Piece', UnitCategory.COUNT, 'piece', 30, 'Office & Paper Supplies', 'Shelf A-05', 'Plastic A4 document folder.'],
  ['MAT-1010', 'Stapler Heavy Duty', 'Piece', UnitCategory.COUNT, 'piece', 5, 'Office & Paper Supplies', 'Shelf A-06', 'Heavy-duty office stapler.'],
  ['MAT-1011', 'Staples 24/6 (Box)', 'Box', UnitCategory.PACKAGE, 'piece', 20, 'Office & Paper Supplies', 'Shelf A-06', 'Standard 24/6 staples.'],
  ['MAT-1012', 'Paper Clips 33mm (Box)', 'Box', UnitCategory.PACKAGE, 'piece', 20, 'Office & Paper Supplies', 'Shelf A-07', 'Metal paper clips.'],
  ['MAT-1013', 'Transparent Tape 18mm', 'Roll', UnitCategory.LENGTH, 'meter', 20, 'Office & Paper Supplies', 'Shelf A-07', 'General-purpose transparent adhesive tape.'],
  ['MAT-1014', 'A4 Envelopes (Pack of 50)', 'Pack', UnitCategory.PACKAGE, 'piece', 10, 'Office & Paper Supplies', 'Shelf A-08', 'Plain A4 envelopes.'],
  ['MAT-1015', 'Desk Calculator', 'Piece', UnitCategory.COUNT, 'piece', 5, 'Office & Paper Supplies', 'Shelf A-09', 'Basic office calculator.'],
  ['MAT-2001', 'CAT6 Ethernet Cable (305m Roll)', 'Roll', UnitCategory.LENGTH, 'meter', 3, 'IT & Networking', 'Rack B-01', 'Solid copper CAT6 cable roll.'],
  ['MAT-2002', 'CAT6 Patch Cable 1m', 'Piece', UnitCategory.LENGTH, 'meter', 25, 'IT & Networking', 'Rack B-02', 'CAT6 patch cable, 1 meter.'],
  ['MAT-2003', 'CAT6 Patch Cable 3m', 'Piece', UnitCategory.LENGTH, 'meter', 25, 'IT & Networking', 'Rack B-02', 'CAT6 patch cable, 3 meters.'],
  ['MAT-2004', 'RJ45 Connector (Pack of 100)', 'Pack', UnitCategory.PACKAGE, 'piece', 10, 'IT & Networking', 'Rack B-03', 'CAT6-compatible RJ45 connectors.'],
  ['MAT-2005', '24-Port Gigabit Network Switch', 'Piece', UnitCategory.COUNT, 'piece', 3, 'IT & Networking', 'Rack B-04', 'Managed or unmanaged 24-port gigabit switch.'],
  ['MAT-2006', '8-Port Gigabit Network Switch', 'Piece', UnitCategory.COUNT, 'piece', 5, 'IT & Networking', 'Rack B-04', 'Compact gigabit network switch.'],
  ['MAT-2007', 'Wireless Access Point', 'Piece', UnitCategory.COUNT, 'piece', 5, 'IT & Networking', 'Rack B-05', 'Enterprise wireless access point.'],
  ['MAT-2008', 'USB Keyboard', 'Piece', UnitCategory.COUNT, 'piece', 10, 'IT & Networking', 'Rack B-06', 'USB wired keyboard.'],
  ['MAT-2009', 'USB Optical Mouse', 'Piece', UnitCategory.COUNT, 'piece', 10, 'IT & Networking', 'Rack B-06', 'USB optical mouse.'],
  ['MAT-2010', 'HDMI Cable 2m', 'Piece', UnitCategory.LENGTH, 'meter', 10, 'IT & Networking', 'Rack B-07', 'High-speed HDMI cable.'],
  ['MAT-2011', 'USB Flash Drive 64GB', 'Piece', UnitCategory.COUNT, 'piece', 10, 'IT & Networking', 'Rack B-08', 'USB 3.x flash drive.'],
  ['MAT-2012', 'External Hard Drive 1TB', 'Piece', UnitCategory.COUNT, 'piece', 3, 'IT & Networking', 'Rack B-08', 'Portable external hard drive.'],
  ['MAT-2013', 'Laptop Computer', 'Piece', UnitCategory.COUNT, 'piece', 5, 'IT & Networking', 'Rack B-09', 'Standard institutional laptop.'],
  ['MAT-2014', 'Desktop Computer', 'Piece', UnitCategory.COUNT, 'piece', 5, 'IT & Networking', 'Rack B-10', 'Standard institutional desktop computer.'],
  ['MAT-2015', 'Computer Monitor 24-inch', 'Piece', UnitCategory.COUNT, 'piece', 5, 'IT & Networking', 'Rack B-10', 'Full HD computer monitor.'],
  ['MAT-3001', 'HP LaserJet Toner Cartridge 85A', 'Piece', UnitCategory.COUNT, 'piece', 5, 'Printer & Imaging Supplies', 'Rack C-01', 'Black toner cartridge compatible with HP 85A printers.'],
  ['MAT-3002', 'HP LaserJet Toner Cartridge 12A', 'Piece', UnitCategory.COUNT, 'piece', 5, 'Printer & Imaging Supplies', 'Rack C-01', 'Black toner cartridge compatible with HP 12A printers.'],
  ['MAT-3003', 'Universal Ink Cartridge Black', 'Piece', UnitCategory.COUNT, 'piece', 5, 'Printer & Imaging Supplies', 'Rack C-02', 'Black ink cartridge.'],
  ['MAT-3004', 'Universal Ink Cartridge Color', 'Piece', UnitCategory.COUNT, 'piece', 5, 'Printer & Imaging Supplies', 'Rack C-02', 'Color ink cartridge.'],
  ['MAT-3005', 'Printer Drum Unit', 'Piece', UnitCategory.COUNT, 'piece', 3, 'Printer & Imaging Supplies', 'Rack C-03', 'Replacement printer imaging drum.'],
  ['MAT-3006', 'Thermal Printer Paper Roll', 'Roll', UnitCategory.PACKAGE, 'piece', 20, 'Printer & Imaging Supplies', 'Rack C-04', 'Thermal receipt printer paper roll.'],
  ['MAT-4001', 'Surge Protector 6-Way', 'Piece', UnitCategory.COUNT, 'piece', 10, 'Electrical & Power', 'Rack D-01', 'Six-way surge-protected power strip.'],
  ['MAT-4002', 'UPS 650VA', 'Piece', UnitCategory.COUNT, 'piece', 5, 'Electrical & Power', 'Rack D-02', '650VA uninterruptible power supply.'],
  ['MAT-4003', 'UPS Battery 12V 7Ah', 'Piece', UnitCategory.COUNT, 'piece', 10, 'Electrical & Power', 'Rack D-02', 'Replacement sealed lead-acid UPS battery.'],
  ['MAT-4004', 'Extension Cable 10m', 'Piece', UnitCategory.LENGTH, 'meter', 10, 'Electrical & Power', 'Rack D-03', 'Heavy-duty electrical extension cable.'],
  ['MAT-4005', 'LED Bulb 12W', 'Piece', UnitCategory.COUNT, 'piece', 20, 'Electrical & Power', 'Rack D-04', '12W LED replacement bulb.'],
  ['MAT-5001', 'Digital Multimeter', 'Piece', UnitCategory.COUNT, 'piece', 5, 'Laboratory & Technical Supplies', 'Rack E-01', 'Handheld digital multimeter.'],
  ['MAT-5002', 'Soldering Iron 60W', 'Piece', UnitCategory.COUNT, 'piece', 5, 'Laboratory & Technical Supplies', 'Rack E-02', '60W temperature-controlled soldering iron.'],
  ['MAT-5003', 'Solder Wire 500g', 'Roll', UnitCategory.MASS, 'gram', 5, 'Laboratory & Technical Supplies', 'Rack E-02', 'Lead-free electronics solder wire.'],
  ['MAT-5004', 'Precision Screwdriver Set', 'Set', UnitCategory.PACKAGE, 'piece', 5, 'Laboratory & Technical Supplies', 'Rack E-03', 'Precision screwdriver toolkit.'],
  ['MAT-5005', 'Safety Gloves (Pack of 10)', 'Pack', UnitCategory.PACKAGE, 'piece', 10, 'Laboratory & Technical Supplies', 'Rack E-04', 'Reusable technical safety gloves.'],
  ['MAT-6001', 'Ergonomic Mesh Office Chair', 'Piece', UnitCategory.COUNT, 'piece', 4, 'Furniture & Fixtures', 'Bay F-01', 'Adjustable mesh office chair.'],
  ['MAT-6002', 'Office Desk 120cm', 'Piece', UnitCategory.COUNT, 'piece', 4, 'Furniture & Fixtures', 'Bay F-02', 'Standard office desk.'],
  ['MAT-6003', 'Filing Cabinet 3-Drawer', 'Piece', UnitCategory.COUNT, 'piece', 3, 'Furniture & Fixtures', 'Bay F-03', 'Lockable steel filing cabinet.'],
  ['MAT-6004', 'Bookshelf 5-Tier', 'Piece', UnitCategory.COUNT, 'piece', 3, 'Furniture & Fixtures', 'Bay F-04', 'Five-tier storage bookshelf.'],
];

async function main() {
  console.log('🌱 Seeding catalog master data only...');

  const storeDepartment = await prisma.department.upsert({
    where: { code: 'STORE' },
    update: {},
    create: {
      code: 'STORE',
      name: 'Store & Inventory Management',
      description: 'Central Store & Warehouse Directorate',
    },
  });

  const store = await prisma.store.upsert({
    where: { code: 'STORE-MAIN' },
    update: { departmentId: storeDepartment.id },
    create: {
      code: 'STORE-MAIN',
      name: 'AMU Central & ICT Resource Store',
      location: 'Main Campus ICT & Central Store Building',
      departmentId: storeDepartment.id,
    },
  });

  const categoryIds = new Map<string, string>();
  for (const [name, description] of categories) {
    const category = await prisma.materialCategory.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
    categoryIds.set(name, category.id);
  }

  for (const [code, name, unit, unitCategory, baseUnit, minimumStock, category, location, description] of materials) {
    const material = await prisma.material.upsert({
      where: { materialCode: code },
      update: {
        name,
        unit,
        unitCategory,
        baseUnit,
        minimumStock,
        location,
        description,
        categoryId: categoryIds.get(category)!,
        status: MaterialStatus.ACTIVE,
      },
      create: {
        materialCode: code,
        name,
        unit,
        unitCategory,
        baseUnit,
        minimumStock,
        location,
        description,
        categoryId: categoryIds.get(category)!,
        status: MaterialStatus.ACTIVE,
      },
    });

    await prisma.stockSummary.upsert({
      where: { materialId: material.id },
      update: {},
      create: { materialId: material.id },
    });
    await prisma.stockBalance.upsert({
      where: { storeId_materialId: { storeId: store.id, materialId: material.id } },
      update: {},
      create: { storeId: store.id, materialId: material.id },
    });
  }

  console.log(`✅ Catalog seeded: ${materials.length} materials across ${categories.length} categories`);
  console.log('✅ No users, requests, transactions, or opening stock quantities were created');
}

main()
  .catch((error) => {
    console.error('❌ Catalog seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
