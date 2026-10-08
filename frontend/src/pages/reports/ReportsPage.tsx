import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  ShieldAlert,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  AlertTriangle,
  Users,
  Truck,
  History,
  SlidersHorizontal,
  RotateCcw,
  CheckSquare,
  Building2,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, statusTone } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchInput } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  REPORT_CONFIGS,
  ReportType,
  ColumnDef,
  SummaryMetric,
} from './reportDefinitions';

const REPORT_ICONS: Record<ReportType, React.ElementType> = {
  'current-stock': Package,
  'stock-in': ArrowDownLeft,
  'stock-out': ArrowUpRight,
  'material-balance': Layers,
  'low-stock': AlertTriangle,
  'employee-issue': Users,
  'supplier': Truck,
  'transaction-history': History,
};

const REPORT_KEYS: ReportType[] = [
  'current-stock',
  'stock-in',
  'stock-out',
  'material-balance',
  'low-stock',
  'employee-issue',
  'supplier',
  'transaction-history',
];

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isRequester = user?.role === 'REQUESTER';

  const [reportType, setReportType] = useState<ReportType>('current-stock');
  const [columnPreferences, setColumnPreferences] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  const currentConfig = REPORT_CONFIGS[reportType];

  const { data, isLoading } = useQuery({
    queryKey: ['report', reportType],
    queryFn: async () => {
      const res = await api.get(`/reports/${reportType}`);
      return res.data.data ?? res.data;
    },
    enabled: !isRequester,
  });

  // Calculate active visible columns based on user preferences or defaults
  const activeColumns = useMemo(() => {
    const prefs = columnPreferences[reportType];
    return currentConfig.columns.filter((col) => {
      if (prefs && prefs[col.id] !== undefined) {
        return prefs[col.id];
      }
      return col.defaultVisible !== false;
    });
  }, [currentConfig, columnPreferences, reportType]);

  const toggleColumn = (colId: string) => {
    setColumnPreferences((prev) => {
      const currentPrefs = prev[reportType] || {};
      const currentlyVisible =
        currentPrefs[colId] ??
        (currentConfig.columns.find((c) => c.id === colId)?.defaultVisible !== false);

      // Prevent deselecting if it's the last remaining column
      if (currentlyVisible && activeColumns.length <= 1) {
        return prev;
      }

      return {
        ...prev,
        [reportType]: {
          ...currentPrefs,
          [colId]: !currentlyVisible,
        },
      };
    });
  };

  const selectAllColumns = () => {
    setColumnPreferences((prev) => {
      const all = currentConfig.columns.reduce<Record<string, boolean>>((acc, col) => {
        acc[col.id] = true;
        return acc;
      }, {});
      return {
        ...prev,
        [reportType]: all,
      };
    });
  };

  const resetDefaultColumns = () => {
    setColumnPreferences((prev) => {
      const defaults = currentConfig.columns.reduce<Record<string, boolean>>((acc, col) => {
        acc[col.id] = col.defaultVisible !== false;
        return acc;
      }, {});
      return {
        ...prev,
        [reportType]: defaults,
      };
    });
  };

  const reportRows: any[] = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Real-time search filter matching visible column content
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reportRows;

    return reportRows.filter((row) => {
      return activeColumns.some((col) => {
        const displayVal = col.formatPrint ? col.formatPrint(row) : col.getValue(row);
        if (displayVal === null || displayVal === undefined) return false;
        return String(displayVal).toLowerCase().includes(q);
      });
    });
  }, [reportRows, searchQuery, activeColumns]);

  // Dynamic KPI summaries calculated from filtered data
  const summaries: SummaryMetric[] = useMemo(() => {
    try {
      return currentConfig.computeSummaries(filteredRows);
    } catch (err) {
      console.error('Failed to calculate report metrics:', err);
      return [];
    }
  }, [currentConfig, filteredRows]);

  // Clean UTF-8 CSV Export honoring active selected columns
  const handleExportCSV = () => {
    if (filteredRows.length === 0 || activeColumns.length === 0) return;

    const escapeCSV = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headerRow = activeColumns.map((col) => escapeCSV(col.label)).join(',');
    const dataRows = filteredRows.map((row) =>
      activeColumns
        .map((col) => {
          const val = col.formatPrint ? col.formatPrint(row) : col.getValue(row);
          return escapeCSV(val);
        })
        .join(','),
    );

    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `AMU_${reportType.toUpperCase()}_REPORT_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handlePrint = () => {
    window.print();
  };

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

  const renderCellContent = (col: ColumnDef, row: any) => {
    if (col.renderCell) {
      return col.renderCell(row);
    }
    const rawValue = col.getValue(row);
    if (col.id === 'status' || col.id === 'stockHealth') {
      const text = String(rawValue ?? '');
      return (
        <Badge tone={statusTone(text)} withDot={true}>
          {text}
        </Badge>
      );
    }
    if (col.id === 'type') {
      const text = String(rawValue ?? '');
      return (
        <Badge tone={statusTone(text)} withDot={false}>
          {text}
        </Badge>
      );
    }
    if (col.formatPrint) {
      return col.formatPrint(row);
    }
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return <span className="text-slate-300 font-normal">—</span>;
    }
    return String(rawValue);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Screen Page Header */}
      <div className="print:hidden">
        <PageHeader
          title="Official Inventory Reports & Audit Hub"
          description="Generate, inspect, customize, and export official Arba Minch University store management reports."
          icon={BarChart3}
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Reports Hub' }]}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => setIsColumnModalOpen(true)}
                leftIcon={<SlidersHorizontal className="h-4 w-4 text-teal-600" />}
              >
                Columns ({activeColumns.length}/{currentConfig.columns.length})
              </Button>
              <Button
                variant="secondary"
                onClick={handleExportCSV}
                disabled={filteredRows.length === 0}
                leftIcon={<FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              >
                Export CSV
              </Button>
              <Button
                variant="primary"
                onClick={handlePrint}
                disabled={isLoading || filteredRows.length === 0}
                leftIcon={<Printer className="h-4 w-4" />}
              >
                Print / Export PDF
              </Button>
            </div>
          }
        />
      </div>

      {/* Report Selector Pill Bar */}
      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-xs border border-slate-200/90 print:hidden">
        {REPORT_KEYS.map((key) => {
          const config = REPORT_CONFIGS[key];
          const Icon = REPORT_ICONS[key] || Package;
          const isSelected = reportType === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setReportType(key);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
              <span>{config.title.split(' ')[0]} {config.title.includes('Stock In') ? 'Stock In' : config.title.includes('Stock Out') ? 'Stock Out' : ''}</span>
            </button>
          );
        })}
      </div>

      {/* Screen Control Bar: Search & Status Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 print:hidden">
        <div className="max-w-md w-full">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder={`Search across ${activeColumns.length} active columns...`}
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          {searchQuery && (
            <span className="rounded-lg bg-teal-50 px-2.5 py-1 font-semibold text-teal-700 border border-teal-200/60">
              Filtered: {filteredRows.length} of {reportRows.length} rows
            </span>
          )}
          <span>
            Total: <strong className="text-slate-800">{reportRows.length}</strong> records
          </span>
        </div>
      </div>

      {/* Screen KPI Metric Cards */}
      {summaries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          {summaries.map((summary, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-5 shadow-xs bg-white transition-all ${
                summary.highlight
                  ? 'border-teal-300 ring-2 ring-teal-500/10'
                  : 'border-slate-200/90'
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {summary.label}
              </p>
              <p
                className={`mt-2 text-2xl font-black tracking-tight ${
                  summary.tone === 'danger'
                    ? 'text-coral-600'
                    : summary.tone === 'warning'
                    ? 'text-amber-600'
                    : summary.tone === 'success'
                    ? 'text-emerald-600'
                    : 'text-slate-900'
                }`}
              >
                {summary.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Official Report Document Paper (Screen Card + Print Canvas) */}
      <Card id="print-report" className="report-paper p-8 space-y-6">
        {/* Arba Minch University Official Letterhead Header */}
        <div className="print-letterhead border-b-2 border-slate-900 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl bg-white p-1.5 shadow-xs border border-slate-200 shrink-0">
                <img
                  src="/amu-logo.png"
                  alt="Arba Minch University"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-teal-800 mb-0.5">
                  Arba Minch University &bull; አርባ ምንጭ ዩኒቨርሲቲ
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Vice President for Administration &bull; Central ICT & Resource Directorate
                </div>
                <h1 className="text-xl font-black text-slate-900 mt-1">
                  {currentConfig.title}
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {currentConfig.subtitle}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1 shrink-0">
              <div className="inline-block rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-black tracking-wide text-slate-800 border border-slate-200/80">
                {currentConfig.documentRefPrefix}-{new Date().getFullYear()}-{String(new Date().getMonth() + 1).padStart(2, '0')}-{String(new Date().getDate()).padStart(2, '0')}
              </div>
              <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                Official Store Audit Statement
              </p>
            </div>
          </div>

          {/* Letterhead Document Metadata Bar */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Document Ref
              </span>
              <span className="font-bold text-slate-800 font-mono text-[11px]">
                {currentConfig.documentRefPrefix}-AUDIT
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Date & Time
              </span>
              <span className="font-semibold text-slate-800">
                {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Generated By
              </span>
              <span className="font-semibold text-slate-800">
                {user?.fullName || 'Inventory Officer'} ({user?.role?.replace(/_/g, ' ') || 'Staff'})
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Record Count
              </span>
              <span className="font-semibold text-slate-800">
                {searchQuery
                  ? `${filteredRows.length} shown (filtered from ${reportRows.length})`
                  : `${filteredRows.length} official records`}
              </span>
            </div>
          </div>
        </div>

        {/* Executive Summary Strip in Document (Clean for Print) */}
        {summaries.length > 0 && (
          <div className="rounded-xl bg-slate-50/90 p-3.5 border border-slate-200/90 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {summaries.map((summary, idx) => (
              <div key={idx} className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  {summary.label}
                </span>
                <span
                  className={`text-base font-black ${
                    summary.tone === 'danger'
                      ? 'text-coral-600'
                      : summary.tone === 'warning'
                      ? 'text-amber-600'
                      : summary.tone === 'success'
                      ? 'text-emerald-600'
                      : 'text-slate-900'
                  }`}
                >
                  {summary.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Data Table */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-slate-500">Compiling report data...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title={searchQuery ? 'No matching records found' : 'No records found'}
            description={
              searchQuery
                ? `No records match the filter query "${searchQuery}". Clear your search or adjust column filters.`
                : 'There is no transaction or inventory data available for this report type.'
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white">
            <table className="report-printable-table min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="row-number px-3 py-2.5 text-center text-slate-500 border border-slate-200">
                    #
                  </th>
                  {activeColumns.map((col) => (
                    <th
                      key={col.id}
                      className={`px-3 py-2.5 border border-slate-200 ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="row-number px-3 py-2 text-center text-slate-400 font-semibold border border-slate-200">
                      {rowIdx + 1}
                    </td>
                    {activeColumns.map((col) => (
                      <td
                        key={col.id}
                        className={`px-3 py-2 border border-slate-200 text-slate-700 font-medium ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {renderCellContent(col, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3-Tier Formal Institutional Sign-off Block */}
        {filteredRows.length > 0 && (
          <div className="print-signature-section mt-8 pt-6 border-t-2 border-slate-900">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-3 text-xs">
              {/* Tier 1: Prepared By */}
              <div className="print-sign-box rounded-xl border border-slate-300 p-4 space-y-3 bg-white flex flex-col justify-between min-h-[125px]">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block">
                    1. Prepared By
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Storekeeper / Operator
                  </span>
                </div>
                <div className="space-y-1.5 pt-4 text-[11px] text-slate-600">
                  <div className="border-b border-dashed border-slate-400 pb-1">
                    Name: <span className="font-semibold text-slate-800">{user?.fullName || ''}</span>
                  </div>
                  <div className="border-b border-dashed border-slate-400 pb-1 pt-1">
                    Sign: _____________________
                  </div>
                  <div className="pt-1">
                    Date: <span className="font-semibold text-slate-800">{new Date().toLocaleDateString('en-US')}</span>
                  </div>
                </div>
              </div>

              {/* Tier 2: Verified By */}
              <div className="print-sign-box rounded-xl border border-slate-300 p-4 space-y-3 bg-white flex flex-col justify-between min-h-[125px]">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block">
                    2. Verified By
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Store Manager / Auditor
                  </span>
                </div>
                <div className="space-y-1.5 pt-4 text-[11px] text-slate-600">
                  <div className="border-b border-dashed border-slate-400 pb-1">
                    Name: _____________________
                  </div>
                  <div className="border-b border-dashed border-slate-400 pb-1 pt-1">
                    Sign: _____________________
                  </div>
                  <div className="pt-1">
                    Date: _____________________
                  </div>
                </div>
              </div>

              {/* Tier 3: Approved By */}
              <div className="print-sign-box rounded-xl border border-slate-300 p-4 space-y-3 bg-white flex flex-col justify-between min-h-[125px]">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block">
                    3. Approved By
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Directorate Director / VP
                  </span>
                </div>
                <div className="space-y-1.5 pt-4 text-[11px] text-slate-600">
                  <div className="border-b border-dashed border-slate-400 pb-1">
                    Name: _____________________
                  </div>
                  <div className="border-b border-dashed border-slate-400 pb-1 pt-1">
                    Sign: _____________________
                  </div>
                  <div className="pt-1">
                    Date: _____________________
                  </div>
                </div>
              </div>

              {/* Tier 4: Official Stamp Seal */}
              <div className="print-seal-box rounded-xl border-2 border-dashed border-slate-400 p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[125px]">
                <div className="rounded-full border border-slate-300 p-2 text-slate-400 mb-1">
                  <Building2 className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  Official Store Seal
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  Arba Minch University Directorate
                </span>
              </div>
            </div>

            {/* Official Legal Audit Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
              <span>
                Confidential Arba Minch University Audit Document. Valid only with authorized signatures and official directorate seal.
              </span>
              <span className="font-semibold text-slate-500">
                Arba Minch University &copy; {new Date().getFullYear()} &bull; Central Store Operations
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Column Customization Modal */}
      <Modal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-teal-600" />
            <span>Customize Report Columns</span>
          </div>
        }
        description={`Select which data fields to display on screen, include in printouts, and export to CSV for ${currentConfig.title}.`}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {activeColumns.length} of {currentConfig.columns.length} columns active
            </span>
            <Button variant="primary" onClick={() => setIsColumnModalOpen(false)}>
              Apply Columns
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200/80">
            <span className="text-xs font-bold text-slate-700">Quick Selection</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="xs"
                onClick={selectAllColumns}
                leftIcon={<CheckSquare className="h-3.5 w-3.5 text-teal-600" />}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={resetDefaultColumns}
                leftIcon={<RotateCcw className="h-3.5 w-3.5 text-slate-500" />}
              >
                Reset Defaults
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentConfig.columns.map((col) => {
              const prefs = columnPreferences[reportType] || {};
              const isChecked = prefs[col.id] ?? (col.defaultVisible !== false);
              const isOnlyOne = isChecked && activeColumns.length === 1;

              return (
                <label
                  key={col.id}
                  className={`flex items-center justify-between rounded-xl p-3 border transition-all cursor-pointer ${
                    isChecked
                      ? 'border-teal-500/40 bg-teal-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  } ${isOnlyOne ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isOnlyOne}
                      onChange={() => toggleColumn(col.id)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{col.label}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{col.id}</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-100">
                    {col.align || 'left'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
