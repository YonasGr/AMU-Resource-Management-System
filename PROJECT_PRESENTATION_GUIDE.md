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
