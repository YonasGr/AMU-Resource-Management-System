# PROJECT PRESENTATION & INSTRUCTOR DEMONSTRATION GUIDE
## Arba Minch University (AMU) Resource Management System

---

## 1. Executive Summary & Project Pitch

### 1.1 The Problem Statement
Arba Minch University (AMU) comprises dozens of colleges, faculties, research institutes, central directorates, and administrative units spread across multiple campuses. Historically, resource management suffered from:
- **Decentralized Silos**: Individual stores managed inventory on paper without central audit visibility.
- **Loss of Custody**: High-value fixed assets (laptops, lab instruments, vehicles) disappeared or lacked tracking during inter-departmental loans.
- **Scope Deadlocks**: Department heads and store managers had unclear boundaries, making cross-department resource sharing cumbersome and unverified.

### 1.2 The Solution
The **AMU Resource Management System** is a full-stack, enterprise-grade ERP that automates the entire resource lifecycle:

$$\text{Item Cataloging} \longrightarrow \text{Store Provisioning} \longrightarrow \text{Request Filing} \longrightarrow \text{Multi-Step Approval} \longrightarrow \text{Atomic Execution} \longrightarrow \text{Custody/Asset Tracking} \longrightarrow \text{Disposal/Audit}$$

### 1.3 The 4 Core Architectural Principles (Key Defense Talking Points)
1. **Strict Request-Driven Execution**: No user or administrator can manually edit stock quantities. Every inventory change MUST be requested, approved through a workflow chain, and programmatically executed upon final approval.
2. **Atomic Inventory Sequestration**: All inventory stock quantity changes occur strictly inside `MovementService` within serializable database transactions paired with an immutable `InventoryMovement` audit record.
3. **Two-Part Authorization (Permission + Scope)**: A user's access requires both a *Permission Key* (e.g. `inventory.issue`) and a matching *Scope* (`GLOBAL`, `ORGANIZATION`, or `STORE`).
4. **Workflow-Authorized Execution**: When a multi-step workflow clears final approval, execution is authorized by the *completed workflow chain*, bypassing individual actor scope restrictions during inter-departmental transfers.

---

## 2. Test Accounts Matrix & Credentials

All test accounts use the password: **`ChangeMe123!`**

| Account Email | Role Name | Scope Type | Target Entity Scope | Purpose in Presentation |
|---|---|---|---|---|
| `admin@amu.edu.et` | `SYSTEM_ADMINISTRATOR` | `GLOBAL` | System-Wide (All Orgs & Stores) | Full system administration, asset registration, audit timeline viewing, report exports. |
| `wftest.requester@amu.edu.et` | `REQUESTER` | `ORGANIZATION` | CS Department | Submitting consumable item requests, transfer requests, and asset borrowing requests. |
| `wftest.depthead@amu.edu.et` | `DEPARTMENT_HEAD` | `ORGANIZATION` | CS Department | Step 1 approval for CS Department requests. |
| `wftest.sourcemanager@amu.edu.et` | `STORE_MANAGER` | `STORE` | Workflow Test Source Store (`WF-TEST-SOURCE-01`) | Step 2 approval for requests sourcing from the Source Store. |
| `wftest.destmanager@amu.edu.et` | `STORE_MANAGER` | `STORE` | Workflow Test Destination Store (`WF-TEST-DEST-01`) | Step 3 approval for requests transferring into the Destination Store. |

---

## 3. Terminal Commands (Zero to Demo-Ready Setup)

Run these exact commands in your terminal before your presentation:

### 3.1 Initial Setup & Database Seed
```bash
# 1. Open project directory
cd ~/Github/AMU-Resource-Management-System

# 2. Reset containers and purge old data
docker compose down -v

# 3. Start development environment
docker compose up -d --build

# 4. Generate Prisma client & apply database migrations
docker compose exec backend pnpm prisma:generate
docker compose exec backend pnpm prisma migrate dev

# 5. Seed database with organizational tree, catalog, users, and stores
docker compose exec backend pnpm prisma:seed
```

### 3.2 Running E2E Integration Tests (Show Instructor Automated Verification)
```bash
docker compose exec backend pnpm test:e2e
```
*Expected Result*: **6 passed, 6 total** (Auth login, Org tree, Store directory, Notifications, and Reports).

### 3.3 Access URLs
- **Web UI Application**: `http://localhost:5173`
- **Swagger API Interactive Docs**: `http://localhost:3000/api/docs`
- **Nginx Reverse Proxy Entry**: `http://localhost:8080`

---

## 4. Live UI Demonstration Script (Step-by-Step Walkthrough)

Follow these exact steps during your live presentation to demonstrate all system flows smoothly.

---

### DEMO FLOW 1: Consumable Item Request & Automated Issuance

**Concept to explain to instructor**: "I will demonstrate how a department staff member requests consumable supplies, how it routes through a 2-step approval chain, and how stock is automatically deducted upon final approval."

1. **Step 1: Submit Request as Requester**
   - Open `http://localhost:5173/login`.
   - Log in: `wftest.requester@amu.edu.et` / `ChangeMe123!`.
   - Navigate to **Requests** (`/requests`) → Click **New Request**.
   - Select Type: **Item Request**.
   - Select Target Store: **Workflow Test Source Store**, Item: **A4 Paper**, Quantity: `5`.
   - Click **Submit Request**.
   - *Highlight*: Status is `PENDING_APPROVAL`, and the top bar bell icon alerts the requester that the request was submitted.

2. **Step 2: Step 1 Approval as Department Head**
   - Log out and log in as `wftest.depthead@amu.edu.et` (`ChangeMe123!`).
   - Observe the badge on **Approvals** in the sidebar showing `1` pending item.
   - Navigate to **Approvals** (`/approvals`).
   - Click **Approve** on the pending request.
   - *Highlight*: Request advances to Step 2 (Store Manager approval).

3. **Step 3: Step 2 Final Approval & Automatic Execution**
   - Log out and log in as `wftest.sourcemanager@amu.edu.et` (`ChangeMe123!`).
   - Navigate to **Approvals** (`/approvals`) → Click **Approve**.
   - *Highlight*: As soon as the store manager approves, the workflow status shifts to `APPROVED` and immediately triggers `MovementService.applyMovement()`. Request status updates to `COMPLETED`.

4. **Step 4: Verify Inventory Ledger**
   - Navigate to **Inventory** (`/inventory`).
   - Select Store: **Workflow Test Source Store**.
   - *Highlight*: Quantity of A4 Paper has decreased by 5. Click **Movement History** tab to show the immutable `ISSUE` movement record with timestamp and creator details.

---

### DEMO FLOW 2: Inter-Departmental Store Transfer

**Concept to explain to instructor**: "Now I will demonstrate inter-departmental transfers. Computer Science needs 2 Office Chairs from the ICT Source Store. This requires 3 approvers: CS Dept Head, Source Store Manager, and Destination Store Manager."

1. **Submit Transfer Request**:
   - Log in as `wftest.requester@amu.edu.et`.
   - Navigate to `/requests/new` → Select **Transfer Request**.
   - Source Store: **Workflow Test Source Store**, Destination Store: **Workflow Test Destination Store**.
   - Item: **Office Chair**, Quantity: `2`. Click **Submit Request**.

2. **Execute 3-Step Approval Chain**:
   - Log in as `wftest.depthead@amu.edu.et` → **Approvals** → Click **Approve**.
   - Log in as `wftest.sourcemanager@amu.edu.et` → **Approvals** → Click **Approve**.
   - Log in as `wftest.destmanager@amu.edu.et` → **Approvals** → Click **Approve**.

3. **Verify Atomic Paired Movements**:
   - Log in as `admin@amu.edu.et` → Navigate to **Inventory** (`/inventory`).
   - Select **Workflow Test Source Store**: Stock decreased by 2 (`TRANSFER_OUT`).
   - Select **Workflow Test Destination Store**: Stock increased by 2 (`TRANSFER_IN`).
   - *Highlight*: Both movement rows share the exact same `referenceId` (the Request ID).

---

### DEMO FLOW 3: Fixed Asset Custody, Borrowing & Maintenance Lifecycle

**Concept to explain to instructor**: "Unlike consumable paper, fixed assets like laptops are tracked individually by asset tags. I will demonstrate asset registration, borrowing custody, return inspection, and maintenance completion."

1. **Register Fixed Asset as Admin**:
   - Log in as `admin@amu.edu.et`.
   - Navigate to **Assets** (`/assets`).
   - Under *Register inventory unit*:
     - Asset Tag: `AMU-LAP-2026-777`, Item: **Dell Laptop**, Store: **ICT Store**.
     - Click **Register**. Status is `AVAILABLE`.

2. **File Borrow Request**:
   - Log in as `wftest.requester@amu.edu.et` → `/requests/new` → **Borrow Request**.
   - Select Target Store: **ICT Store**, Asset: `AMU-LAP-2026-777`, Purpose: `Research Conference`.
   - Set Expected Return Date → Click **Submit Request**.

3. **Approve & Issue Asset**:
   - Log in as `wftest.sourcemanager@amu.edu.et` → **Approvals** → Click **Approve**.
   - Navigate to **Assets** (`/assets`) → Click **Borrowing & Returns** tab.
   - Click **Issue Asset** → Asset status updates to `BORROWED`.

4. **Return & Inspection**:
   - Click **Return Asset** → Asset status becomes `RETURNED_PENDING_INSPECTION`.
   - Click **Inspect** → Condition: `DAMAGED`, Notes: `Screen cracked during transit`.
   - *Highlight*: Asset status automatically shifts to `UNDER_MAINTENANCE`.

5. **Complete Maintenance**:
   - In Asset Registry tab, locate `AMU-LAP-2026-777`.
   - Click **Complete Maint.** → Asset status updates back to `AVAILABLE`.

---

### DEMO FLOW 4: System Audit Trail, In-App Notifications & PDF Reports

1. **In-App Notifications**:
   - Show top bar bell icon showing unread count badge.
   - Navigate to **Notifications** (`/notifications`) → Demonstrate filtering by Unread/All and marking items read.

2. **Audit Log & JSON Diff Viewer**:
   - Log in as `admin@amu.edu.et` → Navigate to **Audit Log** (`/audit`).
   - Filter by Entity Type: **Asset** or **Request**.
   - Click **View diff** on an event to show side-by-side JSON snapshots of `before` and `after` states.

3. **Reporting & PDF/CSV Export**:
   - Navigate to **Reports** (`/reports`).
   - Click **Preview** on *Current Inventory Report* to render instant JSON preview tables.
   - Click **Export CSV** to download tabular data.
   - Click **Export PDF** to show raw, formatted PDF report generation.

---

## 5. Anticipated Instructor Questions & Expert Responses

### Q1: "Why didn't you allow Store Managers to manually edit stock quantities in the database?"
> **Answer**: "Manual stock edits destroy auditability and create opportunities for fraud or inventory loss. In our system, `StoreInventory.quantity` is isolated to `MovementService`. The only way to alter stock is through an approved `Request`, which automatically writes an immutable `InventoryMovement` record inside a serializable database transaction."

### Q2: "How does your permission system handle a Dean versus a Department Head versus a Store Manager?"
> **Answer**: "We implemented a 3-Tier Scope System: `GLOBAL`, `ORGANIZATION`, and `STORE`. A Department Head has an `ORGANIZATION` scope covering their specific department and cascading down to child units. A Store Manager has a `STORE` scope restricted to their store. Holding a permission key like `inventory.issue` is invalid unless the user also holds matching scope over the target entity."

### Q3: "What happens during a transfer when the Destination Store Manager approves? Doesn't that manager lack permission over the Source Store?"
> **Answer**: "This is handled by our **Workflow-Authorized Execution** pattern. When a 3-step workflow reaches full approval, execution is authorized by the *completed workflow chain* (passing `authorizedByWorkflow: true` to `MovementService`). This prevents scope-mismatch deadlocks while maintaining strict security."

### Q4: "How do you prevent circular references in the university organizational tree (e.g. Department A becoming the parent of College B)?"
> **Answer**: "In `OrganizationService.update()`, before updating `parentId`, we execute a recursive ancestor traversal algorithm. If the proposed parent ID exists anywhere within the target unit's descendant subtree, the system throws a `400 BadRequestException` preventing cycles."

### Q5: "How does the system prevent race conditions if two users approve requests simultaneously?"
> **Answer**: "All movement applications use Prisma serializable transaction isolation (`isolationLevel: Serializable`) and unique `executionKey` idempotency tokens (e.g. `request:ID:transfer`). If an execution key has already been processed, duplicate executions are safely ignored."

---

## 6. Real-World Case Study: 100 Desktop Computers Procurement & Multi-Store Distribution

### Scenario Summary
Arba Minch University procures **100 Desktop Computers** from an external vendor. The computers arrive at the Central Property Warehouse and must be distributed across 4 different academic and administrative stores:
- **40 Computers** → Computer Science Department Store
- **30 Computers** → Information Technology Department Store
- **20 Computers** → Library Store
- **10 Computers** → Administration Office Store

---

### Step-by-Step System Operational Flow

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ 1. Purchase Request &  │      │ 2. Central Receiving   │      │ 3. Fixed Asset Tagging │
│    Approval Workflow   ├─────►│    Goods Receipt (GRN) ├─────►│    & Serial Registry   │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
                                                                             │
                                                                             ▼
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ 6. End-User Issuance   │      │ 5. Local Store Receipt │      │ 4. Multi-Allocation    │
│    to Staff / Labs     │◄─────┤    Confirmation        │◄─────┤    Distribution Plan   │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

#### Phase A: Procurement & Central Stock Ingestion
1. **Purchase Requisition**:
   - The Procurement Officer / ICT Directorate logs into the Web UI and submits a **Purchase Request** (`PURCHASE_REQUEST`) for 100 units of item `Desktop Computer` (Category: *IT Equipment*, `serialRequired: true`).
   - The request routes through the multi-step approval workflow: *Finance Officer Approval → Vice President Approval → Procurement Clearance*.
2. **Goods Receipt Note (GRN) Generation**:
   - Upon physical vendor delivery, the Central Store Manager opens **Procurement & Goods Receipt** (`/procurement`).
   - Creates a **Goods Receipt**, verifying that 100 computers match the PO.
   - The system executes `MovementService.applyMovement('PURCHASE_RECEIVE')`, adding 100 computers to the `Central Property Store` inventory (`StoreInventory.quantity += 100`).
3. **Fixed Asset Registry Creation**:
   - Because `Desktop Computer` has `serialRequired: true`, the system generates 100 individual `Asset` records (`AMU-PC-2026-001` through `AMU-PC-2026-100`) linked to vendor serial numbers. Status: `AVAILABLE` at `Central Property Store`.

#### Phase B: Multi-Department Distribution Plan
4. **Distribution Plan Construction**:
   - The Central Property Directorate opens **Distribution** (`/distribution`).
   - Creates a **Distribution Plan** linked to the Goods Receipt, specifying 4 allocation lines:
     - Line 1: 40 units → `CS Department Store`
     - Line 2: 30 units → `IT Department Store`
     - Line 3: 20 units → `Library Store`
     - Line 4: 10 units → `Administration Store`
   - Plan is submitted and approved.

#### Phase C: Physical Dispatch & Atomic Stock Handshake
5. **Dispatch & Transfer Out**:
   - Central Store dispatches the physical items. The system executes `TRANSFER_OUT` movements from `Central Property Store`.
   - Central stock decreases from 100 → 0.
6. **Local Store Receipt Confirmation**:
   - As each truck arrives at a recipient store:
     - The CS Store Manager logs in, opens **Distribution** → Clicks **Confirm Receipt (40 units)**.
     - The system executes `TRANSFER_IN` movement at `CS Department Store` (`+40 units`).
     - Asset tags `AMU-PC-2026-001` to `040` update their store location to `CS Department Store`.
     - The IT, Library, and Admin store managers confirm their respective receipts in the same manner.

#### Phase D: End-User Issuance & Lab Assignment
7. **Issuing to Personnel / Computer Labs**:
   - A CS Lecturer files an `ITEM_REQUEST` for 1 computer for their office, or a `BORROW_REQUEST` for a computer lab batch.
   - Upon approval by CS Department Head & CS Store Manager, the asset status updates to `IN_USE` or `BORROWED` with full user custody tracking.

---

## 7. Step-by-Step Web GUI Walkthrough Script (Click-by-Click)

### Scenario Setup:
- **Base Application URL**: `http://localhost:5173` (or via Nginx at `http://localhost:8080`)
- **Default Password for all accounts**: `ChangeMe123!`

---

### PART 1: Filing & Approving the Purchase Request (100 Computers)

#### Step 1.1: Submit Purchase Request as Requester
1. Navigate to `http://localhost:5173/login`.
2. **Email**: `wftest.requester@amu.edu.et` | **Password**: `ChangeMe123!`. Click **Sign In**.
3. In sidebar, click **Requests** (`/requests`).
4. Click top-right button: **+ New Request**.
5. Fill form:
   - **Request Type**: Click **Purchase Request** tab.
   - **Requested items**: Select `Laptop Dell Latitude` in dropdown, Type `100` in Quantity.
   - **Notes (optional)**: Type `Annual Computer Lab Refresh for Engineering Colleges`.
6. Click **Create draft** button.
7. On the Request Detail screen (`/requests/:id`), click **Submit Request** to send it into approval workflow.
8. *Observe*: Status becomes yellow badge **`PENDING_APPROVAL`** (Step 1: Department Head Approval). Notice bell icon increments.

#### Step 1.2: Step 1 Approval as Department Head
1. Click top-right avatar → **Log Out**.
2. **Email**: `wftest.depthead@amu.edu.et` | **Password**: `ChangeMe123!`. Click **Sign In**.
3. In sidebar, click **Approvals** (`/approvals`) (notice red badge `1`).
4. Locate request: *Purchase Request for 100 units of Laptop Dell Latitude*.
5. Click green **Approve** button → Type comment: `Approved for CS & IT Labs upgrade` → Click **Confirm Approval**.
6. *Observe*: Request advances to Step 2 Approval.

#### Step 1.3: Step 2 Final Approval as Store Manager
1. Log out → Log in as **Email**: `wftest.sourcemanager@amu.edu.et` | **Password**: `ChangeMe123!`.
2. Click **Approvals** (`/approvals`).
3. Click **Approve** on the request → Type comment: `Stock allocation cleared for purchase` → Click **Confirm Approval**.
4. *Observe*: Status updates to green badge **`COMPLETED`**. Behind the scenes, NestJS generates a `PurchaseOrder` record.

---

### PART 2: Central Receiving & Goods Receipt (Vendor Delivery)

#### Step 2.1: Record Delivery as Admin
1. Log out → Log in as **Email**: `admin@amu.edu.et` | **Password**: `ChangeMe123!`.
2. In sidebar, click **Procurement** (`/procurement`).
3. Click **+ Create Goods Receipt** button.
4. Fill form:
   - **Store**: Select `Workflow Test Source Store`.
   - **Supplier**: Select `Ethio-Telecom IT Suppliers`.
   - **Receipt Number**: Type `GRN-2026-00100`.
   - **Item**: Select `Laptop Dell Latitude`.
   - **Accepted Quantity**: Type `100`.
5. Click **Save Goods Receipt**.
6. *Observe*:
   - Check **Inventory** (`/inventory`) → `Workflow Test Source Store` stock increases to **100 units**.
   - Check **Assets** (`/assets`) → 100 individual asset tags (`AMU-LAP-2026-001` through `100`) are created in `AVAILABLE` status!

---

### PART 3: Multi-Store Distribution Plan & Dispatch

#### Step 3.1: Create Distribution Plan as Admin
1. Logged in as `admin@amu.edu.et`, click **Distribution** (`/distribution`) in sidebar.
2. Click **+ New Distribution Plan** button.
3. Fill form:
   - **Plan Title**: Type `100 Computers Multi-College Distribution`.
   - **Source Store**: Select `Workflow Test Source Store`.
4. Add Allocation Lines:
   - **Line 1**: Item `Laptop Dell Latitude`, Destination Store: `Workflow Test Destination Store`, Quantity: `40`.
   - **Line 2**: Item `Laptop Dell Latitude`, Destination Store: `ICT Store`, Quantity: `60`.
5. Click **Create & Approve Plan**.
6. *Observe*: Plan status becomes `APPROVED`. The system executes `TRANSFER_OUT` from `Workflow Test Source Store` (Stock drops from 100 → 0).

---

### PART 4: Destination Store Receipt Confirmation

#### Step 4.1: Confirm Receipt as Destination Store Manager
1. Log out → Log in as **Email**: `wftest.destmanager@amu.edu.et` | **Password**: `ChangeMe123!`.
2. In sidebar, click **Distribution** (`/distribution`).
3. Click **Pending Receipts** tab → Locate line: *40 Units of Laptop Dell Latitude assigned to your store*.
4. Click green **Confirm Receipt** button → Type note: `Received 40 units in good physical condition` → Click **Confirm**.
5. *Observe*:
   - Status updates to `CONFIRMED`.
   - System executes `TRANSFER_IN` at `Workflow Test Destination Store` (`+40 units`).
   - Check **Inventory** (`/inventory`) → Quantity shows **40 units**.
   - Asset tag locations update to `Workflow Test Destination Store`!

---

### PART 5: Audit Log & Reports Verification

1. Log in as `admin@amu.edu.et` → Click **Audit Log** (`/audit`).
2. Filter by Entity: **Request** or **Asset** → Click **View diff** to inspect side-by-side JSON snapshots of `before` and `after` states.
3. Click **Reports** (`/reports`) → Click **Export CSV** or **Export PDF** to show downloaded formatted files.


