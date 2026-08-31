import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Building2,
  Plus,
  Package,
  Mail,
  Phone,
  MapPin,
  User,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Label, Textarea, SearchInput } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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

  const canManage = user?.role === 'ADMINISTRATOR' || user?.role === 'STORE_MANAGER';

  const filteredSuppliers = (suppliers || []).filter((s: any) => {
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.supplierCode?.toLowerCase().includes(q) ||
      s.contactPerson?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Supplier & Vendor Directory"
        description="Manage approved university suppliers, commercial vendor profiles, and delivery receipt records."
        icon={Truck}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Suppliers Directory' }]}
        actions={
          canManage && (
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Register Supplier
            </Button>
          )
        }
      />

      {/* Search Toolbar */}
      <Card className="p-4">
        <div className="max-w-md">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search suppliers by name, code, contact person..."
          />
        </div>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-slate-500">Loading registered suppliers...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Truck}
            title="No suppliers found"
            description={
              search
                ? 'No vendors matched your search keyword.'
                : 'No external vendors or suppliers have been registered yet.'
            }
            action={
              canManage ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Register Supplier
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supp: any) => (
            <Card
              key={supp.id}
              className="flex flex-col justify-between hover:border-teal-300 hover:shadow-md transition-all group"
            >
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                    {supp.supplierCode}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Package className="h-3 w-3 text-teal-600" />
                    {supp._count?.transactions ?? 0} Shipments
                  </span>
                </div>
              </CardHeader>

              <CardBody className="py-4 space-y-3.5 flex-1">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{supp.name}</h3>
                  {supp.contactPerson && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{supp.contactPerson}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {supp.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700">{supp.phone}</span>
                    </div>
                  )}
                  {supp.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{supp.email}</span>
                    </div>
                  )}
                  {supp.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{supp.address}</span>
                    </div>
                  )}
                  {!supp.phone && !supp.email && !supp.address && (
                    <span className="italic text-slate-400">No additional contact details</span>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Register Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Vendor"
        description="Add a new commercial supplier or vendor for store inventory purchases."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label required>Supplier Code</Label>
            <Input
              required
              placeholder="e.g. SUP-003"
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
            />
          </div>

          <div>
            <Label required>Company / Vendor Name</Label>
            <Input
              required
              placeholder="e.g. Ethio Furniture & Lab Supplies PLC"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Contact Person</Label>
              <Input
                placeholder="e.g. Ato Mulugeta Kebede"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="+251 91 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="contact@supplier.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label>Office / Physical Address</Label>
            <Input
              placeholder="e.g. Arba Minch Main Road, Near Campus Gate"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
              isLoading={createMutation.isPending}
            >
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

