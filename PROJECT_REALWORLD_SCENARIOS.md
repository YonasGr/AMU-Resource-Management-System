# AMU Store & Resource Management System
## Master Real-World Scenario Capabilities & Demonstration Guide

This document presents the primary real-world operational scenarios supported by the AMU Dedicated Store Management System, including the exact GUI test scripts, accounts involved, and expected system behavior.

---

## 1. System Roles & Demo Accounts Matrix

All demo accounts use the standard password: **`password123`**

| Account Email | Role Name | Primary Responsibility in Dedicated Store |
| :--- | :--- | :--- |
| `manager@store.com` | **Store Manager** | Catalog management, category creation, material requisition review & approval. |
| `keeper@store.com` | **Storekeeper** | Physical inventory operations: Stock In, Direct Stock Out, Returns, Adjustments, Transfers, and Issuing approved requests. |
| `requester@store.com` | **Requester (Academic Staff)** | Departmental material requests, tracking live status from Pending to Approved and Issued. |
| `auditor@store.com` | **Internal Auditor** | Full audit compliance, inspecting transaction history and all 8 official valuation and movement reports. |
| `admin@store.com` | **System Administrator** | User administration, role modification, faculty/department configuration, and system JSON backups. |

---

## 2. Master Operational Scenarios

### Scenario 1: Receiving New Stock from Suppliers (Stock In)
**Context**: A registered supplier delivers a shipment of network cables, paper, or office furniture for the university store.

#### Step-by-Step Execution:
1. Log in as `keeper@store.com` (`password123`) or `manager@store.com`.
2. Navigate to **Inventory Operations** (`/inventory`).
3. Click the **Stock In (Receiving)** tab.
4. Select the material (e.g. `CAT6 Ethernet Cable Roll`), enter Quantity (e.g. `10`), Unit Price (e.g. `2800.00 ETB`), select Supplier (e.g. `Ethio-Telecom IT Suppliers`), and add delivery notes.
5. Click **Confirm Stock In & Update Balance**.
6. **Result**: Real-time stock increments instantly, an immutable `TXN-IN-...` transaction code is generated, and dynamic totals update across the catalog and reports.

---

### Scenario 2: Department Requisition Submission & Store Manager Approval
**Context**: A lecturer in Computer Science requests 5 reams of A4 paper for final exam printing.

#### Step-by-Step Execution:
1. **Submitting the Requisition**:
   - Log in as `requester@store.com`.
   - Navigate to **Material Requests** (`/requests`) → Click **+ New Material Request**.
   - Select Department (`Computer Science`), enter Purpose (`End of Semester Examination Printing`), and add items (`A4 Paper x 5`).
   - Click **Submit Request**. Status is now **`PENDING`**.
2. **Review & Approval**:
   - Log out and log in as `manager@store.com`.
   - Navigate to **Material Requests** (`/requests`).
   - Click on the pending requisition card to view items requested and department details.
   - Enter manager comments (e.g. `Approved for semester examination`) and click **Approve Request**.
   - **Result**: Request status updates to **`APPROVED`** in real time.

---

### Scenario 3: Storekeeper Fulfillment & Item Issuance (Stock Out)
**Context**: Following manager approval, the storekeeper fulfills the requisition and hands over the items.

#### Step-by-Step Execution:
1. Log in as `keeper@store.com`.
2. Navigate to **Material Requests** (`/requests`).
3. Select the `APPROVED` request → Click **Issue Materials**.
4. Confirm quantities and click **Confirm Issue & Stock Out**.
5. **Result**: Status changes to **`ISSUED`**, store stock is automatically decremented, a `TXN-OUT-...` ledger entry is created, and the employee/department issue record is updated.

---

### Scenario 4: Material Returns to Store
**Context**: Unused materials from a completed university workshop are returned to store inventory.

#### Step-by-Step Execution:
1. Log in as `keeper@store.com` or `manager@store.com`.
2. Navigate to **Inventory Operations** (`/inventory`) → Click **Material Returns** tab.
3. Select the material, enter quantity, select the returning employee/department, and add condition remarks (`Unopened boxes`).
4. Click **Confirm Return to Store**.
5. **Result**: Item stock is replenished, and a return transaction is permanently logged.

---

### Scenario 5: Physical Stock Audit Adjustment (Count Reconciliation)
**Context**: During physical inventory count, the actual count differs or damaged goods are removed.

#### Step-by-Step Execution:
1. Log in as `manager@store.com` or `keeper@store.com`.
2. Navigate to **Inventory Operations** (`/inventory`) → Click **Stock Adjustments** tab.
3. Select item, enter the new physical stock count, and write the required audit justification (e.g. `Physical count reconciliation difference`).
4. Click **Confirm Stock Count Adjustment**.
5. **Result**: System stock is synced to physical count, and an adjustment audit log is created.

---

### Scenario 6: Department-to-Department Store Transfers
**Context**: Store transfers surplus equipment (e.g. computer monitors) to a specific department lab.

#### Step-by-Step Execution:
1. Log in as `keeper@store.com` or `manager@store.com`.
2. Navigate to **Inventory Operations** (`/inventory`) → Click **Store Transfer** tab.
3. Select material, quantity, and destination department.
4. Click **Record Material Transfer**.
5. **Result**: Stock is allocated to destination department and logged in the transfer ledger.

---

### Scenario 7: Executive & Audit Reporting Hub (8 Official Reports)
**Context**: Internal Auditor generates official university stock valuation and movement reports.

#### Step-by-Step Execution:
1. Log in as `auditor@store.com` or `manager@store.com`.
2. Navigate to **Official Reports** (`/reports`).
3. Switch between all 8 report tabs:
   - *Current Stock*, *Stock In*, *Stock Out*, *Material Balance*, *Low Stock Alerts*, *Employee Issue Ledger*, *Supplier Matrix*, *Full Transaction Ledger*.
4. Click **Export to CSV / Excel** or **Print Official Audit Document (PDF)**.
5. **Result**: Clean tabular reports formatted with official university letterhead and timestamp.

---

### Scenario 8: User Administration & System Backup
**Context**: System Administrator manages user roles and generates automated JSON database backups.

#### Step-by-Step Execution:
1. Log in as `admin@store.com`.
2. Navigate to **User Management** (`/users`).
3. Manage user accounts, update role authorizations, and inspect live security audit logs.
4. In the **System Settings & Maintenance** panel, click **Download JSON Backup**.
5. **Result**: Immediate complete database state export for disaster recovery.
