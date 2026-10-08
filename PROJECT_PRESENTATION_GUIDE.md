# PROJECT PRESENTATION & INSTRUCTOR DEMONSTRATION GUIDE
## Arba Minch University (AMU) Store & Resource Management System

---

## 1. Executive Summary & Project Pitch

### 1.1 The Problem Statement
Arba Minch University (AMU) comprises dozens of academic faculties, departments, laboratories, and administrative directorates. Historically, store inventory and departmental requisition operations suffered from:
- **Decentralized Silos & Manual Bookkeeping**: Materials were tracked in paper ledger books, leading to phantom inventory, stock discrepancies, and untraceable issues.
- **Delayed Requisition Cycles**: Academic staff had to physically carry paper request forms across campus for approvals and store fulfillments.
- **Audit Fragility**: Generating store audit summaries, low-stock warnings, and historical employee issue ledgers required days of manual paper reconciliation.

### 1.2 The Solution
The **AMU Store & Resource Management System** is a modern, high-performance web platform tailored for institutional store operations:

$$\text{Item Cataloging} \longrightarrow \text{Stock In (Suppliers)} \longrightarrow \text{Department Requisition} \longrightarrow \text{Manager Approval} \longrightarrow \text{Storekeeper Issue} \longrightarrow \text{Audit Reports}$$

### 1.3 Core Architectural Highlights (Key Defense Talking Points)
1. **Dynamic Stock Aggregation**: Total received, issued, and remaining stock counts are computed dynamically from real-time transaction movements.
2. **Role-Based Access Control (RBAC)**: Strict 5-role segregation ensures managers approve requests, storekeepers execute physical stock movements, and academic requesters file departmental orders.
3. **8 Standard Institutional Reports**: Instant one-click export (CSV/Excel) and formatted official print layouts for university compliance.

---

## 2. Test Accounts Matrix & Credentials

Each role has an independent, secured default credential in dev:

| Account Email | Default Password | Role Name | Scope | Purpose in Presentation |
|---|---|---|---|---|
| `manager@store.com` | `Manager#AMU2026!StoreKey` | **Store Manager** | Store | Catalog management, new category creation, requisition review & approval. |
| `keeper@store.com` | `Keeper#AMU2026!InventoryKey` | **Storekeeper** | Store | Fulfills approved requisitions, logs Stock In, Direct Out, Returns, Adjustments, Transfers. |
| `requester@store.com` | `Requester#AMU2026!StaffKey` | **Requester** | Academic Dept | Submits departmental material requests and monitors status in real time. |
| `auditor@store.com` | `Auditor#AMU2026!AuditKey` | **Auditor** | Global Compliance | Inspects system audit logs and all 8 official valuation and balance reports. |
| `admin@store.com` | `Admin#AMU2026!SecureKey` | **Administrator** | System Global | User account management, security role configuration, JSON database backup. |

---

## 3. Terminal Commands (Zero to Demo-Ready Setup)

```bash
# 1. Reset containers and start Docker environment
docker compose up -d --build

# 2. Access URLs:
# - Web UI Application: http://localhost:5173
# - Swagger API Docs: http://localhost:3000/api/docs
```

---

## 4. Live UI Demonstration Script (Step-by-Step Walkthrough)

### DEMO FLOW 1: Requisition Filing, Manager Approval & Storekeeper Issuance
1. **Step 1: File Requisition as Academic Requester**
   - Open `http://localhost:5173/login`.
   - Log in: **Requester (Academic Staff)** (`requester@store.com` / `Requester#AMU2026!StaffKey`).
   - Navigate to **Material Requests** (`/requests`) → Click **+ New Material Request**.
   - Select Department (`Computer Science`), enter purpose (`Final Exam Printing Supplies`), add `A4 Paper x 5`.
   - Click **Submit Request**. Observe status is `PENDING`.
2. **Step 2: Review & Approve as Store Manager**
   - Log out and Quick Login: **Store Manager** (`manager@store.com`).
   - Navigate to **Material Requests** (`/requests`).
   - Click on the requisition card, review requested items, add manager remarks, and click **Approve Request**.
   - Observe status updates to `APPROVED`.
3. **Step 3: Issue Materials as Storekeeper**
   - Log out and Quick Login: **Storekeeper** (`keeper@store.com`).
   - Navigate to **Material Requests** (`/requests`).
   - Select the approved requisition → Click **Issue Materials** → Confirm quantities.
   - Observe status is `ISSUED`, and inventory balances update in real time.

---

### DEMO FLOW 2: Physical Inventory Operations (Stock In & Adjustments)
1. **Receiving Supplier Shipments**:
   - As Storekeeper or Store Manager, navigate to **Inventory Operations** (`/inventory`).
   - Select **Stock In (Receiving)** tab → Choose item, quantity, supplier, and unit price → Click **Confirm Stock In**.
   - Observe live preview card updates and real-time transaction badge generated.
2. **Stock Recount Adjustment**:
   - Click **Stock Adjustments** tab → Enter physical recount count and audit reason → Submit.

---

### DEMO FLOW 3: Official 8 Reports & Data Export
1. Log in as **Auditor** (`auditor@store.com`).
2. Navigate to **Official Reports** (`/reports`).
3. Click through the 8 report tabs (*Current Stock*, *Stock In*, *Stock Out*, *Material Balance*, *Low Stock Alerts*, *Employee Issue Ledger*, *Supplier Matrix*, *Full Transaction Ledger*).
4. Demonstrate **Export to CSV / Excel** and **Print Official Document (PDF)**.

---

## 5. Anticipated Questions & Defense Responses

### Q1: "How are stock balances calculated in real time?"
> **Answer**: "Stock balances are dynamically aggregated by summing total stock in movements and subtracting total stock out movements. Every physical movement generates an immutable transaction record (`TXN-...`), ensuring zero stock discrepancies and tamper-proof audit trails."

### Q2: "How does the system enforce role boundaries?"
> **Answer**: "The system uses NestJS Guards and custom decorators (`@Roles(...)`) tied to JWT authentication. Store Managers review and approve requests, Storekeepers execute physical Stock In/Out movements, and Academic Requesters file departmental requisitions."

### Q3: "Can an auditor modify inventory records?"
> **Answer**: "No. Auditors have read-only inspection access. They can generate all 8 institutional reports and review security audit trails, but cannot create or approve transactions."

### Q4: "How does the reporting engine format official university documents?"
> **Answer**: "The reporting module provides instant client-side Excel/CSV dataset export alongside an official print view formatted with the Arba Minch University letterhead, timestamp, and verification footer for institutional compliance."


