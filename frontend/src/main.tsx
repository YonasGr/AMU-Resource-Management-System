import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OrgTreePage from "./pages/organization/OrgTreePage";
import RolesPermissionsPage from "./pages/rbac/RolesPermissionsPage";
import StoreListPage from "./pages/stores/StoreListPage";
import StoreDetailPage from "./pages/stores/StoreDetailPage";
import ItemCatalogPage from "./pages/items/ItemCatalogPage";
import InventoryDashboardPage from "./pages/inventory/InventoryDashboardPage";
import RequestsListPage from "./pages/requests/RequestsListPage";
import NewRequestPage from "./pages/requests/NewRequestPage";
import RequestDetailPage from "./pages/requests/RequestDetailPage";
import ApprovalsInboxPage from "./pages/workflow/ApprovalsInboxPage";
import ProcurementPage from "./pages/procurement/ProcurementPage";
import DistributionPage from "./pages/distribution/DistributionPage";
import AssetsPage from "./pages/assets/AssetsPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import ReportsPage from "./pages/reports/ReportsPage";
import AuditLogPage from "./pages/audit/AuditLogPage";
import UsersPage from "./pages/users/UsersPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import "./index.css";
import "./lib/api";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/organization" element={<OrgTreePage />} />
              <Route path="/rbac" element={<RolesPermissionsPage />} />
              <Route path="/stores" element={<StoreListPage />} />
              <Route path="/stores/:id" element={<StoreDetailPage />} />
              <Route path="/items" element={<ItemCatalogPage />} />
              <Route path="/inventory" element={<InventoryDashboardPage />} />
              <Route path="/requests" element={<RequestsListPage />} />
              <Route path="/requests/new" element={<NewRequestPage />} />
              <Route path="/requests/:id" element={<RequestDetailPage />} />
              <Route path="/approvals" element={<ApprovalsInboxPage />} />
              <Route path="/procurement" element={<ProcurementPage />} />
              <Route path="/distribution" element={<DistributionPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/audit" element={<AuditLogPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
