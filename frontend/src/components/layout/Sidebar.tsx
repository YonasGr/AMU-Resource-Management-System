import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Warehouse,
  Package,
  ClipboardList,
  FileText,
  CheckSquare,
  ShoppingCart,
  Send,
  Laptop,
  Bell,
  BarChart3,
  History,
  Users,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { usePendingApprovalsCount } from "../../hooks/usePendingApprovalsCount";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/organization", label: "Organization", icon: Building2 },
  { to: "/rbac", label: "Roles & Permissions", icon: ShieldCheck },
  { to: "/stores", label: "Stores", icon: Warehouse },
  { to: "/items", label: "Item Catalog", icon: Package },
  { to: "/inventory", label: "Inventory", icon: ClipboardList },
  { to: "/requests", label: "Requests", icon: FileText },
  { to: "/approvals", label: "Approvals", icon: CheckSquare, badge: true },
  { to: "/procurement", label: "Procurement", icon: ShoppingCart },
  { to: "/distribution", label: "Distribution", icon: Send },
  { to: "/assets", label: "Assets", icon: Laptop },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/audit", label: "Audit Log", icon: History },
  { to: "/users", label: "Users", icon: Users },
];

export function Sidebar() {
  const pendingCount = usePendingApprovalsCount();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-primary text-white">
      <div className="px-5 py-6">
        <p className="font-display text-lg font-semibold leading-tight">
          Arba Minch
        </p>
        <p className="text-xs uppercase tracking-wider text-white/60">
          Resource Management
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )
            }
          >
            <span className="flex items-center gap-2.5">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </span>
            {badge && pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
