import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { BarChart3, FileSpreadsheet, Printer, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

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
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center py-16 space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          System inventory reports, valuation audits, and data exports are restricted to Store Management, Storekeeper, Internal Auditor, and System Administrator roles.
        </p>
      </div>
    );
  }

  const reportTitles: Record<string, string> = {
    'current-stock': '1. Current Stock Report',
    'stock-in': '2. Stock In Report (Materials Received)',
    'stock-out': '3. Stock Out Report (Materials Issued)',
    'material-balance': '4. Material Balance Report',
    'low-stock': '5. Low Stock Alert Report',
    'employee-issue': '6. Employee Material Issue Report',
    supplier: '7. Supplier Summary Report',
    'transaction-history': '8. Complete Inventory Transaction History Report',
  };

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
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" /> Inventory Reports Hub
          </h1>
          <p className="text-sm text-slate-500">
            Generate, inspect, and export all 8 official store management inventory reports
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel / CSV
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-slate-700 transition-colors"
          >
            <Printer className="h-4 w-4" /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* Report Selector Bar */}
      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm border border-slate-200 print:hidden">
        {Object.entries(reportTitles).map(([key, title]) => (
          <button
            key={key}
            onClick={() => setReportType(key as any)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              reportType === key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {title.split(' (')[0]}
          </button>
        ))}
      </div>

      {/* Report Paper Container */}
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{reportTitles[reportType]}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Generated on: {new Date().toLocaleString()} | Official Store Record
            </p>
          </div>
          <div className="text-right">
            <span className="font-bold text-indigo-600 text-sm">Store Management System</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Generating report...</div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No records found for this report.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
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
                  <tr key={idx} className="hover:bg-slate-50">
                    {Object.values(row).map((val: any, cIdx: number) => (
                      <td key={cIdx} className="px-4 py-3 text-xs">
                        {typeof val === 'object' && val !== null
                          ? JSON.stringify(val)
                          : String(val ?? 'N/A')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
