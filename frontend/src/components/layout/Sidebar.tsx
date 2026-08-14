import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FileText,
  Repeat,
  Users,
  Building,
  BarChart3,
  ShieldAlert,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useAuthStore } from "../../store/auth.store";

export function Sidebar() {
  const user = useAuthStore((state) => state.user);

  // Role-based navigation items
  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, roles: ["ADMINISTRATOR", "STORE_MANAGER", "STOREKEEPER", "AUDITOR", "REQUESTER"] },
    { to: "/materials", label: "Material Catalog", icon: Package, roles: ["ADMINISTRATOR", "STORE_MANAGER", "STOREKEEPER", "AUDITOR", "REQUESTER"] },
    { to: "/requests", label: "Material Requests", icon: FileText, roles: ["ADMINISTRATOR", "STORE_MANAGER", "STOREKEEPER", "AUDITOR", "REQUESTER"] },
    { to: "/inventory", label: "Inventory Operations", icon: Repeat, roles: ["ADMINISTRATOR", "STORE_MANAGER", "STOREKEEPER", "AUDITOR"] },
    { to: "/employees", label: "Employees & Depts", icon: Users, roles: ["ADMINISTRATOR", "STORE_MANAGER", "STOREKEEPER", "AUDITOR"] },
    { to: "/suppliers", label: "Suppliers", icon: Building, roles: ["ADMINISTRATOR", "STORE_MANAGER", "STOREKEEPER", "AUDITOR"] },
    { to: "/reports", label: "Reports & Analytics", icon: BarChart3, roles: ["ADMINISTRATOR", "STORE_MANAGER", "STOREKEEPER", "AUDITOR"] },
    { to: "/users", label: "User Management & Audit", icon: ShieldAlert, roles: ["ADMINISTRATOR", "AUDITOR"] },
  ];

  const allowedItems = navItems.filter(
    (item) => !user?.role || item.roles.includes(user.role),
  );

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-700 bg-slate-900 text-white shadow-xl">
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-md">
            SMS
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 leading-tight">
              Store Management
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              System Console
            </p>
          </div>
        </div>
      </div>

      {user && (
        <div className="mx-3 my-4 rounded-lg bg-slate-800/80 p-3 border border-slate-700/50">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            Logged in as:
          </div>
          <div className="text-sm font-medium text-slate-200 truncate">
            {user.fullName}
          </div>
          <div className="mt-1 inline-flex items-center rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">
            {user.role.replace('_', ' ')}
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1.5 px-3 py-2 overflow-y-auto">
        {allowedItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
