import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MaterialsPage from "./pages/materials/MaterialsPage";
import RequestsPage from "./pages/requests/RequestsPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import EmployeesPage from "./pages/employees/EmployeesPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import ReportsPage from "./pages/reports/ReportsPage";
import UsersPage from "./pages/users/UsersPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import "./index.css";
import "./lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/materials" element={<MaterialsPage />} />
              <Route path="/requests" element={<RequestsPage />} />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute allowedRoles={['STOREKEEPER', 'STORE_MANAGER', 'AUDITOR']} />
                }
              >
                <Route index element={<InventoryPage />} />
              </Route>
              <Route
                path="/employees"
                element={
                  <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'STORE_MANAGER', 'STOREKEEPER', 'AUDITOR']} />
                }
              >
                <Route index element={<EmployeesPage />} />
              </Route>
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'STORE_MANAGER']} />
                }
              >
                <Route index element={<SuppliersPage />} />
              </Route>
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'STORE_MANAGER', 'STOREKEEPER', 'AUDITOR']} />
                }
              >
                <Route index element={<ReportsPage />} />
              </Route>
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMINISTRATOR']} />
                }
              >
                <Route index element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
