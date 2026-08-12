import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Label } from '../../components/ui/Input';
import {
  Box as BoxIcon,
  AlertTriangle,
  Activity,
  TrendingDown,
  ShoppingCart,
  ArrowLeftRight,
  Laptop,
  Users,
  Download,
  Eye,
} from 'lucide-react';

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: any;
  endpoint: string;
  hasDateFilter?: boolean;
  hasStoreFilter?: boolean;
  hasOrgFilter?: boolean;
}

const REPORTS: ReportConfig[] = [
  {
    id: 'inventory',
    title: 'Current Inventory',
    description: 'Snapshot of current stock levels across stores.',
    icon: BoxIcon,
    endpoint: '/reports/inventory',
  },
  {
    id: 'low-stock',
    title: 'Low Stock Alerts',
    description: 'Items currently at or below their reorder thresholds.',
    icon: AlertTriangle,
    endpoint: '/reports/low-stock',
  },
  {
    id: 'movements',
    title: 'Stock Movements',
    description: 'Detailed log of all inventory movements in a given period.',
    icon: Activity,
    endpoint: '/reports/movements',
    hasDateFilter: true,
    hasStoreFilter: true,
  },
  {
    id: 'consumption',
    title: 'Consumption Report',
    description: 'Item usage and consumption by organizational units.',
    icon: TrendingDown,
    endpoint: '/reports/consumption',
    hasDateFilter: true,
    hasOrgFilter: true,
  },
  {
    id: 'purchases',
    title: 'Purchase History',
    description: 'Goods received and purchase orders over time.',
    icon: ShoppingCart,
    endpoint: '/reports/purchases',
    hasDateFilter: true,
  },
  {
    id: 'transfers',
    title: 'Inter-store Transfers',
    description: 'Record of goods transferred between different stores.',
    icon: ArrowLeftRight,
    endpoint: '/reports/transfers',
    hasDateFilter: true,
  },
  {
    id: 'assets',
    title: 'Fixed Assets',
    description: 'Registry of all trackable fixed assets and their status.',
    icon: Laptop,
    endpoint: '/reports/assets',
  },
  {
    id: 'user-activity',
    title: 'User Activity',
    description: 'Summary of actions taken by users in the system.',
    icon: Users,
    endpoint: '/reports/user-activity',
    hasDateFilter: true,
  },
];

export default function ReportsPage() {
  const { data: stores } = useQuery({
    queryKey: ['stores-directory'],
    queryFn: async () => (await api.get<{ data: { id: string; name: string }[] }>('/stores/directory')).data.data,
  });

  const { data: orgTree } = useQuery({
    queryKey: ['org-directory'],
    queryFn: async () => (await api.get<{ data: any }>('/organization-units/tree')).data.data,
  });

  const flattenOrgs = (nodes: any[], depth = 0): { id: string; name: string; depth: number }[] => {
    if (!nodes) return [];
    const list = Array.isArray(nodes) ? nodes : [nodes];
    let result: { id: string; name: string; depth: number }[] = [];
    for (const node of list) {
      result.push({ id: node.id, name: node.name, depth });
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenOrgs(node.children, depth + 1));
      }
    }
    return result;
  };

  const orgs = orgTree ? flattenOrgs(orgTree) : [];

  return (
    <div>
      <PageHeader title="Reports" description="Generate and export system reports" />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => (
          <ReportCard key={report.id} report={report} stores={stores} orgs={orgs} />
        ))}
      </div>
    </div>
  );
}

function ReportCard({
  report,
  stores,
  orgs,
}: {
  report: ReportConfig;
  stores?: { id: string; name: string }[];
  orgs: { id: string; name: string; depth: number }[];
}) {
  const Icon = report.icon;
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [storeId, setStoreId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildParams = () => {
    const params = new URLSearchParams();
    if (report.hasDateFilter && from) params.append('from', from);
    if (report.hasDateFilter && to) params.append('to', to);
    if (report.hasStoreFilter && storeId) params.append('storeId', storeId);
    if (report.hasOrgFilter && orgId) params.append('orgId', orgId);
    return params;
  };

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: any[] }>(`${report.endpoint}?${buildParams().toString()}`);
      setPreviewData(response.data.data.slice(0, 20));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load preview');
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = buildParams();
      params.append('format', format);
      const response = await api.get(`${report.endpoint}?${params.toString()}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.id}-report.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export report');
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-ink">{report.title}</h3>
            <p className="text-sm text-muted">{report.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="flex flex-1 flex-col gap-4 border-t border-border/50 bg-surface-subtle/30 pt-4">
        {(report.hasDateFilter || report.hasStoreFilter || report.hasOrgFilter) && (
          <div className="grid gap-3">
            {report.hasDateFilter && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
            )}
            {report.hasStoreFilter && (
              <div>
                <Label className="text-xs">Store</Label>
                <Select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                  <option value="">All Stores</option>
                  {stores?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {report.hasOrgFilter && (
              <div>
                <Label className="text-xs">Organization Unit</Label>
                <Select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                  <option value="">All Units</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {'\u00A0'.repeat(o.depth * 4)}
                      {o.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={handlePreview} disabled={loading}>
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')}>
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}
      </CardBody>
      
      {previewData && (
        <div className="border-t border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted">Preview (Top 20 rows)</span>
            <button className="text-xs text-primary hover:underline" onClick={() => setPreviewData(null)}>
              Close
            </button>
          </div>
          {previewData.length === 0 ? (
            <p className="text-sm text-muted">No data found for this report.</p>
          ) : (
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle">
                  <tr>
                    {Object.keys(previewData[0] || {}).map((key) => (
                      <th key={key} className="px-3 py-2 font-medium capitalize text-muted">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewData.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-alt">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-3 py-2">
                          {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
