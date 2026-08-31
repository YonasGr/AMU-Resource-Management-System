# AMU Dedicated Store & Resource Management System
## Arba Minch University — Department & Central ICT Store Management Platform

A modern, web-based inventory and resource management system designed specifically for Arba Minch University (AMU) to automate the registration, real-time tracking, departmental requisitions, supplier shipments, and audit reporting for dedicated institutional stores (such as the Central ICT & Resource Store).

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
2. Runs **Prisma database migrations** & automatically seeds the database with materials, suppliers, departments, employees, and the 5 canonical demo user accounts for the dedicated store.
3. Builds and launches the **NestJS Backend API**.
4. Builds and launches the **React + Tailwind Frontend Console**.
5. Starts **Nginx Reverse Proxy**.

### Access Links
- **Web Application Portal**: [http://localhost:5173](http://localhost:5173) or [http://localhost:8080](http://localhost:8080)
- **API Swagger Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Backend API Direct**: [http://localhost:3000](http://localhost:3000)

---

## 🔐 Canonical Demo Accounts (Single Dedicated Store)

The login page features a **1-Click Quick Demo Switcher** box allowing instant login into any of the 5 roles:

| Role | Email | Password | Primary Scope & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Store Manager** | `manager@store.com` | `password123` | Material catalog governance, category creation, request reviews & approvals |
| **Storekeeper** | `keeper@store.com` | `password123` | Physical store operations (Stock In, Stock Out, Returns, Adjustments, Transfers, Issuance) |
| **Requester (Academic Staff)** | `requester@store.com` | `password123` | Submit departmental material requisitions & track live fulfillment status |
| **Internal Auditor** | `auditor@store.com` | `password123` | Inspect transaction history, audit trails, and all 8 official valuation/movement reports |
| **System Administrator** | `admin@store.com` | `password123` | User account management, security role assignment, department setup, system backups |

---

## 📦 Core System Modules & Features

1. **Item & Material Management**:
   - Register items with unique material codes, categories, units of measure, minimum stock thresholds, shelf locations, and QR metadata.
   - Real-time dynamic stock calculations (`Quantity Received`, `Quantity Issued`, `Remaining Stock Balance`).
2. **Inventory Movement Operations**:
   - **Stock In (Receiving)**: Ingest shipments directly from registered vendors with purchase batch metadata.
   - **Direct Stock Out**: Issue items directly to authorized employees/departments.
   - **Material Returns**: Re-ingest unused or returned items with condition notes back into active store balances.
   - **Stock Adjustments**: Log physical count reconciliation audits with mandatory reason notes.
   - **Store Transfers**: Record departmental transfers with destination tracking.
   - **Master Transaction Ledger**: Searchable, filterable audit ledger of all historical movements.
3. **Requisition & Approval Workflow**:
   - Academic staff files requisition ➔ Store Manager reviews & Approves/Rejects ➔ Storekeeper issues items from active inventory.
4. **Employee & Department Directory**:
   - Manage university faculties and staff with automated issue ledgers tracking historical material allocations per department.
5. **Supplier Directory**:
   - Vendor profiles, contact information, and supplied material tracking.
6. **Reporting & Audit Hub (8 Official University Reports)**:
   - Current Stock Report
   - Stock In Report
   - Stock Out Report
   - Material Balance Report
   - Low Stock Alert Report
   - Employee Material Issue Report
   - Supplier Report
   - Full Transaction History Report
   - *Features 1-Click Export to Excel/CSV and Official University Print/PDF format.*
7. **Administration & Security**:
   - Role-Based Access Control (RBAC), live audit log inspector, and automated JSON database backup export.

---

## 🛑 Stopping the Containerized Application

To stop all services:

```bash
docker compose down
```
