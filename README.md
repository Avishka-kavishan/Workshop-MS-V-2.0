# Integrated Planning & Monitoring Information System (MoE-IPMIS)
*Ministry of Education - Sri Lanka*

A national-level enterprise web application built with **Next.js 14**, **TypeScript**, and **Government Design System**, unifying **Branch-level Budgetary Planning (Stage 1)**, **Ministry Budget Formulation & Speech Inputs (Stage 2)**, **Annual Implementation Plan (AIP)**, **Capacity Building / Workshops**, and **Multi-Tier Field Monitoring**.

> **Future Integration Note**: Designed with clean domain separation so it can be seamlessly embedded into the **Budget Management System as the Workshop Management module** without redesigning the core workflow or schemas.

---

## 🏛️ Organizational Hierarchy (4 Levels)

The system enforces strict hierarchy-based access control and target organization permission filtering:

| Level | Organization Type | Description | System Unit Rule |
| :--- | :--- | :--- | :--- |
| **Level 1** | **MOE / NIE** | Ministry of Education & National Institute of Education | **An MOE Branch is treated as one organizational user unit** (e.g., `MOE – ICT Branch`, `MOE – Planning Branch`, `MOE – Finance Branch`). Internal divisions do not act as separate hierarchy levels. |
| **Level 2** | **Province** | Provincial Departments of Education | Controls all educational zones and institutions within the province (e.g. `Southern Province Education Department`). |
| **Level 3** | **Zone** | Zonal Education Offices | Coordinates and reviews workshops for schools and divisions within the zone (e.g. `Galle Zonal Education Office`, `Colombo Zonal Office`). |
| **Level 4** | **Other Institutions** | Divisional Education Offices & Schools | Participating institutions and schools (e.g. `Galle South Divisional Office`). |

---

## 🚀 Key Features

1. **Hierarchy-Based Access Control & Target Selection**:
   - When an **MOE ICT Branch** user plans a workshop, the target organization dropdown dynamically permits targeting all provinces, zones (e.g. **Galle Zone**), or divisions.
   - Provincial directors can target zones within their province.
   - Zonal directors can target schools and divisions within their zone.
2. **Workshop Registration**:
   - System-generated Workshop ID (`WS-YYYY-XXXX`).
   - Title, Category, Objective, Description, Venue, Dates, Organizing Unit, Target Organization, and Expected Trainees.
   - Option to save as **Draft** or **Submit for Review immediately**.
3. **Trainee Management**:
   - Add, edit, remove, and view trainees.
   - Captures: Name, NIC/Employee ID, Designation, Organization/School, Email, Phone, Attendance Status (`Registered`, `Attended`, `Absent`), and Remarks.
   - Trainee capacity vs. expected progress indicators.
4. **Resource Person Management**:
   - Add, edit, remove, and view resource persons.
   - Captures: Name, Organization/University, Designation, Area of Expertise, Role in Workshop (`Lead Facilitator`, `Trainer`, etc.), Contact details, and Remarks.
5. **Workshop Lifecycle Status Workflow & Approvals**:
   - 9 Lifecycle Statuses:
     - `Draft`
     - `Submitted`
     - `Under Review`
     - `Approved`
     - `Returned for Revision`
     - `Rejected`
     - `Ongoing`
     - `Completed`
     - `Cancelled`
   - Complete audit trail logging: records reviewer, action taken, comments, timestamp, and status transition.
6. **Executive Dashboard & Reporting**:
   - Status distribution breakdown, target organization charts, real-time KPI metrics.
   - Printable reports and CSV export functionality.
7. **Demo Persona Fast-Switcher**:
   - Header dropdown and login screen fast-switchers allow instant testing between different hierarchy tiers (National Admin, MOE Branch Directors, Provincial Directors, and Zonal Directors).

---

## 🔑 Four Main User Types & System Credentials

Default password for all accounts: `123` (or `password123`)

### 1. Type 1: Super Administrator (Apex Level 0)
| Account | Username | Authority Scope | Available Modules |
| :--- | :--- | :--- | :--- |
| **Ministry Chief Super Admin** | `superadmin` | Unrestricted sovereign apex authority across all 6 administrative tiers | Full access to everything, Admin Console (`/admin`), System Audit Logs (`/admin/audit-logs`), and level admin creation with level chooser |

### 2. Type 2: Level Administrators (Levels 1 to 5)
*Usernames follow standard naming: `moe` for Level 1, and `level.province` / `level.zone` (e.g. `ped.sp`, `zeo.galle`, `deo.galle`)*
| Administrative Level | Username | Alias | Jurisdiction / Scoping |
| :--- | :--- | :--- | :--- |
| **Level 1 — Ministry of Education (MOE)** | `moe` | `moe.admin` | Line ministry national HQ, 88 branches, macro ceilings, AIP approvals |
| **Level 2 — National Apex Body** | `nie.admin` | `nie` | Autonomous apex institution (NIE / EPD / DoE) |
| **Level 3 — Provincial Education Dept.** | `ped.sp` | `provincial.admin` | Southern Province (horizontal isolation from other provinces) |
| **Level 4 — Zonal Education Office** | `zeo.galle` | `zonal.admin` | Galle Zone, child divisions and schools, zonal IT centers |
| **Level 5 — Divisional Education Office** | `deo.galle` | `divisional.admin` | Galle Division local school clusters and field activities |

### 3. Type 3: Special Branches — Dual Roles (Governance + Operational)
*Features instant seamless role switching via the top navigation bar*
| Branch | Governance User | Operational User | Powers & Dual Role Scope |
| :--- | :--- | :--- | :--- |
| **Policy Planning Division** | `planning.officer` | `planning` | Governance: 2-stage review, ceilings, vote allocation, AIP approval & dispatch<br>Operational: Branch internal proposals & workshops |
| **Quality Assurance & Monitoring** | `monitoring.officer` | `monitoring` | Governance: M&E portal oversight, independent verification, field inspections<br>Operational: Branch monthly progress returns |
| **Data Management & Systems** | `admin` | `data` / `data.management` | Governance: Level 1 Admin console, user role management, system settings<br>Operational: EMIS & cloud training workshops |
| **Education Quality Development** | `eqd.officer` | `eqd` | Governance: Division-wide workshop oversight across all subject branches<br>Operational: Branch internal training proposals |

### 4. Type 4: Normal Branch Users (Strictly Restricted Access)
*Normal branch users are strictly restricted to 6 modules ONLY: **Dashboard, Budget Planning, Annual Plan (AIP), Monitoring & Verification, Schedule Workshop, Register Person**.*
*Admin Console (`/admin`), System Audit Logs (`/admin/audit-logs`), Hierarchy (`/organizations`), and Reports (`/reports`) are hidden from navigation and guarded by 403 Access Denied.*
| Branch / Division | Primary Username | Testing Alias | Role |
| :--- | :--- | :--- | :--- |
| **ICT Education Division** | `ict` | `ict.officer` | MOE Officer / Planner |
| **Digital Infrastructure Unit** | `digital.infra` | `digital` | MOE Officer / Planner |
| **Education Reforms Division** | `reforms` | `reforms.officer` | MOE Officer / Planner |
| **Teacher Education (NCOE)** | `ncoe` | `ncoe.officer` | MOE Officer / Planner |
| **Piriven Education Division** | `piriven` | `piriven.officer` | MOE Officer / Planner |
| **Agriculture & Environment** | `agri` | `agri.officer` | MOE Officer / Planner |
| **Mathematics Division** | `maths` | `maths.officer` | MOE Officer / Planner |
| **Health & Nutrition Division** | `health` | `health.officer` | MOE Officer / Planner |
| **Curriculum Development** | `curriculum` | `curriculum.officer` | MOE Officer / Planner |

---

## 🛠️ How to Run Locally

### Option A: With PostgreSQL Backend (Recommended for Production & Vercel)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file (or copy from `.env.example`):
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/workshop_ms
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=workshop-management-system-secret-key-2026
   ```
   *(Works seamlessly with local PostgreSQL, Supabase, Neon, AWS RDS, or Vercel Postgres)*

3. **Initialize & Seed PostgreSQL database**:
   ```bash
   npm run db:init
   ```
   *(This creates all relational tables, foreign keys, performance indexes, and seeds initial data from `database.json`)*

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Verify database connection**:
   Visit [http://localhost:3000/api/db-status](http://localhost:3000/api/db-status) to confirm PostgreSQL status and table row counts.

---

### Option B: Without PostgreSQL (Local JSON Fallback)

If no `DATABASE_URL` is configured, the system automatically falls back to the embedded local JSON database:

```bash
# 1. Install dependencies
npm install

# 2. Seed JSON database with initial educational hierarchy and sample workshops
node src/lib/seed.js

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📚 System Specifications, FRS, SRS & Architecture Documentation

The complete engineering documentation suite conforming to IEEE Std 830-1998, MoE Traffic Light System standards, and ISO/IEC 27001 is maintained in both Word (`.docx`) and Markdown (`.md`):

1. **Functional Requirements Specification (FRS v2.5.0)**:
   - Word Document: [`IPMIS_Functional_Requirements_Specification_FRS.docx`](./IPMIS_Functional_Requirements_Specification_FRS.docx)
   - Markdown Specification: [`docs/FUNCTIONAL_REQUIREMENTS_SPECIFICATION_FRS.md`](./docs/FUNCTIONAL_REQUIREMENTS_SPECIFICATION_FRS.md)
2. **Software Requirements Specification (SRS v2.5.0)**:
   - Word Document: [`IPMIS_Software_Requirements_Specification_SRS.docx`](./IPMIS_Software_Requirements_Specification_SRS.docx)
   - Markdown Specification: [`docs/SOFTWARE_REQUIREMENTS_SPECIFICATION_SRS.md`](./docs/SOFTWARE_REQUIREMENTS_SPECIFICATION_SRS.md)
3. **Data Flow Diagrams & System Architecture**:
   - Comprehensive Specification: [`docs/DATA_FLOW_DIAGRAMS_AND_ARCHITECTURE.md`](./docs/DATA_FLOW_DIAGRAMS_AND_ARCHITECTURE.md)
   - DFD Level 0 Context Model: [`docs/diagrams/dfd_level_0_context.png`](./docs/diagrams/dfd_level_0_context.png)
   - DFD Level 1 Subsystem Flow: [`docs/diagrams/dfd_level_1_overview.png`](./docs/diagrams/dfd_level_1_overview.png)
   - DFD Level 2 Lifecycle Model: [`docs/diagrams/dfd_level_2_aip_workshop.png`](./docs/diagrams/dfd_level_2_aip_workshop.png)
   - Role Hierarchy & 4D-RBAC: [`docs/diagrams/role_hierarchy_access_control.png`](./docs/diagrams/role_hierarchy_access_control.png)
   - Full 3-Tier System Architecture: [`docs/diagrams/system_architecture_diagram.png`](./docs/diagrams/system_architecture_diagram.png)

### Key Recent Baseline Additions (v2.5.0)
- **Dual-Window 6-Tile Management Dashboard**: High-density executive command layout arranged across two 1280 × 760 px HD windows (1280 × 1520 px total), featuring branch performance curves, interactive Sri Lanka map, calendar, auto-generated Gantt timeline, planned vs actual S-curves, and 5-group KPI indicators.
- **Multi-Tier Live Updating Engine**: Cross-tab real-time event synchronization via `BroadcastChannel` API and storage fallbacks (`src/lib/broadcastSync.ts`), 12-second background polling without layout shift, and tab focus resync.
- **Modernized Global Header & Navigation**: Slim 44px sticky navigation bar with clickable breadcrumb navigation drawer, top-right user profile capsule (`Welcome, MOE ICT Branch (ICT)`), and high-visibility active red notification bell with radar ping.

