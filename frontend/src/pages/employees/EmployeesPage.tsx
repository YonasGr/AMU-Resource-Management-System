import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Building2,
  Plus,
  History,
  Mail,
  Phone,
  Briefcase,
  Layers,
  ArrowRight,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Label, Textarea, SearchInput } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const canRegisterEmployee = user?.role === 'ADMINISTRATOR' || user?.role === 'STORE_MANAGER';

  const [activeTab, setActiveTab] = useState<'employees' | 'departments' | 'history'>('employees');
  const [empSearch, setEmpSearch] = useState('');

  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // Form State
  const [empCode, setEmpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Queries
  const { data: employees, isLoading: loadingEmp } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data.data ?? res.data;
    },
  });

  const { data: departments, isLoading: loadingDept } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/employees/departments');
      return res.data.data ?? res.data;
    },
  });

  const { data: deptHistory } = useQuery({
    queryKey: ['dept-history', selectedDeptId],
    queryFn: async () => {
      if (!selectedDeptId) return null;
      const res = await api.get(`/employees/departments/${selectedDeptId}/issue-history`);
      return res.data.data ?? res.data;
    },
    enabled: !!selectedDeptId,
  });

  // Mutations
  const createEmpMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/employees', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsEmpModalOpen(false);
      resetEmpForm();
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/employees/departments', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsDeptModalOpen(false);
      setDeptCode('');
      setDeptName('');
      setDeptDesc('');
    },
  });

  const resetEmpForm = () => {
    setEmpCode('');
    setFullName('');
    setEmail('');
    setPhone('');
    setPosition('');
    setDepartmentId('');
  };

  const handleCreateEmp = (e: React.FormEvent) => {
    e.preventDefault();
    createEmpMutation.mutate({
      employeeCode: empCode,
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      position: position || undefined,
      departmentId,
    });
  };

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    createDeptMutation.mutate({
      code: deptCode,
      name: deptName,
      description: deptDesc || undefined,
    });
  };

  const filteredEmployees = (employees || []).filter((emp: any) => {
    const q = empSearch.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(q) ||
      emp.employeeCode?.toLowerCase().includes(q) ||
      emp.department?.name?.toLowerCase().includes(q) ||
      emp.position?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Employees & Academic Departments"
        description="Directory of university staff, department resource assignments, and issued material history."
        icon={Users}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Employees & Departments' }]}
        actions={
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                variant="secondary"
                onClick={() => setIsDeptModalOpen(true)}
                leftIcon={<Building2 className="h-4 w-4 text-teal-600" />}
              >
                Add Department
              </Button>
            )}
            {canRegisterEmployee && (
              <Button
                variant="primary"
                onClick={() => setIsEmpModalOpen(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Register Employee
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/90 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'employees'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Employees Directory</span>
          <span className="rounded-full bg-slate-100/30 px-2 py-0.5 text-[10px] font-bold">
            {employees?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'departments'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Departments Directory</span>
          <span className="rounded-full bg-slate-100/30 px-2 py-0.5 text-[10px] font-bold">
            {departments?.length ?? 0}
          </span>
        </button>

        {selectedDeptId && (
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Department Issue History</span>
          </button>
        )}
      </div>

      {/* Views */}
      {activeTab === 'employees' && (
        <Card className="overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-200/80 max-w-md">
            <SearchInput
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              onClear={() => setEmpSearch('')}
              placeholder="Search by name, employee ID, position, or department..."
            />
          </div>

          {loadingEmp ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              <p className="mt-3 text-xs font-semibold text-slate-500">Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title="No employees found"
                description={
                  empSearch
                    ? 'No staff members match your search keywords.'
                    : 'No staff members are registered yet in the system.'
                }
                action={
                  canRegisterEmployee ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsEmpModalOpen(true)}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Register Employee
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
                    <th className="px-6 py-4">Employee ID</th>
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Position / Designation</th>
                    <th className="px-6 py-4 text-right">Contact Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {emp.employeeCode}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{emp.fullName}</p>
                      </td>

                      <td className="px-6 py-4">
                        <Badge tone="teal" withDot={false}>
                          {emp.department?.name || 'Unassigned'}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          {emp.position || 'Academic / Support Staff'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right text-xs text-slate-500">
                        {emp.email && (
                          <div className="flex items-center justify-end gap-1.5 font-medium">
                            <Mail className="h-3 w-3 text-teal-600" />
                            <span>{emp.email}</span>
                          </div>
                        )}
                        {emp.phone && (
                          <div className="flex items-center justify-end gap-1.5 text-slate-400 mt-0.5">
                            <Phone className="h-3 w-3" />
                            <span>{emp.phone}</span>
                          </div>
                        )}
                        {!emp.email && !emp.phone && <span className="italic text-slate-400">N/A</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'departments' && (
        <div>
          {loadingDept ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              <p className="mt-3 text-xs font-semibold text-slate-500">Loading departments...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {departments?.map((dept: any) => (
                <Card
                  key={dept.id}
                  className="flex flex-col justify-between hover:border-teal-300 hover:shadow-md transition-all group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                        {dept.code}
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {dept._count?.employees ?? 0} Staff
                      </span>
                    </div>
                  </CardHeader>

                  <CardBody className="py-2 flex-1">
                    <h3 className="font-extrabold text-slate-900 text-base">{dept.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {dept.description || 'University academic / administrative unit'}
                    </p>
                  </CardBody>

                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 rounded-b-2xl">
                    <button
                      onClick={() => {
                        setSelectedDeptId(dept.id);
                        setActiveTab('history');
                      }}
                      className="w-full flex items-center justify-between text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5" />
                        View Material Issue Ledger
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <Card className="space-y-4">
          <CardHeader>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('departments')}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <CardTitle>
                  Material Issue History: {deptHistory?.department?.name || 'Department'}
                </CardTitle>
                <CardDescription>
                  Full audit record of materials issued from central store to this department.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {deptHistory?.transactions?.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  icon={History}
                  title="No material issuances on record"
                  description="This department has not received any direct material disbursements yet."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50/90 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <th className="px-6 py-4">Transaction Code</th>
                      <th className="px-6 py-4">Material Details</th>
                      <th className="px-6 py-4 text-center">Quantity Issued</th>
                      <th className="px-6 py-4">Recipient Staff</th>
                      <th className="px-6 py-4">Storekeeper</th>
                      <th className="px-6 py-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deptHistory?.transactions?.map((txn: any) => (
                      <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {txn.transactionCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{txn.material?.name}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-teal-700">
                          {txn.quantity} {txn.material?.unit}s
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-700">
                          {txn.employee?.fullName || 'Department Stock'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{txn.issuedBy?.fullName}</td>
                        <td className="px-6 py-4 text-right text-xs text-slate-400">
                          {new Date(txn.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Register Employee Modal */}
      <Modal
        isOpen={isEmpModalOpen}
        onClose={() => setIsEmpModalOpen(false)}
        title="Register New Employee"
        description="Add a faculty or staff member to the university employee directory."
        size="md"
      >
        <form onSubmit={handleCreateEmp} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Employee Code</Label>
              <Input
                required
                placeholder="e.g. EMP-105"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
              />
            </div>
            <div>
              <Label required>Department</Label>
              <Select
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">Select Dept...</option>
                {departments?.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label required>Full Name</Label>
            <Input
              required
              placeholder="e.g. Sara Tadesse"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Position / Role</Label>
              <Input
                placeholder="e.g. Lab Technician"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEmpModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createEmpMutation.isPending}
            >
              Save Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Department Modal */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Academic Department"
        description="Create a new academic faculty or operational unit for store allocations."
        size="md"
      >
        <form onSubmit={handleCreateDept} className="space-y-4">
          <div>
            <Label required>Department Code</Label>
            <Input
              required
              placeholder="e.g. MATH"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
            />
          </div>
          <div>
            <Label required>Department Name</Label>
            <Input
              required
              placeholder="e.g. Department of Mathematics"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              placeholder="Brief description of department scope..."
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeptModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createDeptMutation.isPending}
            >
              Save Department
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

