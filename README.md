# Store Management System

A web-based inventory management application designed to automate the registration, tracking, and management of materials stored in an organization.

![NestJS](https://img.shields.io/badge/backend-NestJS_10-red.svg?style=for-the-badge&logo=nestjs)
![React](https://img.shields.io/badge/frontend-React_18-blue.svg?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL_16-blue.svg?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/container-Docker_Compose-2496ED.svg?style=for-the-badge&logo=docker)

---

## ⚡ Quick Start (Containerized — 1 Command Execution)

You do **not** need to install dependencies or run frontend and backend manually. Simply run:

```bash
docker compose up -d --build
```

This single command automatically:
1. Starts the **PostgreSQL** database container.
2. Runs **Prisma database migrations** & automatically seeds the database with materials, suppliers, departments, employees, and 5 demo user accounts.
3. Builds and launches the **NestJS Backend API**.
4. Builds and launches the **React Frontend Console**.
5. Starts **Nginx Proxy**.

### Access Links
- **Web Application Portal**: [http://localhost:5173](http://localhost:5173) or [http://localhost:8080](http://localhost:8080)
- **API Swagger Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Backend API Direct**: [http://localhost:3000](http://localhost:3000)

---

## 🔐 Pre-Seeded Demo Accounts

The login page features a **Quick Demo Switcher** box allowing 1-click login into any of the 5 roles:

| Role | Email | Password | Scope & Primary Use Case |
| :--- | :--- | :--- | :--- |
| **Requester** | `requester@store.com` | `password123` | Submit material requests & track status in real-time |
| **Store Manager** | `manager@store.com` | `password123` | Review & Approve/Reject pending requests, manage catalog |
| **Storekeeper** | `keeper@store.com` | `password123` | Fulfill approved requests (Stock Out), Stock In, Returns, Adjustments |
| **Auditor** | `auditor@store.com` | `password123` | View all 8 inventory reports & system audit logs |
| **Administrator** | `admin@store.com` | `password123` | System user creation & role assignment |

---

## 📦 System Modules & Features

1. **Material Management**: Register materials with unique codes, categories, units of measure, minimum stock alerts, shelf location, and barcode/QR metadata. Real-time balance calculations (`Total Received`, `Issued`, `Remaining Stock`).
2. **Inventory Operations**:
   - **Stock In**: Receive materials from suppliers.
   - **Stock Out**: Direct issue or approved request release.
   - **Material Returns**: Record returned items back into store.
   - **Stock Adjustments**: Audit inventory count adjustments.
   - **Transaction Ledger**: Search and filter all stock movements.
3. **Request & Approval Workflow**:
   - `Requester` submits material request ➔ `Store Manager` approves/rejects with comments ➔ `Storekeeper` issues materials (Stock Out).
4. **Employee & Department Management**: Directory and complete issue history per department/employee.
5. **Supplier Management**: Supplier profiles and supplied material tracking.
6. **Reporting Hub**: Generate all **8 requested reports** with **1-click Export to Excel/CSV** and **PDF Print** functions:
   - Current Stock Report
   - Stock In Report
   - Stock Out Report
   - Material Balance Report
   - Low Stock Alert Report
   - Employee Material Issue Report
   - Supplier Report
   - Full Transaction History Report

---

## 🛑 Stopping the Containerized Application

To stop all services:

```bash
docker compose down
```
