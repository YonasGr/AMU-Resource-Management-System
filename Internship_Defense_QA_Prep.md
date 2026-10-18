# Internship Defense: Practice Questions and Honest Answer Skeletons

**Project:** AMU Dedicated Store & Resource Management System
**Student:** Yonas Girma · **Host:** Arba Minch University ICT Directorate · **Advisor:** Mr. Taddese A.

> **How to use this file.** Read Part 0 and Part 1 first (15 minutes). Then go through Part 2 out loud, one question at a time. Cover the answer, say yours, then compare. Do not memorize the sample answers word for word. Memorize the *shape* (the skeleton) and say it in your own words.
>
> **Items marked `[FILL IN]`** are things only you know (who did what, how AI was used, the real timeline). I have not guessed them. Write your true answer in the blank before tomorrow.

---

## Part 0: The honesty rule (why this file is written this way)

Examiners rarely expect a perfect system. They check three things:

1. **Do you understand what you built?**
2. **Can you separate what works from what doesn't?**
3. **Are you honest?**

A weak spot you name yourself shows maturity. A weak spot the panel discovers while you claim it works is the worst outcome. So every answer below states what the code *actually* does, including the limits.

**Three sentence-starters that keep you safe:**

- *"At the internship baseline it worked like this... and in later work I changed it to..."*
- *"That is a known limitation. I documented it in my recommendations. The fix would be..."*
- *"I haven't tested that case, but based on how the code works I would expect..."*

---

## Part 1: Know your "baseline vs. now" facts

Your report describes **commit 01b0e84** (the "baseline", 27 commits). The repository today (HEAD) has **183 commits** and a much bigger system. Be clear about which version you are talking about at every moment.

| Topic | Baseline (01b0e84, in your report) | Repository today (HEAD) |
|---|---|---|
| Stock balance | One `StockSummary` row **per material** (not per store) | Added per-store `StockBalance` with reservations |
| Transfer | Writes a ledger row only. **Does not change stock** (README admits this) | Transfer documents: DRAFT → dispatch removes from source → receipt adds to destination |
| Direct stock-out check | Balance read **before** the transaction (race condition) | Request approval/issue use conditional updates (`updateMany` with `remainingQuantity >= qty`, and `count !== 1` triggers a retry error) |
| Request issuance check | Status and stock read **before** the transaction | Reservation at approval time, then guarded decrement at issue |
| Request numbers | `count + 1` (can collide under concurrency) | `request_number_counters` table |
| Audit log | "Append-only" by application convention only | Database trigger `prevent_audit_log_mutation` blocks UPDATE and DELETE |
| Request statuses | PENDING, APPROVED, REJECTED, ISSUED, CANCELLED | Added PARTIALLY_ISSUED, BACKORDERED, CLOSED, etc. |
| Extra modules | None | Purchase orders, goods receipts, cycle counts, outbox, offline sync |

### Things in the report/slides that a sharp examiner could challenge

| Claim | What the code actually shows (baseline) | How to handle it |
|---|---|---|
| "Every stock operation updates store stock balances" | Transfer doesn't update any balance; balances are per material, not per store | Say so openly. Explain it is fixed in later work. |
| "Real-time, dynamically computed" balances | They are **stored** numbers (`StockSummary`), updated inside each transaction | Say "maintained transactionally", not "computed on the fly" |
| Slide 6: concurrency "mitigated" by transactions | A transaction gives atomicity, not protection from stale reads | Say "partially mitigated; full fix needs a check inside the transaction" (slide 8 already says this) |
| "Append-only audit log" | At baseline, only the app avoids updates/deletes. The DB did not enforce it | Say "append-only at application level at baseline, DB-enforced later" |
| Refresh tokens | Stateless, no rotation or revocation. Logout can't invalidate them | Mention as a known gap |
| Hard-coded fallback JWT secrets | Commit `8f9e682` (Oct 10) added default secret strings so deployment wouldn't crash. HEAD uses `getOrThrow` again | Be ready: "That was a temporary deploy fix and I removed it. Production must use real secrets." Confirm your deployed environment has its own secrets. |

### Timeline fact to prepare for

Internship dates in your report: **July 2 to September 2, 2026.** First commit: **July 27.** Baseline commit: **October 8.** The report says the baseline was presented "at the conclusion of the internship." That does not line up neatly. Prepare a true one-sentence explanation (see Q7).

---

## Part 2: Practice questions

Each question has: **What they're testing**, a **Skeleton**, and a **Sample answer** (speak it naturally, around 30 to 60 seconds).

---

### Section 1: Opening and the organization

#### Q1. "Please introduce yourself and your project in one minute."

**Testing:** Can you summarize clearly?

**Skeleton:** Who I am → where → the problem → what I built → result and honesty about scope.

**Sample answer:**
> "I'm Yonas Girma, a final-year IT student at Haramaya University. I did my 45-working-day internship at the Arba Minch University ICT Directorate in the Application Development team. Our task was to replace the university's paper-based store and requisition process. We built a web system where staff request materials, a store manager approves, and a storekeeper issues the items, with every stock movement recorded as a ledger entry and an audit trail. It uses NestJS, PostgreSQL with Prisma, React, and Docker. It works as a validated prototype on seeded data. It is not yet a production deployment, and I'll show you both what works and what I'd harden next."

#### Q2. "Why did you choose ICTD at Arba Minch University?"

**Testing:** Was it a deliberate choice?

**Skeleton:** Your three criteria → why ICTD matched → the comparison you made.

**Sample answer:**
> "The placement letter was open, so I set three criteria: real production-scale IT, dedicated staff who could mentor, and practical software work. ICTD runs the network and enterprise systems for a multi-campus university and has an application development team. I also looked at Arba Minch Referral Hospital, but it had no servers of its own and its HMIS was hosted and managed by AMU's staff, so the capability I wanted was at ICTD."

#### Q3. "What does ICTD do, and where did your team fit?"

**Skeleton:** ICTD's four functions → Application Development team → your project.

**Sample answer:**
> "ICTD manages the campus network, builds and maintains enterprise software, runs helpdesk support, and drives digital transformation. I worked in the Application Development team under Mr. Chirotaw Kentib. Our project was one of those digital-transformation efforts."

---

### Section 2: Your role, teamwork, and integrity

#### Q4. "What exactly did *you* personally do?"

**Testing:** Can you separate your work from the team's?

**Skeleton:** Three or four concrete items, each tied to a file or feature you can open.

**Sample answer (adjust to the truth):**
> "My focus was the data layer, the backend services, and the key requisition screens. Specifically: the Prisma schema, the inventory services for stock in, stock out, returns, adjustments and transfers, the requisition and approval screens in React, and the Docker Compose setup. I can open any of those and walk you through them."

**Tip:** Only claim what you can open and explain right now.

#### Q5. "What did your teammates contribute?"

**Testing:** The report describes a team, but all 183 commits are under your name.

**Skeleton:** Who, what, how it reached the repo, and why the history shows one author.

**Sample answer:**
> "`[FILL IN: names and what each person actually did]`. The commit history shows one author because `[FILL IN: the true reason, for example, work was committed from one account, or teammates worked on separate parts that were merged through me]`."

**Do not** invent contributions. If the team's work was smaller than the report implies, say so plainly. Honest and specific always beats impressive and vague.

#### Q6. "Did you use AI tools to build this?"

**Testing:** Honesty, and whether you can explain the code. Some commit messages in your repo mention "claude", so assume the panel may look.

**Skeleton:** Yes or no (truthfully) → what for → what you verified yourself → proof you understand it.

**Sample answer (if AI was used):**
> "Yes. I used an AI assistant for `[FILL IN: e.g. scaffolding, refactoring, documentation]`. I treated its output like code from a teammate: I read it, ran it, tested it, and fixed what was wrong. For example, I found and documented that the stock-out check happens before the transaction, which is a real limitation. I'm happy to walk through any file on the main workflow and explain every decision."

**Then be ready for:** "Explain this function line by line." Rehearse `requests.service.ts` (`create`, `approveOrReject`, `issueItems`) and `inventory.service.ts` (`stockIn`, `stockOut`).

#### Q7. "Your internship ended September 2, but your baseline commit is October 8. Explain."

**Testing:** Whether the report is accurate.

**Skeleton:** The facts of the timeline → what was done in the 45 days → what was finished after → how the report separates them.

**Sample answer:**
> "`[FILL IN the true sequence]`. For example: the core design, schema, and first working modules were built during the attachment from late July. The version I evaluated in the report is the commit from October 8, where I finished hardening and tests. Everything after that, such as purchase orders and cycle counts, is post-internship work, and I separated it in section 3.8 so it isn't confused with the internship."

**If an examiner pushes:** don't defend, just clarify. "You're right that the dates need to be stated clearly. The first commit is July 27 and the baseline commit is October 8."

#### Q8. "You said you used an Agile-inspired process. What did you really do? Why not Scrum or Waterfall?"

**Skeleton:** Practices actually used → why each alternative didn't fit.

**Sample answer:**
> "We used small increments, isolated Git branches, review, and regular check-ins against the supervisor's use-case diagrams. Waterfall would leave testing to the end of a fixed 45-day window. Full Scrum would add ceremonies a small student team couldn't justify. So I'd call it lightweight Agile, not formal Scrum."

#### Q9. "Give an example of your informal leadership."

**Skeleton:** Situation → what you did → result → lesson.

**Sample answer:**
> "Some teammates hadn't used Git professionally. I showed them branching, pull requests, and resolving merge conflicts. The hard part was explaining without sounding condescending. I learned to explain at their level and to agree on who owns which files, which reduced conflicts."

**Tip:** Use one real moment (`[FILL IN]`), not a generic statement.

---

### Section 3: The problem and requirements

#### Q10. "What problem does this solve, and how do you know it's real?"

**Sample answer:**
> "Store inventory and requisitions were paper-based. That makes stock hard to track, slows requests that cross campuses, and makes audits a manual compilation job. The requirements came from the ICT Directorate's problem description, use-case diagrams, and workflow analysis. We were told to build to those and not to expand scope. `[FILL IN: if you spoke to storekeepers or staff directly, say so; if not, say requirements came from the supervisor.]`"

#### Q11. "How do you measure that the system succeeded?"

**Testing:** Don't overclaim.

**Sample answer:**
> "At this stage success was functional: the full flow of request, approval, issuance, ledger, audit, and reports worked on seeded demo data, and the supervisor reviewed it against the requirements and approved it. I have not measured time saved or error reduction in real use, because it wasn't deployed university-wide. A pilot in ICTD's own store would be the first real measurement. That's in my recommendations."

#### Q12. "Why build this instead of buying or using existing software?"

**Sample answer:**
> "It was assigned as an internship challenge project with defined requirements. Commercial ERP systems are much larger than AMU's store need and expensive. My literature review notes that ERP research in universities in developing countries is limited. Our system is deliberately a small, focused subset: materials, stock, requisitions, audit. It is not an ERP, and the report says so."

---

### Section 4: Design and data model

#### Q13. "Walk me through the architecture."

**Skeleton:** Browser → Nginx → React SPA and NestJS API → Prisma → PostgreSQL, plus Redis.

**Sample answer:**
> "It's a layered client-server design. The React single-page app calls a REST API built in NestJS using JWT. NestJS uses Prisma to talk to PostgreSQL. Redis is used for login rate limiting and lockout. Everything runs as separate containers in Docker Compose, with Nginx as a reverse proxy in production."

#### Q14. "Explain your data model and why you use a ledger plus a summary."

**Skeleton:** Ledger = history; summary = fast current balance; updated together in one transaction.

**Sample answer:**
> "`InventoryTransaction` is the ledger. Every stock movement is a typed row: STOCK_IN, STOCK_OUT, RETURN, ADJUSTMENT, TRANSFER. `StockSummary` stores the current received, issued, and remaining quantity. Reading the summary is fast, and the ledger explains how we got there. The risk is the two drifting apart, so they are written in the same database transaction. If one fails, both roll back."

#### Q15. "Your objective says 'real-time, dynamically computed stock balances.' Are they computed or stored?"

**Testing:** A wording trap.

**Sample answer:**
> "Honestly, the word 'computed' is loose. They are stored values in `StockSummary`, kept current by updating them inside each transaction. They aren't recalculated from the ledger on every read. A reconciliation job that recomputes from the ledger and compares is something I'd add. Later in the repository there's a `findSummaryMismatches` function in that direction."

#### Q16. "Why these technologies? NestJS, Prisma, PostgreSQL, React."

**Sample answer:**
> "PostgreSQL because stock, requests, and audits need relational integrity: foreign keys, constraints, and transactions. Prisma gives type-safe queries and migrations. NestJS gives a modular, dependency-injected structure, which suits a multi-module backend like auth, inventory, and requests. React with TanStack Query handles the interactive screens and server-state caching. I also used TypeScript end to end so mistakes surface at compile time."

#### Q17. "Show normalization in your schema."

**Sample answer:**
> "A request has many items, so items are in their own table `MaterialRequestItem` linked by `requestId`, instead of repeating columns inside the request. Departments, suppliers, materials, and categories are separate tables referenced by IDs. That avoids duplicated data and update anomalies."

---

### Section 5: Workflow and code

#### Q18. "Walk me through a requisition from start to finish."

**Skeleton:** Submit → notify → review (scope check) → approve/reject → issue (transaction) → audit and notifications.

**Sample answer:**
> "A requester picks materials and quantities. The request is saved as PENDING and store managers get a notification. A manager reviews it. The system checks the manager's scope covers that store, then sets APPROVED or REJECTED and notifies the requester. A storekeeper then issues an APPROVED request. In one database transaction it writes STOCK_OUT ledger rows, decreases the stock summary, and marks the request ISSUED. Audit entries and notifications are written for each step."

**Be ready to open:** `requests.service.ts`, functions `create`, `approveOrReject`, `issueItems`.

#### Q19. "What happens if two storekeepers click Issue on the same request at the same time?"

**Testing:** The most likely hard question. At baseline, there is a real flaw.

**Skeleton:** Admit the baseline gap → explain why → explain the fix → say what the repo does now.

**Sample answer:**
> "At the baseline, that's a real weakness. `issueItems` reads the request status and stock levels before the transaction starts, so both users could pass the check on the same stale data, and the request could be issued twice or stock could go negative. The transaction guarantees the writes commit together, but it doesn't prevent two people from reading the same old number. The fix is to put the check inside the transaction using a conditional update, such as decrementing only where `remainingQuantity >= quantity` and failing if no row was updated. In the later code I changed approval and issue to use that pattern, with reservations, and an update count of anything other than one raises an error."

#### Q20. "Why isn't a transaction enough to stop overselling?"

**Sample answer:**
> "A transaction is about atomicity: all writes succeed or none do. Overselling is a concurrency problem: two transactions each read 5 units, each subtract 5, and the result is wrong. You need the check and the write to be one atomic step, such as a conditional `UPDATE ... WHERE remaining >= qty`, a row lock with `SELECT ... FOR UPDATE`, or a stricter isolation level like Serializable."

#### Q21. "What does Transfer do in your system?"

**Testing:** At baseline, transfer is incomplete.

**Sample answer:**
> "At the internship baseline, a transfer recorded a ledger row for the destination department but did not decrease or increase any balance. That was a limitation, and the README says so. In the later work I replaced it with a transfer document: it's created as a draft, dispatching removes stock from the source store, and receiving adds it to the destination store."

#### Q22. "Is stock tracked per store?"

**Sample answer:**
> "At baseline, no. There was one `StockSummary` row per material, shared across stores, although users and requests were tied to stores. Per-store `StockBalance` was added later. I'd list this as a limitation of the baseline."

#### Q23. "How are request numbers and transaction codes generated? Any problems?"

**Sample answer:**
> "At baseline, request numbers were `REQ-year-` plus count + 1, and transaction codes used a timestamp plus a random number. Both can collide under concurrency, and the unique constraint would then fail one request. Later I replaced request numbers with a counter table. Using a database sequence or UUID-based codes is the standard fix."

---

### Section 6: Security

#### Q24. "How does authentication work?"

**Sample answer:**
> "A user logs in with email and password. The server verifies the Argon2 hash and returns a short-lived JWT access token and a refresh token. The client sends the access token on each request and uses the refresh token to renew the session. On every request the JWT strategy also reloads the user and checks they are still ACTIVE, so a deactivated account loses access immediately instead of waiting for token expiry."

#### Q25. "What is the difference between RBAC and scope?"

**Sample answer:**
> "A role says what kind of action you can perform, such as Storekeeper or Store Manager. Scope says where. A Store Manager with STORE scope can approve only for their own store. I implemented this in `AccessControlService.enforceStoreScope`. To be accurate, in the baseline the scope check is applied to store-management actions like approving requests, not every endpoint. The ORGANIZATION scope exists in the model but isn't a universal filter."

#### Q26. "How do you protect against password guessing?"

**Sample answer:**
> "Passwords are hashed with Argon2. Redis counts failed attempts: five failures on an email locks it for 15 minutes, and there's also a per-IP limit of 20 requests per minute. The email lockout check runs before the expensive hash verification."

#### Q27. "What happens to a refresh token when the user logs out?"

**Sample answer:**
> "At baseline, refresh tokens are stateless, so logout only clears them on the client. A stolen refresh token would stay valid until it expires. The improvement is storing refresh tokens (or their hashes) server-side, rotating them on use, and revoking them on logout."

#### Q28. "Is your audit log really tamper-proof?"

**Sample answer:**
> "At baseline it was append-only by application design: the code only inserts and there are no update or delete endpoints. That doesn't stop someone with database access. In the later work I added a PostgreSQL trigger that raises an exception on any UPDATE or DELETE of audit rows. A database administrator could still drop the trigger, so for stronger guarantees you'd ship logs to separate write-once storage."

#### Q29. "Anyone can self-register. Isn't that risky?"

**Sample answer:**
> "At baseline, self-registration creates a Requester only, the lowest-privilege role, so it can't approve or issue anything. Later I added a registration approval flow so an administrator reviews new accounts. For a university system I'd restrict registration to university email addresses."

#### Q30. "Are there any secrets or credentials in your repository?"

**Testing:** Seeded passwords and the fallback-secret commit.

**Sample answer:**
> "The seed script uses development default passwords only when not in production, and refuses to run in production without environment-provided passwords. One deployment commit on October 10 added fallback JWT secrets to avoid boot crashes. That was a mistake for security, and the current code requires the secrets from the environment again. Those old default strings are in Git history, so any deployment must use fresh, strong secrets. `[Check: confirm your deployed environment uses its own secrets.]`"

---

### Section 7: Testing, deployment, and quality

#### Q31. "How did you test the system?"

**Sample answer:**
> "I used Jest unit tests for services and guards, and Supertest end-to-end tests, including an RBAC and store-scope test that checks a manager from one store can't approve another store's requests. I also ran manual scenarios with seeded data and used Swagger to check endpoints before wiring up the frontend. I haven't done load testing or formal user acceptance testing."

#### Q32. "Explain your Docker setup."

**Sample answer:**
> "Docker Compose runs PostgreSQL, Redis, the NestJS API, the Vite frontend, and Nginx. On start, the backend applies Prisma migrations and seeds development data. There are separate development and production Compose files. In production, Nginx is the single entry point and routes to the frontend and API."

#### Q33. "What are the first things you'd fix before real deployment?"

**Skeleton:** Rank by risk: data integrity, security, operations.

**Sample answer:**
> "First, concurrency safety on every stock mutation. Second, secrets and credential rotation, with refresh-token revocation. Third, backups: only a JSON user backup exists, so I'd add scheduled `pg_dump`. Fourth, wire up email alerts, since Nodemailer and BullMQ are only scaffolded. Fifth, a pilot with training for storekeepers and a migration plan for existing paper records."

---

### Section 8: Limits, honesty, and reflection

#### Q34. "Is this production-ready?"

**Sample answer:**
> "No. It's a validated prototype on seeded data and controlled test scenarios. It isn't a full ERP, a financial accounting system, or a fixed-asset ledger. Unit prices are recorded as source-document fields, not for valuation. I stated this in the report so nobody over-reads the results."

#### Q35. "What was the hardest technical challenge?"

**Skeleton:** Problem → what you tried → what you learned → what's still open.

**Sample answer:**
> "Keeping received, issued, and balance numbers consistent. I first thought wrapping everything in a Prisma transaction solved it. Then I realized the check happened before the transaction, so concurrent requests could still conflict. I learned the difference between atomicity and isolation, and I used conditional updates and reservations in the later work."

#### Q36. "What would you do differently?"

**Sample answer:**
> "Design for concurrency from day one rather than retrofitting it. Write the per-store stock model before building features on top of a per-material one. Agree on the scope earlier, since we explored a multi-step approval workflow, procurement, and an asset registry before narrowing to the core store workflow."

#### Q37. "What did you learn that classes didn't teach?"

**Sample answer:**
> "Working in a team with Git branches and review, containerized deployment, and translating an institution's rules into code. Also that data accuracy and audit logging matter more when the system handles university resources."

#### Q38. "Ethics: what are the risks of a system like this?"

**Sample answer:**
> "Wrong stock numbers can hide loss or theft, and a weak audit trail removes accountability. Access control matters because the wrong person approving or issuing has real consequences. Personal data (staff names and emails) needs protection, and the audit log should record who did what without being editable."

#### Q39. "What are your recommendations to ICTD?"

**Sample answer:** Use your report's list: formal handover with permanent maintainers; phased pilot in ICTD's store; training; paper-record migration plan; automated alerts and scheduled backups; concurrency-safe stock-out; QR scanning; server-side Excel/PDF exports; credential rotation before go-live.

---

### Section 9: Curveballs and recovery

#### Q40. "Show us a quick demo."

**Plan (about 3 minutes):**

1. Log in as **Requester**. Create a request.
2. Log in as **Store Manager**. Approve it. Mention the scope check.
3. Log in as **Storekeeper**. Issue it. Show the stock decrease.
4. Show the **ledger** entry and the **audit log**.
5. Show one **report** and the CSV export.

**If the demo fails:** "Let me show you the recorded screenshots, and I'll explain what the code does at this step." Keep screenshots ready.

#### Q41. "Which version are you demonstrating?"

**Sample answer:**
> "I'm demonstrating `[the baseline / the current repository]`. The report documents the baseline at commit 01b0e84. If you see features like purchase orders or cycle counts, those are post-internship work that I separated in section 3.8."

#### Q42. "I think your design is wrong here. (Examiner disagrees with you.)"

**Skeleton:** Listen → acknowledge → explain your reasoning → accept valid criticism.

**Sample answer:**
> "That's a fair point. I chose it because `[reason]`. I can see that `[their concern]` is a real tradeoff, and in a next iteration I would `[change]`."

#### Q43. "I don't know." (When you truly don't.)

> "I haven't worked with that directly, so I don't want to guess. Based on how the system works, I'd expect `[reasoned guess]`, and I'd verify it by `[how]`."

---

## Part 3: One-page cheat sheet

**Numbers and names to recall instantly**

- **Duration:** 45 working days, July 2 to September 2, 2026
- **Supervisor:** Mr. Chirotaw Kentib (Application Development Team Leader) · **Advisor:** Mr. Taddese A.
- **Roles (5):** Administrator, Store Manager, Storekeeper, Auditor, Requester
- **Scopes (3):** GLOBAL, ORGANIZATION, STORE
- **Transaction types (5):** STOCK_IN, STOCK_OUT, RETURN, ADJUSTMENT, TRANSFER
- **Baseline request statuses:** PENDING, APPROVED, REJECTED, ISSUED, CANCELLED
- **Reports:** 8, with CSV export and browser print-to-PDF
- **Backend modules (11):** audit, auth, dashboard, employees, inventory, materials, notifications, reports, requests, suppliers, users
- **Stack:** NestJS 10, Prisma 5.19, PostgreSQL 16, React 18 + Vite, TypeScript, Tailwind, TanStack Query, Zustand, Redis, Docker Compose, Nginx, Jest + Supertest
- **Security:** Argon2 hashing · JWT access and refresh · lockout after 5 failures for 15 min · 20 requests per minute per IP
- **Commits:** 27 at baseline (01b0e84, Oct 8) · 183 at HEAD
- **Seeded departments (6):** STORE-MAIN store, CS, EE, STORE, ADMIN, FIN

**Three sentences to remember**

1. *"A transaction makes writes atomic; it does not make a stale read safe."*
2. *"The ledger is the history; the summary is the fast current number; they change together."*
3. *"Roles say what you can do; scope says where."*

---

## Part 4: Final checklist before the defense

- [ ] Filled in every `[FILL IN]` above with the **true** answer (Q5, Q6, Q7, Q9, Q10)
- [ ] Decided which version to demo and can explain baseline vs. later work
- [ ] Can open and explain `requests.service.ts` and `inventory.service.ts`
- [ ] Can draw the main tables from memory: Material, StockSummary, InventoryTransaction, MaterialRequest, User, Store
- [ ] Practiced the demo path twice with all 3 roles logged in; screenshots as backup
- [ ] Confirmed deployed secrets are not the old fallback strings
- [ ] Fixed small report issues: blank submission date, section 3.8 appearing before 3.7
- [ ] Asked Mr. Taddese the format, length, and who sits on the panel
- [ ] Timed my presentation aloud at least twice
- [ ] Slept

Good luck. You know this project better than anyone on the panel. Stay calm, speak plainly, and be honest about limits.
