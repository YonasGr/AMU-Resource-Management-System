import React from 'react';

export type ReportType =
  | 'current-stock'
  | 'stock-in'
  | 'stock-out'
  | 'material-balance'
  | 'low-stock'
  | 'employee-issue'
  | 'supplier'
  | 'transaction-history';

export interface ColumnDef<T = any> {
  id: string;
  label: string;
  defaultVisible?: boolean;
  align?: 'left' | 'center' | 'right';
  getValue: (row: T) => string | number | null | undefined;
  formatPrint?: (row: T) => string;
  renderCell?: (row: T) => React.ReactNode;
}

export interface SummaryMetric {
  label: string;
  value: string | number;
  highlight?: boolean;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

export interface ReportConfig<T = any> {
  id: ReportType;
  title: string;
  subtitle: string;
  documentRefPrefix: string;
  columns: ColumnDef<T>[];
  computeSummaries: (rows: T[]) => SummaryMetric[];
}

// Formatters
export const formatCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '—';
  return `ETB ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (val: string | Date | null | undefined): string => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (val: string | Date | null | undefined): string => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatNumber = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
};

// 8 Official Report Configurations
export const REPORT_CONFIGS: Record<ReportType, ReportConfig> = {
  'current-stock': {
    id: 'current-stock',
    title: 'Current Stock & Inventory Valuation Report',
    subtitle: 'Comprehensive inventory balance of all catalog materials across storage locations',
    documentRefPrefix: 'AMU-RPT-STK',
    columns: [
      {
        id: 'materialCode',
        label: 'Item Code',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.materialCode,
        formatPrint: (r) => r.materialCode || '—',
      },
      {
        id: 'name',
        label: 'Material Name',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.name,
      },
      {
        id: 'category',
        label: 'Category',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.category?.name || r.category || '—',
      },
      {
        id: 'unit',
        label: 'Unit',
        align: 'center',
        defaultVisible: true,
        getValue: (r) => r.unit || '—',
      },
      {
        id: 'location',
        label: 'Shelf / Location',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.location || '—',
      },
      {
        id: 'quantityReceived',
        label: 'Total Received',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.stockSummary?.quantityReceived ?? 0,
        formatPrint: (r) => formatNumber(r.stockSummary?.quantityReceived ?? 0),
      },
      {
        id: 'quantityIssued',
        label: 'Total Issued',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.stockSummary?.quantityIssued ?? 0,
        formatPrint: (r) => formatNumber(r.stockSummary?.quantityIssued ?? 0),
      },
      {
        id: 'remainingQuantity',
        label: 'Available Stock',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.stockSummary?.remainingQuantity ?? 0,
        formatPrint: (r) => formatNumber(r.stockSummary?.remainingQuantity ?? 0),
      },
      {
        id: 'minimumStock',
        label: 'Min Reorder Threshold',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.minimumStock ?? 0,
        formatPrint: (r) => formatNumber(r.minimumStock ?? 0),
      },
      {
        id: 'status',
        label: 'Stock Health',
        align: 'center',
        defaultVisible: true,
        getValue: (r) => {
          const rem = r.stockSummary?.remainingQuantity ?? 0;
          const min = r.minimumStock ?? 0;
          return rem <= min ? 'LOW STOCK' : 'HEALTHY';
        },
      },
    ],
    computeSummaries: (rows) => {
      const totalItems = rows.length;
      const totalUnits = rows.reduce((acc, r) => acc + (r.stockSummary?.remainingQuantity ?? 0), 0);
      const lowStockCount = rows.filter(
        (r) => (r.stockSummary?.remainingQuantity ?? 0) <= (r.minimumStock ?? 0),
      ).length;
      return [
        { label: 'Catalog Items', value: formatNumber(totalItems) },
        { label: 'Total Available Units', value: formatNumber(totalUnits) },
        {
          label: 'Low Stock Alerts',
          value: formatNumber(lowStockCount),
          highlight: lowStockCount > 0,
          tone: lowStockCount > 0 ? 'danger' : 'success',
        },
      ];
    },
  },

  'stock-in': {
    id: 'stock-in',
    title: 'Stock In (Goods Received) Ledger',
    subtitle: 'Official audit log of all vendor deliveries and received inventory items',
    documentRefPrefix: 'AMU-RPT-IN',
    columns: [
      {
        id: 'transactionCode',
        label: 'Transaction Code',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.transactionCode,
      },
      {
        id: 'createdAt',
        label: 'Received Date',
        align: 'center',
        defaultVisible: true,
        getValue: (r) => r.createdAt,
        formatPrint: (r) => formatDate(r.createdAt),
      },
      {
        id: 'materialCode',
        label: 'Item Code',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.material?.materialCode || '—',
      },
      {
        id: 'materialName',
        label: 'Material Name',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.material?.name || '—',
      },
      {
        id: 'supplier',
        label: 'Supplier / Vendor',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.supplier?.name || '—',
      },
      {
        id: 'quantity',
        label: 'Received Qty',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.quantity,
        formatPrint: (r) => `${formatNumber(r.quantity)} ${r.material?.unit || ''}`.trim(),
      },
      {
        id: 'unitPrice',
        label: 'Unit Price',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.unitPrice,
        formatPrint: (r) => formatCurrency(r.unitPrice),
      },
      {
        id: 'totalValue',
        label: 'Total Value',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => (r.unitPrice ? Number(r.unitPrice) * r.quantity : null),
        formatPrint: (r) =>
          r.unitPrice ? formatCurrency(Number(r.unitPrice) * r.quantity) : '—',
      },
      {
        id: 'issuedBy',
        label: 'Received By',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.issuedBy?.fullName || '—',
      },
      {
        id: 'remarks',
        label: 'Remarks / Notes',
        align: 'left',
        defaultVisible: false,
        getValue: (r) => r.remarks || r.purpose || '—',
      },
    ],
    computeSummaries: (rows) => {
      const totalReceipts = rows.length;
      const totalQty = rows.reduce((acc, r) => acc + (r.quantity ?? 0), 0);
      const totalValuation = rows.reduce(
        (acc, r) => acc + (r.unitPrice ? Number(r.unitPrice) * r.quantity : 0),
        0,
      );
      return [
        { label: 'Total Shipments', value: formatNumber(totalReceipts) },
        { label: 'Total Quantity Received', value: formatNumber(totalQty) },
        { label: 'Total Valuation', value: formatCurrency(totalValuation), highlight: true },
      ];
    },
  },

  'stock-out': {
    id: 'stock-out',
    title: 'Stock Out & Material Issuance Ledger',
    subtitle: 'Institutional record of all materials disbursed to departments and faculty members',
    documentRefPrefix: 'AMU-RPT-OUT',
    columns: [
      {
        id: 'transactionCode',
        label: 'Transaction Code',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.transactionCode,
      },
      {
        id: 'createdAt',
        label: 'Issuance Date',
        align: 'center',
        defaultVisible: true,
        getValue: (r) => r.createdAt,
        formatPrint: (r) => formatDate(r.createdAt),
      },
      {
        id: 'materialCode',
        label: 'Item Code',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.material?.materialCode || '—',
      },
      {
        id: 'materialName',
        label: 'Material Name',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.material?.name || '—',
      },
      {
        id: 'department',
        label: 'Department',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.department?.name || '—',
      },
      {
        id: 'employee',
        label: 'Issued To (Employee)',
        align: 'left',
        defaultVisible: true,
        getValue: (r) =>
          r.employee
            ? `${r.employee.fullName}${r.employee.employeeCode ? ` (${r.employee.employeeCode})` : ''}`
            : '—',
      },
      {
        id: 'quantity',
        label: 'Issued Qty',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.quantity,
        formatPrint: (r) => `${formatNumber(r.quantity)} ${r.material?.unit || ''}`.trim(),
      },
      {
        id: 'issuedBy',
        label: 'Disbursed By',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.issuedBy?.fullName || '—',
      },
      {
        id: 'approvedBy',
        label: 'Approved By',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.approvedBy?.fullName || '—',
      },
      {
        id: 'purpose',
        label: 'Purpose',
        align: 'left',
        defaultVisible: false,
        getValue: (r) => r.purpose || '—',
      },
    ],
    computeSummaries: (rows) => {
      const totalTransactions = rows.length;
      const totalUnits = rows.reduce((acc, r) => acc + (r.quantity ?? 0), 0);
      const uniqueDepts = new Set(rows.map((r) => r.department?.name).filter(Boolean)).size;
      return [
        { label: 'Issuance Dispatches', value: formatNumber(totalTransactions) },
        { label: 'Units Disbursed', value: formatNumber(totalUnits) },
        { label: 'Beneficiary Departments', value: formatNumber(uniqueDepts) },
      ];
    },
  },

  'material-balance': {
    id: 'material-balance',
    title: 'Material Balance & Stock Audit Statement',
    subtitle: 'Periodic material inventory audit statement comparing receipts, issuances, and balance',
    documentRefPrefix: 'AMU-RPT-BAL',
    columns: [
      {
        id: 'materialCode',
        label: 'Item Code',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.materialCode,
      },
      {
        id: 'materialName',
        label: 'Material Name',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.materialName || r.name,
      },
      {
        id: 'category',
        label: 'Category',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.category || '—',
      },
      {
        id: 'unit',
        label: 'Unit',
        align: 'center',
        defaultVisible: true,
        getValue: (r) => r.unit || '—',
      },
      {
        id: 'quantityReceived',
        label: 'Cumulative Received',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.quantityReceived ?? 0,
        formatPrint: (r) => formatNumber(r.quantityReceived ?? 0),
      },
      {
        id: 'quantityIssued',
        label: 'Cumulative Issued',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.quantityIssued ?? 0,
        formatPrint: (r) => formatNumber(r.quantityIssued ?? 0),
      },
      {
        id: 'remainingQuantity',
        label: 'Physical Balance',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.remainingQuantity ?? 0,
        formatPrint: (r) => formatNumber(r.remainingQuantity ?? 0),
      },
      {
        id: 'status',
        label: 'Audit Status',
        align: 'center',
        defaultVisible: true,
        getValue: (r) => r.status || (r.remainingQuantity <= 5 ? 'LOW_STOCK' : 'HEALTHY'),
      },
    ],
    computeSummaries: (rows) => {
      const totalSKUs = rows.length;
      const totalRec = rows.reduce((acc, r) => acc + (r.quantityReceived ?? 0), 0);
      const totalIss = rows.reduce((acc, r) => acc + (r.quantityIssued ?? 0), 0);
      const netBalance = rows.reduce((acc, r) => acc + (r.remainingQuantity ?? 0), 0);
      return [
        { label: 'Total Materials Audited', value: formatNumber(totalSKUs) },
        { label: 'Cumulative Inflow', value: formatNumber(totalRec) },
        { label: 'Cumulative Outflow', value: formatNumber(totalIss) },
        { label: 'Net In-Store Balance', value: formatNumber(netBalance), highlight: true },
      ];
    },
  },

  'low-stock': {
    id: 'low-stock',
    title: 'Low Stock & Reorder Shortage Report',
    subtitle: 'Emergency replenishment report showing all items currently at or below minimum safety levels',
    documentRefPrefix: 'AMU-RPT-LOW',
    columns: [
      {
        id: 'materialCode',
        label: 'Item Code',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.materialCode,
      },
      {
        id: 'name',
        label: 'Material Name',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.name,
      },
      {
        id: 'category',
        label: 'Category',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.category || '—',
      },
      {
        id: 'unit',
        label: 'Unit',
        align: 'center',
        defaultVisible: true,
        getValue: (r) => r.unit || '—',
      },
      {
        id: 'location',
        label: 'Storage Location',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.location || '—',
      },
      {
        id: 'remainingQuantity',
        label: 'Current Balance',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.remainingQuantity ?? 0,
        formatPrint: (r) => formatNumber(r.remainingQuantity ?? 0),
      },
      {
        id: 'minimumStock',
        label: 'Min Safety Level',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.minimumStock ?? 0,
        formatPrint: (r) => formatNumber(r.minimumStock ?? 0),
      },
      {
        id: 'reorderShortage',
        label: 'Reorder Deficit',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.reorderShortage ?? Math.max(0, (r.minimumStock ?? 0) - (r.remainingQuantity ?? 0)),
        formatPrint: (r) =>
          formatNumber(
            r.reorderShortage ?? Math.max(0, (r.minimumStock ?? 0) - (r.remainingQuantity ?? 0)),
          ),
      },
    ],
    computeSummaries: (rows) => {
      const criticalCount = rows.length;
      const totalDeficit = rows.reduce(
        (acc, r) =>
          acc +
          (r.reorderShortage ?? Math.max(0, (r.minimumStock ?? 0) - (r.remainingQuantity ?? 0))),
        0,
      );
      return [
        {
          label: 'Critical Shortage Items',
          value: formatNumber(criticalCount),
          highlight: criticalCount > 0,
          tone: 'danger',
        },
        { label: 'Total Replenishment Deficit', value: `${formatNumber(totalDeficit)} Units`, highlight: true },
      ];
    },
  },

  'employee-issue': {
    id: 'employee-issue',
    title: 'Departmental & Staff Material Issuance Ledger',
    subtitle: 'Employee-wise item disbursement summary for departmental asset tracking',
    documentRefPrefix: 'AMU-RPT-EMP',
    columns: [
      {
        id: 'transactionCode',
        label: 'Transaction Ref',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.transactionCode,
      },
      {
        id: 'createdAt',
        label: 'Date',
        align: 'center',
        defaultVisible: true,
        getValue: (r) => r.createdAt,
        formatPrint: (r) => formatDate(r.createdAt),
      },
      {
        id: 'employeeCode',
        label: 'Staff ID',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.employee?.employeeCode || '—',
      },
      {
        id: 'employeeName',
        label: 'Employee Name',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.employee?.fullName || '—',
      },
      {
        id: 'department',
        label: 'Department',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.employee?.department?.name || r.department?.name || '—',
      },
      {
        id: 'materialName',
        label: 'Material Issued',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.material?.name || '—',
      },
      {
        id: 'quantity',
        label: 'Quantity',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.quantity,
        formatPrint: (r) => `${formatNumber(r.quantity)} ${r.material?.unit || ''}`.trim(),
      },
      {
        id: 'issuedBy',
        label: 'Storekeeper',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.issuedBy?.fullName || '—',
      },
    ],
    computeSummaries: (rows) => {
      const totalIssues = rows.length;
      const totalUnits = rows.reduce((acc, r) => acc + (r.quantity ?? 0), 0);
      const uniqueStaff = new Set(rows.map((r) => r.employee?.fullName).filter(Boolean)).size;
      return [
        { label: 'Disbursement Events', value: formatNumber(totalIssues) },
        { label: 'Total Units Issued', value: formatNumber(totalUnits) },
        { label: 'Staff Recipients', value: formatNumber(uniqueStaff) },
      ];
    },
  },

  supplier: {
    id: 'supplier',
    title: 'Registered Vendor & Supplier Delivery Summary',
    subtitle: 'Institutional directory of contracted suppliers and fulfillment performance metrics',
    documentRefPrefix: 'AMU-RPT-SUP',
    columns: [
      {
        id: 'supplierCode',
        label: 'Vendor Code',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.supplierCode,
      },
      {
        id: 'supplierName',
        label: 'Company / Vendor Name',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.supplierName || r.name,
      },
      {
        id: 'contactPerson',
        label: 'Contact Person',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.contactPerson || '—',
      },
      {
        id: 'phone',
        label: 'Telephone',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.phone || '—',
      },
      {
        id: 'email',
        label: 'Email',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.email || '—',
      },
      {
        id: 'totalSupplies',
        label: 'Shipment Batches',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.totalSupplies ?? 0,
        formatPrint: (r) => formatNumber(r.totalSupplies ?? 0),
      },
      {
        id: 'totalItemsSupplied',
        label: 'Total Units Supplied',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.totalItemsSupplied ?? 0,
        formatPrint: (r) => formatNumber(r.totalItemsSupplied ?? 0),
      },
    ],
    computeSummaries: (rows) => {
      const totalVendors = rows.length;
      const totalShipments = rows.reduce((acc, r) => acc + (r.totalSupplies ?? 0), 0);
      const totalUnits = rows.reduce((acc, r) => acc + (r.totalItemsSupplied ?? 0), 0);
      return [
        { label: 'Registered Vendors', value: formatNumber(totalVendors) },
        { label: 'Completed Deliveries', value: formatNumber(totalShipments) },
        { label: 'Delivered Items Volume', value: formatNumber(totalUnits), highlight: true },
      ];
    },
  },

  'transaction-history': {
    id: 'transaction-history',
    title: 'Master Inventory Movement Audit Ledger',
    subtitle: 'Comprehensive chronologically recorded ledger of all university store transactions',
    documentRefPrefix: 'AMU-RPT-LED',
    columns: [
      {
        id: 'transactionCode',
        label: 'Reference Code',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.transactionCode,
      },
      {
        id: 'createdAt',
        label: 'Timestamp',
        align: 'center',
        defaultVisible: true,
        getValue: (r) => r.createdAt,
        formatPrint: (r) => formatDateTime(r.createdAt),
      },
      {
        id: 'type',
        label: 'Movement Type',
        align: 'center',
        defaultVisible: true,
        getValue: (r) => r.type,
      },
      {
        id: 'materialName',
        label: 'Material Name',
        align: 'left',
        defaultVisible: true,
        getValue: (r) =>
          r.material ? `${r.material.name} (${r.material.materialCode})` : '—',
      },
      {
        id: 'quantity',
        label: 'Quantity',
        align: 'right',
        defaultVisible: true,
        getValue: (r) => r.quantity,
        formatPrint: (r) => `${formatNumber(r.quantity)} ${r.material?.unit || ''}`.trim(),
      },
      {
        id: 'party',
        label: 'Beneficiary / Supplier',
        align: 'left',
        defaultVisible: true,
        getValue: (r) =>
          r.department?.name || r.supplier?.name || r.employee?.fullName || 'Internal Store',
      },
      {
        id: 'issuedBy',
        label: 'Executed By',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.issuedBy?.fullName || '—',
      },
      {
        id: 'remarks',
        label: 'Purpose / Remarks',
        align: 'left',
        defaultVisible: true,
        getValue: (r) => r.remarks || r.purpose || '—',
      },
    ],
    computeSummaries: (rows) => {
      const totalLedgerEvents = rows.length;
      const stockInCount = rows.filter((r) => r.type === 'STOCK_IN').length;
      const stockOutCount = rows.filter((r) => r.type === 'STOCK_OUT').length;
      const adjustCount = rows.filter(
        (r) => r.type === 'ADJUSTMENT' || r.type === 'TRANSFER' || r.type === 'RETURN',
      ).length;
      return [
        { label: 'Total Ledger Events', value: formatNumber(totalLedgerEvents) },
        { label: 'Stock Receipts (IN)', value: formatNumber(stockInCount), tone: 'success' },
        { label: 'Stock Issues (OUT)', value: formatNumber(stockOutCount), tone: 'warning' },
        { label: 'Adjustments / Returns', value: formatNumber(adjustCount) },
      ];
    },
  },
};
