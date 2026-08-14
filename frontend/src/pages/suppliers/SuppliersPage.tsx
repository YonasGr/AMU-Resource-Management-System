import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Building, Plus, Package } from 'lucide-react';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [supplierCode, setSupplierCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Fetch Suppliers
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/suppliers');
      return res.data.data ?? res.data;
    },
  });

  // Create Supplier Mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/suppliers', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setSupplierCode('');
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      supplierCode,
      name,
      contactPerson: contactPerson || undefined,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="h-6 w-6 text-indigo-600" /> Supplier Management
          </h1>
          <p className="text-sm text-slate-500">
            Register suppliers, manage vendor details, and track supplied materials
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" /> Register Supplier
        </button>
      </div>

      {/* Grid */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading suppliers...</div>
        ) : suppliers?.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No suppliers registered yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers?.map((supp: any) => (
              <div
                key={supp.id}
                className="rounded-xl border border-slate-200 p-5 space-y-3 hover:border-indigo-300 transition-all bg-slate-50/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                    {supp.supplierCode}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <Package className="h-3.5 w-3.5 text-slate-400" />
                    {supp._count?.transactions ?? 0} Stock In Shipments
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{supp.name}</h3>

                <div className="text-xs text-slate-600 space-y-1">
                  <p><span className="font-medium text-slate-500">Contact Person:</span> {supp.contactPerson || 'N/A'}</p>
                  <p><span className="font-medium text-slate-500">Phone:</span> {supp.phone || 'N/A'}</p>
                  <p><span className="font-medium text-slate-500">Email:</span> {supp.email || 'N/A'}</p>
                  <p><span className="font-medium text-slate-500">Address:</span> {supp.address || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Register Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Register Supplier</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUP-003"
                  value={supplierCode}
                  onChange={(e) => setSupplierCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ethio Furniture Industries"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Ato Mulugeta"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+251..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="info@supplier.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="Sub-city, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
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
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
