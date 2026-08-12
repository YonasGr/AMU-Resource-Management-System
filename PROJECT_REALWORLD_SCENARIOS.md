# Arba Minch University Resource Management System (AMU-RMS)
## Master Real-World Scenario Capabilities & E2E Testing Guide

This document presents every real-world operational scenario supported by the AMU Resource Management System, including the exact click-by-click GUI test scripts, accounts involved, and expected system behavior.

---

## 1. System Role & Test Account Reference Matrix

| Account Email | Password | Role & Scope | Responsibilities & Powers |
|---|---|---|---|
| `admin@amu.edu.et` | `ChangeMe123!` | `SYSTEM_ADMINISTRATOR` (GLOBAL) | Full system administration, organization tree management, RBAC role assignment, report export, and global workflow approval override. |
| `wftest.requester@amu.edu.et` | `ChangeMe123!` | `REQUESTER` (CS Dept) | Standard university faculty/staff. Submits Item, Transfer, Purchase, Borrow, and Disposal requests. |
| `wftest.depthead@amu.edu.et` | `ChangeMe123!` | `DEPARTMENT_HEAD` (CS Dept) | Departmental leader. Step 1 Approver for CS Department employee requests. |
| `wftest.sourcemanager@amu.edu.et` | `ChangeMe123!` | `STORE_MANAGER` (Source Store) | Manages inventory at Central/Source Store. Approves issue/transfer requests, manages asset borrowing/returns, logs stock adjustments. |
| `wftest.destmanager@amu.edu.et` | `ChangeMe123!` | `STORE_MANAGER` (Dest Store) | Manages inventory at Destination Store. Approves incoming transfers and confirms distribution plan receipts. |

---

## 2. Master Real-World Scenarios

### Scenario 1: External Procurement & Inventory Ingestion (The 100 Desktop Computers Refresh)
**Real-World Context**: The university allocates budget for 100 desktop computers for Engineering and IT computer labs. The procurement must pass Department Head approval, Finance budget clearance, Procurement clearance, Goods Receipt Note (GRN) logging, and automated fixed asset tag generation.

#### Step-by-Step Execution Script:
1. **Filing the Purchase Request**:
   - Log in as `wftest.requester@amu.edu.et` (`ChangeMe123!`).
   - Navigate to **Requests** (`/requests`) → Click **+ New Request**.
   - Select **Purchase Request** tab.
   - Select Item: `Laptop Dell Latitude`, Quantity: `100`, Justification: `Annual Computer Lab Refresh for Engineering Colleges`.
   - Click **Submit Request**.
2. **Step 1 Approval (Department Head)**:
   - Log in as `wftest.depthead@amu.edu.et` (`ChangeMe123!`).
   - Navigate to **Approvals** (`/approvals`).
   - Review requested items box (`100 piece x Laptop Dell Latitude`) → Click **Approve** → Confirm.
3. **Step 2 & Step 3 Approval (Finance & Procurement)**:
   - Log in as `admin@amu.edu.et` (`ChangeMe123!`).
   - Navigate to **Approvals** (`/approvals`).
   - Click **Approve** on Step 2 (Finance Approval) → Click **Approve** on Step 3 (Procurement Approval).
   - *Result*: Request status becomes **`COMPLETED`**, and a formal `PurchaseOrder` is created.
4. **Goods Receipt Note (GRN) Logging**:
   - Stay logged in as `admin@amu.edu.et`.
   - Navigate to **Procurement** (`/procurement`) → Click **+ Create Goods Receipt**.
   - Select Store: `Workflow Test Source Store`, Supplier: `Ethio-Telecom IT Suppliers`, Receipt #: `GRN-2026-00100`, Item: `Laptop Dell Latitude`, Accepted Qty: `100`.
   - Click **Save Goods Receipt**.
5. **System Results Verification**:
   - Navigate to **Inventory** (`/inventory`) → Select `Workflow Test Source Store` → Stock of `Laptop Dell Latitude` increases by **100 units** (`PURCHASE_RECEIVE` movement logged).
   - Navigate to **Assets** (`/assets`) → 100 individual asset tags (`AMU-LAP-2026-001` through `AMU-LAP-2026-100`) appear in `AVAILABLE` status!

---

### Scenario 2: Multi-College Stock Redistribution & Distribution Plan
**Real-World Context**: Central ICT Store has received 100 computers and dispatches 40 computers to CS Dept Store and 60 computers to ICT Directorate Store.

#### Step-by-Step Execution Script:
1. **Create & Approve Distribution Plan**:
   - Log in as `admin@amu.edu.et` (`ChangeMe123!`).
   - Navigate to **Distribution** (`/distribution`) → Click **+ New Distribution Plan**.
   - Title: `100 Computers Multi-College Distribution`, Source Store: `Workflow Test Source Store`.
   - Add Line 1: `40 units x Laptop Dell Latitude` → `Workflow Test Destination Store`.
   - Add Line 2: `60 units x Laptop Dell Latitude` → `ICT Store`.
   - Click **Create & Approve Plan**.
2. **Confirm Receipt at Destination Store**:
   - Log in as `wftest.destmanager@amu.edu.et` (`ChangeMe123!`).
   - Navigate to **Distribution** (`/distribution`).
   - Locate the pending plan → Click **Confirm Receipt**.
   - *Result*: Stock of 40 computers is transferred into `Workflow Test Destination Store` (`TRANSFER_IN` movement logged).

---

### Scenario 3: Departmental Item Issuance (Consumables & Supplies)
**Real-World Context**: CS Department staff member requests 5 reams of paper or lab supplies from the department store.

#### Step-by-Step Execution Script:
1. **Submit Item Request**:
   - Log in as `wftest.requester@amu.edu.et`.
   - Navigate to **Requests** (`/requests`) → Click **+ New Request** → Select **Item Request** tab.
   - Target Store: `Workflow Test Source Store`, Item: `A4 Printing Paper`, Quantity: `5`, Purpose: `Final Exam Printing`.
   - Click **Submit Request**.
2. **Step 1 Approval**: Log in as `wftest.depthead@amu.edu.et` → **Approvals** → Click **Approve**.
3. **Step 2 Approval & Auto-Execution**:
   - Log in as `wftest.sourcemanager@amu.edu.et` → **Approvals** → Click **Approve**.
   - *Result*: The system executes an `ISSUE` stock movement, decrements store inventory by 5 units, and updates department consumption logs.

---

### Scenario 4: Temporary Asset Borrowing & Return Inspection
**Real-World Context**: A professor borrows a high-performance lab laptop (`AMU-LAP-2026-001`) for a 2-week conference and returns it afterward.

#### Step-by-Step Execution Script:
1. **Submit Borrow Request**:
   - Log in as `wftest.requester@amu.edu.et`.
   - Navigate to **Requests** → Click **+ New Request** → Select **Borrow Request** tab.
   - Select Asset: `AMU-LAP-2026-001`, Purpose: `International Research Conference`, Expected Return Date: `14 days from today`.
   - Click **Submit Request**.
2. **Store Manager Issue Approval**:
   - Log in as `wftest.sourcemanager@amu.edu.et` → **Approvals** → Click **Approve**.
   - *Result*: Asset status updates from `AVAILABLE` to **`BORROWED`**.
3. **Return & Condition Inspection**:
   - Log in as `wftest.sourcemanager@amu.edu.et` → Navigate to **Assets** (`/assets`) → Click **Return Asset**.
   - Log inspection condition: `GOOD` → Click **Confirm Return**.
   - *Result*: Asset status reverts to **`AVAILABLE`**.

---

### Scenario 5: Fixed Asset Technical Inspection & Permanent Disposal
**Real-World Context**: An obsolete computer (`AMU-LAP-2026-005`) suffers unrepairable hardware damage and must be decommissioned following university audit procedures.

#### Step-by-Step Execution Script:
1. **Submit Disposal Request**:
   - Log in as `wftest.sourcemanager@amu.edu.et`.
   - Navigate to **Requests** → Click **+ New Request** → Select **Disposal Request** tab.
   - Select Asset: `AMU-LAP-2026-005`, Reason: `Unrepairable Motherboard Failure`, Method: `Recycle / Scrap`.
   - Click **Submit Request**.
2. **University Executive Authorization**:
   - Log in as `admin@amu.edu.et` → **Approvals** → Click **Approve**.
   - *Result*: Asset status updates to **`DISPOSED`**, and the backend auto-generates a downloadable official PDF Disposal Certificate.

---

### Scenario 6: User Administration & Role-Based Access Control (RBAC)
**Real-World Context**: System Administrator provisions a new employee account and assigns them a Store Manager role scoped to a specific store.

#### Step-by-Step Execution Script:
1. **Create User Account**:
   - Log in as `admin@amu.edu.et` → Navigate to **Users** (`/users`) → Click **+ Create User**.
   - Fill in: Full Name `Abebe Bikila`, Email `abebeb@amu.edu.et`, Password `ChangeMe123!`, Organization Unit `Computer Science Department`, Initial Role `Store Manager`.
   - Click **Save User Account**.
2. **Manage Role & Scope**:
   - Navigate to **Roles & Permissions** (`/roles`).
   - Select Role: `Store Manager`, Scope: `Store`, Scope Target: `Workflow Test Source Store`.
   - Click **Assign Role**.

---

### Scenario 7: Executive Reporting, Low-Stock Reorder Alerts, & Audit Trails
**Real-World Context**: Internal auditor or university leadership reviews stock movements, low-stock warnings, and security audit logs.

#### Step-by-Step Execution Script:
1. **Executive Reports & Data Export**:
   - Log in as `admin@amu.edu.et` → Navigate to **Reports** (`/reports`).
   - Preview or Export (CSV/PDF) any of the 8 report suites:
     - *Current Inventory*, *Low Stock Alerts*, *Stock Movements*, *Department Consumption*, *Purchase History*, *Inter-store Transfers*, *Fixed Assets*, *User Activity*.
2. **Security Audit Log & JSON Diffs**:
   - Navigate to **Audit Log** (`/audit`).
   - Filter by entity type or action → Expand **View diff** to inspect side-by-side JSON snapshots of system state changes.
