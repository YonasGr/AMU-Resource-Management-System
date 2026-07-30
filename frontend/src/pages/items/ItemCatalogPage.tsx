import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Package } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Label } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface Category {
  id: string;
  name: string;
}
interface Item {
  id: string;
  name: string;
  unit: string;
  serialRequired: boolean;
  assetType: string;
  status: string;
  category: Category;
}

export default function ItemCatalogPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('piece');
  const [newCategoryId, setNewCategoryId] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['item-categories'],
    queryFn: async () => (await api.get<{ data: Category[] }>('/item-categories')).data.data,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['items', search, categoryId],
    queryFn: async () =>
      (
        await api.get<{ data: Item[] }>('/items', {
          params: { search: search || undefined, categoryId: categoryId || undefined },
        })
      ).data.data,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/items', { name: newName, unit: newUnit, categoryId: newCategoryId }),
    onSuccess: () => {
      setNewName('');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Item Catalog"
        description="One shared catalog across the whole university — store-level quantities live under Inventory."
        actions={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> New item
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label>Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Whiteboard Marker" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="piece, box, liter…" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)}>
                  <option value="">Select a category…</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button
                size="sm"
                disabled={!newName || !newUnit || !newCategoryId || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create item
              </Button>
              {createMutation.isError && (
                <span className="text-sm text-danger">
                  {(createMutation.error as any)?.response?.data?.message ?? 'Could not create item.'}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder="Search items by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-56">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        {isLoading && <p className="py-8 text-center text-sm text-muted">Loading catalog…</p>}
        {items?.length === 0 && (
          <EmptyState icon={Package} title="No items found" description="Try a different search term or category." />
        )}
        {items && items.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Unit</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                  <td className="px-5 py-3 font-medium text-ink">
                    {item.name}
                    {item.serialRequired && <Badge tone="accent" className="ml-2">serial tracked</Badge>}
                  </td>
                  <td className="px-5 py-3 text-muted">{item.category?.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{item.unit}</td>
                  <td className="px-5 py-3 text-muted">{item.assetType}</td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
