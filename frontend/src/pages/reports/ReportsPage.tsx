import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  ShieldAlert,
  Boxes,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Users,
  Truck,
  History,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isRequester = user?.role === 'REQUESTER';

  const [reportType, setReportType] = useState<
    | 'current-stock'
    | 'stock-in'
    | 'stock-out'
    | 'material-balance'
    | 'low-stock'
    | 'employee-issue'
    | 'supplier'
    | 'transaction-history'
  >('current-stock');

  const { data, isLoading } = useQuery({
    queryKey: ['report', reportType],
    queryFn: async () => {
      const res = await api.get(`/reports/${reportType}`);
      return res.data.data ?? res.data;
    },
    enabled: !isRequester,
  });

  if (isRequester) {
    return (
      <div className="rounded-3xl bg-white p-12 shadow-sm border border-slate-200 text-center py-20 space-y-4 max-w-lg mx-auto mt-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-50 text-coral-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Reports Access Restricted</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          System inventory reports, valuation audits, and data exports are reserved for Store Managers, Storekeepers, Internal Auditors, and System Administrators.
        </p>
      </div>
    );
  }

  const reportConfigs: Record<
    string,
    { title: string; subtitle: string; icon: React.ElementType }
  > = {
    'current-stock': {
      title: 'Current Stock Report',
      subtitle: 'Complete list of all active materials and available store balances',
      icon: Package,
    },
    'stock-in': {
      title: 'Stock In Report (Receipts)',
      subtitle: 'Audit record of all materials received from suppliers and vendors',
      icon: ArrowDownLeft,
    },
    'stock-out': {
      title: 'Stock Out Report (Issuances)',
      subtitle: 'Record of materials disbursed to university departments and employees',
      icon: ArrowUpRight,
    },
    'material-balance': {
      title: 'Material Balance & Valuation',
      subtitle: 'Real-time stock balance audit report with unit valuations',
      icon: Layers,
    },
    'low-stock': {
      title: 'Low Stock Alert Report',
      subtitle: 'All items currently at or below minimum reorder thresholds',
      icon: AlertTriangle,
    },
    'employee-issue': {
      title: 'Employee Material Issuance',
      subtitle: 'Material disbursement history grouped by employee and department',
      icon: Users,
    },
    supplier: {
      title: 'Supplier Performance Summary',
      subtitle: 'Overview of registered vendors and shipment delivery tallies',
      icon: Truck,
    },
    'transaction-history': {
      title: 'Complete Inventory Transaction Ledger',
      subtitle: 'Master chronologically-sorted audit trail of all store movements',
      icon: History,
    },
  };

  const currentConfig = reportConfigs[reportType];
  const CurrentIcon = currentConfig.icon;

  // Export to CSV / Excel helper
  const handleExportCSV = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => `"${typeof val === 'object' ? JSON.stringify(val) : val}"`)
        .join(','),
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const rowsCount = Array.isArray(data) ? data.length : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="print:hidden">
        <PageHeader
          title="Official Inventory Reports & Audit Hub"
          description="Generate, inspect, and export all 8 official Arba Minch University store management reports."
          icon={BarChart3}
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Reports Hub' }]}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleExportCSV}
                disabled={rowsCount === 0}
                leftIcon={<FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              >
                Export CSV / Excel
              </Button>
              <Button
                variant="primary"
                onClick={handlePrintPDF}
                leftIcon={<Printer className="h-4 w-4" />}
              >
                Print / Export PDF
              </Button>
            </div>
          }
        />
      </div>

      {/* Report Selector Pills Bar */}
      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-xs border border-slate-200/90 print:hidden">
        {Object.entries(reportConfigs).map(([key, config]) => {
          const Icon = config.icon;
          const isSelected = reportType === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setReportType(key as any)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
              <span>{config.title.split(' (')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Official Report Document Paper */}
      <Card className="p-8 space-y-6">
        {/* Letterhead Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1 shadow-md border border-slate-200 shrink-0">
              <img src="/amu-logo.png" alt="Arba Minch University Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-teal-700 mb-1">
                Arba Minch University &bull; Central ICT & Resource Store
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">{currentConfig.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{currentConfig.subtitle}</p>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              <span>{rowsCount} Records Listed</span>
            </div>
            <p className="text-[10px] font-medium text-slate-400">
              Generated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-slate-500">Compiling report data...</p>
          </div>
        ) : !data || rowsCount === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No records found"
            description="There is no transaction or inventory data available for this report type."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  {Object.keys(data[0]).map((col) => (
                    <th key={col} className="px-4 py-3">
                      {col.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    {Object.values(row).map((val: any, cIdx: number) => (
                      <td key={cIdx} className="px-4 py-3">
                        {typeof val === 'object' && val !== null ? (
                          <span className="font-mono text-[10px] text-slate-500">
                            {JSON.stringify(val)}
                          </span>
                        ) : typeof val === 'number' ? (
                          <span className="font-bold text-slate-900">{val}</span>
                        ) : (
                          <span className="font-medium text-slate-700">{String(val ?? 'N/A')}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Official Footer */}
        {rowsCount > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-400 font-medium">
            <span>Official Computer-Generated Store Audit Document</span>
            <span>Arba Minch University &copy; 2026</span>
          </div>
        )}
      </Card>
    </div>
  );
}

