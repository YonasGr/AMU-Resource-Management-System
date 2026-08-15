import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Package, Plus, Search, Filter, QrCode, Tag, MapPin, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export default function MaterialsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
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

  const canManage = user?.role === 'ADMINISTRATOR';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" /> Material Catalog
          </h1>
          <p className="text-sm text-slate-500">
            Register, categorize, and track all store inventory materials
          </p>
        </div>

        {canManage && (
          <div className="flex gap-3">
            <button
              onClick={() => setIsCatModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
            >
              <Tag className="h-4 w-4" /> Add Category
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" /> Register Material
            </button>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by material code, name, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories?.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading catalog...</div>
        ) : materials?.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No materials found. Register a new material to get started.
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Code / Barcode</th>
                <th className="px-6 py-4">Material Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-center">Total Received</th>
                <th className="px-6 py-4 text-center">Issued</th>
                <th className="px-6 py-4 text-center">Remaining Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materials?.map((m: any) => {
                const remaining = m.stockSummary?.remainingQuantity ?? 0;
                const isLow = remaining <= m.minimumStock;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-900">
                      <div>{m.materialCode}</div>
                      {m.barcode && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                          <QrCode className="h-3 w-3 text-slate-400" /> {m.barcode}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{m.name}</div>
                      <div className="text-xs text-slate-500">{m.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {m.category?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {m.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" /> {m.location}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {m.stockSummary?.quantityReceived ?? 0} {m.unit}s
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-600">
                      {m.stockSummary?.quantityIssued ?? 0} {m.unit}s
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                          isLow
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isLow && <AlertCircle className="h-3.5 w-3.5" />}
                        {remaining} {m.unit}s
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Register Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Register New Material</h2>
            <form onSubmit={handleCreateMaterial} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Material Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MAT-1005"
                    value={materialCode}
                    onChange={(e) => setMaterialCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Whiteboard Markers (Box of 12)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Box, Ream, Pack"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Stock Alert *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Store Location/Shelf</label>
                  <input
                    type="text"
                    placeholder="e.g. Shelf A-04"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode / QR Code</label>
                <input
                  type="text"
                  placeholder="e.g. 8901234567899"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Specifications</label>
                <textarea
                  rows={2}
                  placeholder="Item specifications..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMaterialMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  {createMaterialMutation.isPending ? 'Registering...' : 'Register Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Add Material Category</h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cleaning & Hygiene Supplies"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Brief description..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
