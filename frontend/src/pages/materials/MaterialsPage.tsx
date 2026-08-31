import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  QrCode,
  Tag,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  ArrowUpRight,
  Boxes,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Label, Textarea, SearchInput } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export default function MaterialsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'healthy'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  // Form State
  const [materialCode, setMaterialCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Piece');
  const [minimumStock, setMinimumStock] = useState(5);
  const [location, setLocation] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Fetch Materials
  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', search, selectedCategory],
    queryFn: async () => {
      const res = await api.get('/materials', {
        params: { search, categoryId: selectedCategory || undefined },
      });
      return res.data.data ?? res.data;
    },
  });

  // Fetch Categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/materials/categories');
      return res.data.data ?? res.data;
    },
  });

  // Create Material Mutation
  const createMaterialMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/materials', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  // Create Category Mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/materials/categories', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsCatModalOpen(false);
      setNewCatName('');
      setNewCatDesc('');
    },
  });

  const resetForm = () => {
    setMaterialCode('');
    setName('');
    setUnit('Piece');
    setMinimumStock(5);
    setLocation('');
    setBarcode('');
    setDescription('');
    setCategoryId('');
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    createMaterialMutation.mutate({
      materialCode,
      name,
      unit,
      minimumStock: Number(minimumStock),
      location,
      barcode: barcode || undefined,
      description,
      categoryId,
    });
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate({ name: newCatName, description: newCatDesc });
  };

  const canManage = user?.role === 'STORE_MANAGER' || user?.role === 'ADMINISTRATOR';

  // Filter based on stock filter pill
  const filteredMaterials = (materials || []).filter((m: any) => {
    const remaining = m.stockSummary?.remainingQuantity ?? 0;
    const isLow = remaining <= m.minimumStock;
    if (stockFilter === 'low') return isLow;
    if (stockFilter === 'healthy') return !isLow;
    return true;
  });

  const totalCount = materials?.length ?? 0;
  const lowCount = (materials || []).filter(
    (m: any) => (m.stockSummary?.remainingQuantity ?? 0) <= m.minimumStock,
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Material Catalog"
        description="Register, categorize, and track real-time stock balances across all university campus stores."
        icon={Package}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Material Catalog' }]}
        actions={
          canManage && (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => setIsCatModalOpen(true)}
                leftIcon={<Tag className="h-4 w-4 text-teal-600" />}
              >
                Add Category
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Register Material
              </Button>
            </div>
          )
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Items</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Boxes className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Categories</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{categories?.length ?? 0}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <Tag className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Low Stock Alerts</p>
            <p className="text-2xl font-extrabold text-coral-600 mt-0.5">{lowCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-50 text-coral-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search by material code, name, or barcode..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category selector */}
            <div className="w-48">
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Stock status filter pills */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  stockFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('healthy')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  stockFilter === 'healthy'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Healthy ({Math.max(0, totalCount - lowCount)})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('low')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  stockFilter === 'low'
                    ? 'bg-white text-coral-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Low Stock ({lowCount})
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Materials Data Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-slate-500">Loading catalog items...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Package}
              title="No materials found"
              description={
                search || selectedCategory || stockFilter !== 'all'
                  ? 'No materials matched your filter criteria. Try adjusting your search query.'
                  : 'Your material catalog is empty. Register your first item to begin tracking stock.'
              }
              action={
                canManage ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Register Material
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/90 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-4">Item Code & Barcode</th>
                  <th className="px-6 py-4">Material Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Shelf Location</th>
                  <th className="px-6 py-4 text-center">Received</th>
                  <th className="px-6 py-4 text-center">Issued</th>
                  <th className="px-6 py-4 text-right">Stock Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map((m: any) => {
                  const remaining = m.stockSummary?.remainingQuantity ?? 0;
                  const isLow = remaining <= m.minimumStock;
                  const percent = Math.min(
                    100,
                    Math.round((remaining / (m.minimumStock || 1)) * 100),
                  );

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {m.materialCode}
                        </span>
                        {m.barcode && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-normal mt-1">
                            <QrCode className="h-3 w-3" />
                            <span>{m.barcode}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{m.name}</p>
                        <p className="text-xs text-slate-400 line-clamp-1">{m.description || 'No extra specifications'}</p>
                      </td>

                      <td className="px-6 py-4">
                        <Badge tone="teal" withDot={false}>
                          {m.category?.name || 'General'}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600">
                        {m.location ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-slate-700 border border-slate-200/60 font-medium">
                            <MapPin className="h-3 w-3 text-teal-600" />
                            {m.location}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center text-xs font-semibold text-slate-700">
                        {m.stockSummary?.quantityReceived ?? 0} {m.unit}s
                      </td>

                      <td className="px-6 py-4 text-center text-xs font-semibold text-slate-500">
                        {m.stockSummary?.quantityIssued ?? 0} {m.unit}s
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              isLow
                                ? 'bg-coral-50 text-coral-700 border border-coral-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isLow ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {remaining} {m.unit}s left
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Min: {m.minimumStock} {m.unit}s
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Register Material Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Material"
        description="Add a new consumable or fixed item to the university inventory catalog."
        size="lg"
      >
        <form onSubmit={handleCreateMaterial} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Material Code</Label>
              <Input
                required
                placeholder="e.g. MAT-1005"
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
              />
            </div>

            <div>
              <Label required>Category</Label>
              <Select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Select Category</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label required>Material Name</Label>
            <Input
              required
              placeholder="e.g. Whiteboard Markers (Box of 12)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label required>Unit of Measure</Label>
              <Input
                required
                placeholder="e.g. Piece, Box, Ream"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>

            <div>
              <Label required>Min Alert Stock</Label>
              <Input
                type="number"
                required
                min={1}
                value={minimumStock}
                onChange={(e) => setMinimumStock(Number(e.target.value))}
              />
            </div>

            <div>
              <Label>Shelf / Location</Label>
              <Input
                placeholder="e.g. Shelf A-04"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Barcode / QR Identifier</Label>
            <Input
              placeholder="e.g. 8901234567899"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>

          <div>
            <Label>Description & Technical Specifications</Label>
            <Textarea
              rows={2}
              placeholder="Detailed specifications, item grade, packaging dimensions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMaterialMutation.isPending}
            >
              Register Material
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Add Material Category"
        description="Organize materials into clear classification groups for easier filtering and reporting."
        size="md"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <Label required>Category Name</Label>
            <Input
              required
              placeholder="e.g. Cleaning & Chemical Supplies"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              placeholder="Brief description of items under this classification..."
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCatModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createCategoryMutation.isPending}
            >
              Save Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

