import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Users, Building, Plus, History } from 'lucide-react';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'employees' | 'departments' | 'history'>('employees');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" /> Employees & Departments
          </h1>
          <p className="text-sm text-slate-500">
            Register employees, manage organizational departments, and view material issuance history
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsDeptModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <Building className="h-4 w-4" /> Add Department
          </button>
          <button
            onClick={() => setIsEmpModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" /> Register Employee
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 transition-colors ${
            activeTab === 'employees'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Employees Directory ({employees?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 transition-colors ${
            activeTab === 'departments'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Departments ({departments?.length ?? 0})
        </button>
      </div>

      {/* Views */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        {activeTab === 'employees' && (
          <div>
            {loadingEmp ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading employees...</div>
            ) : (
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees?.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                        {emp.employeeCode}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{emp.fullName}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {emp.department?.name}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{emp.position || 'Staff'}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {emp.email || emp.phone || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'departments' && (
          <div>
            {loadingDept ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading departments...</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {departments?.map((dept: any) => (
                  <div
                    key={dept.id}
                    className="rounded-xl border border-slate-200 p-5 space-y-3 hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                        {dept.code}
                      </span>
                      <span className="text-xs text-slate-400">
                        {dept._count?.employees ?? 0} Employees
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{dept.name}</h3>
                    <p className="text-xs text-slate-500">{dept.description || 'No description'}</p>
                    <button
                      onClick={() => {
                        setSelectedDeptId(dept.id);
                        setActiveTab('history');
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline pt-2"
                    >
                      <History className="h-3.5 w-3.5" /> View Issued Materials History
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                Department Material Issue History: {deptHistory?.department?.name}
              </h2>
              <button
                onClick={() => setActiveTab('departments')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Back to Departments
              </button>
            </div>

            {deptHistory?.transactions?.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No materials issued to this department yet.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Txn Code</th>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3 text-center">Qty Issued</th>
                    <th className="px-4 py-3">Recipient Employee</th>
                    <th className="px-4 py-3">Issued By</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deptHistory?.transactions?.map((txn: any) => (
                    <tr key={txn.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{txn.transactionCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{txn.material?.name}</td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-600">
                        {txn.quantity} {txn.material?.unit}s
                      </td>
                      <td className="px-4 py-3 text-xs">{txn.employee?.fullName || 'Department Stock'}</td>
                      <td className="px-4 py-3 text-xs">{txn.issuedBy?.fullName}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Register Employee Modal */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Register New Employee</h2>
            <form onSubmit={handleCreateEmp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-105"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    required
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                  >
                    <option value="">Select Dept</option>
                    {departments?.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sara Tadesse"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Position</label>
                  <input
                    type="text"
                    placeholder="e.g. Lab Technician"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEmpMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Add Department</h2>
            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MATH"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Department of Mathematics"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Brief description..."
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDeptMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
