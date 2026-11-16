# Ministry of Education Sri Lanka
## Integrated Planning & Monitoring Information System (MoE-IPMIS)
### Software Requirements Specification (SRS)
*Conforming to IEEE Std 830-1998 Recommended Practice for Software Requirements Specifications*

**Document Identifier:** MOE-IPMIS-SRS-2026-V2.5  
**Release Version:** Version 2.5.0 (Dual-Window 6-Tile Management Dashboard & Live Sync Baseline)  
**Effective Date:** 14 November 2026  
**Lead Technical Authority:** Data Management & Information Systems Development Unit (DMISDU)  
**Target Runtime:** Next.js 14 (App Router), Node.js 20 LTS, PostgreSQL 15+, Tailwind CSS 3.4  
**Desktop Viewport Constraint:** 1440 × 900 px & 1280 × 1520 px Dual-Window Responsive Display  
**Security Standard:** 4D Role-Based Access Control (4D-RBAC), Salted Bcrypt Hashing, Immutable Audit Logs  

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) provides the definitive software engineering specification for the Ministry of Education Integrated Planning & Monitoring Information System (MoE-IPMIS). It defines the software architecture, functional requirements, external interfaces, non-functional quality attributes, and traceability matrices governing development, deployment, and auditing.

### 1.2 Product Scope
MoE-IPMIS is the national digital platform for multi-tier educational planning, annual implementation plan (AIP) matrix formulation, workshop execution, field monitoring observations, independent QA verification audits, and real-time executive dashboard telemetry.

---

## 2. External Interface Requirements

### 2.1 User Interfaces (UI)
- **Public Transparency Landing Page**: Symmetrical two-column executive display featuring multi-year performance curves, interactive Sri Lanka provincial map with 6-tier traffic lights, separated physical (73%) and financial (31%) progress cards, and MoE Planning timestamp baseline.
- **Single-Screen Side-by-Side Login**: Institutional sign-in window (1440 × 900 px, 0 px vertical overflow) with crest logo, Ministry branding, and authenticated credentials pane.
- **Dual-Window 6-Tile Management Dashboard**: Arranged across two 1280 × 760 px HD windows (1280 × 1520 px total):
  - *Window 1 (Executive Top Section)*: Physical/Financial Achievement Curves, Province-Wise Coverage Map, Calendar.
  - *Window 2 (Main Management Section)*: Auto-Generated Implementation Timeline (Gantt), 02. Progress Monitoring S-Curve, Management Summary & KPIs.
- **44px Global Sticky Header & Breadcrumb Drawer**: Slim 44px sticky navigation bar with clickable breadcrumb drawer accessing all 11 system modules, user identity capsule (`Welcome, MOE ICT Branch (ICT)` with name first then logo), and high-visibility active red notification bell.
- **Interactive Live Sync Ribbon Beacon**: Embedded in the dark blue executive ribbon featuring a green connection beacon (`● Live Sync ↻`) with continuous rotating sync state and instant on-demand refresh.

### 2.2 Software & Communication Interfaces
- **Database Interface**: Node-postgres (`pg`) connection pooling interfacing with PostgreSQL over TCP/IP SSL with local filesystem JSON snapshot fallback.
- **Authentication Service**: NextAuth.js v4 implementing encrypted JWT session tokens with 24-hour expiration, client cookies, and salted bcrypt credential verification.
- **Communications**: HTTPS TLS 1.3 protocol. REST API route handlers (`/api/system/telemetry`, `/api/system/last-updated`, `/api/workshops`, `/api/annual-plan`, `/api/monitoring`) transferring JSON payloads with HTTP `Cache-Control` micro-caching.
- **Cross-Tab Synchronization**: Browser `BroadcastChannel` API (`ipmis_live_sync`) with `localStorage` storage event fallback for sub-50ms live updates.

---

## 3. System Features & Software Functional Requirements

| Requirement ID | Feature Description | Priority | Input / Stimulus | Processing Logic & Output State |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-SEC-01** | Institutional Authentication | Critical | Username & Password | Validates credentials using salted `bcrypt.compareSync`. Issues signed JWT session token. |
| **REQ-SEC-02** | 4D Access Control Guard | Critical | API request & JWT Session | Evaluates administrative level (0–5), functional division, and organization ID. Returns 403 on breach. |
| **REQ-SEC-03** | Conditional Workshop Visibility | High | Public vs Auth Session | RegionalMap suppresses 'View Workshops →' link if session is null, rendering only 'Close' button. |
| **REQ-MTEF-01** | Treasury Budget Ceilings | High | Ceiling allocation form | Records capital and recurrent ceilings by financial year. Enforces statutory upper allocation limits. |
| **REQ-AIP-01** | 25-Column AIP Formulation | Critical | National AIP entry form | Validates project codes, quarterly targets, and estimated costs. Generates unique `aipActivityCode`. |
| **REQ-AIP-02** | 29-Column Provincial AIP | Critical | Provincial AIP entry form | Extends 25-col schema with `zoneId`, `schoolTypology`, and `implementingAgency` fields. |
| **REQ-AIP-03** | AIP Amendment Control | High | Amendment request form | Flags approved activities as 'Amendment Pending'. Requires formal review by Planning Division before changes take effect. |
| **REQ-WS-01** | Workshop Scheduling | High | Workshop creation modal | Auto-generates sequential `workshopNumber` (e.g., WS-0056). Performs venue clash detection. |
| **REQ-WS-02** | Trainee Roster Management | High | Teacher enrollment batch | Registers in-service teachers by NIC and school. Records attendance status and calculates allowances. |
| **REQ-WS-03** | Calendar RFC 5545 Sync | Medium | Subscribe Calendar button | Generates dynamic `.ics` URL subscribing officer to automated workshop push notifications across Google/Apple/Outlook. |
| **REQ-EXP-01** | Three-Tier Cost Tracking | Critical | Voucher entry form | Tracks EstimatedCost, Commitments, and ActualPaid. Calculates budget variance $\Delta B$ and flags overruns. |
| **REQ-MON-01** | Field Inspection Logging | High | M&E Observation form | Captures inspection findings, categorization, severity (Critical/High/Medium/Low), and evidence attachments. |
| **REQ-MON-02** | Corrective Action Tracking | High | Remedial action plan form | Assigns remedial deadlines and responsible officers. Tracks state transitions from Open to Under Review to Resolved. |
| **REQ-QA-01** | Evidence Verification Audit | Critical | QA Dossier inspection | Compares self-reported physical % and spend against verified evidence. Updates VerificationRecord status. |
| **REQ-QA-02** | QA Verification Index (QVI) | High | Telemetry trigger | Computes $(\text{Verified\_Activities} / \text{Total\_Activities}) \times 100\%$. Incorporates index into executive telemetry. |
| **REQ-TEL-01** | Real-Time Telemetry Rollup | Critical | GET `/api/system/telemetry` | Computes National Execution Rate ($\text{NER} = 0.55\times\text{PAR} + 0.45\times\text{BUR}$) and calibrated provincial progress scores. |
| **REQ-TEL-02** | MoE Traffic Light Engine | Critical | Progress percentage score | Applies 6-tier color scale (Green, Light Green, Yellow, Amber, Light Red, Red) to all provincial SVG polygons. |
| **REQ-TEL-03** | Dynamic Scoped Timestamp | High | GET `/api/system/last-updated`| Returns officer's organization last-updated time for logged users; returns MoE Planning baseline for public users. |
| **REQ-GOV-01** | Immutable Audit Logging | Critical | Any CRUD modification | Appends immutable record to SystemAuditLog containing timestamp, userId, entityType, action, and JSON diff. |
| **REQ-DASH-01** | Dual-Window 6-Tile Layout | Critical | GET `/dashboard` | Renders 6 management tiles across 2 windows (1280x1520 HD): Achievement Curves, Province Map, Calendar, Gantt Timeline, S-Curve, and KPIs. |
| **REQ-DASH-02** | Implementation Timeline Gantt | High | AIP activity records | Maps planned vs actual completion horizons across Q1-Q4 with milestone delivery, division filtering, and status tabs. |
| **REQ-DASH-03** | Progress Monitoring S-Curve | High | Monthly cumulative progress | Plots planned blue vs actual green cumulative progress curves with live gap tracking (-24%) and status classification. |
| **REQ-DASH-04** | Management Summary & KPIs | High | Telemetry KPI dataset | Aggregates numerical counters and progress bars across Workshops, AIP Activities, Budget Utilization, Amendments, and Actions. |
| **REQ-DASH-05** | Tile-Level 3-Dots Action Menu | High | UI Card Header | Renders a 3-dots action menu button (`...`) on the left top corner of each of the 6 tiles, triggering a dropdown with export and telemetry options. |
| **REQ-DASH-06** | Excel & PDF Export Engine | Critical | `TileActionMenu` & `dashboardExport.ts` | Formats and downloads tile-specific datasets as Excel-compatible CSV (UTF-8 BOM) and printable institutional PDF dossiers with official MoE headers and sign-off blocks. |
| **REQ-SYNC-01** | Multi-Tier Live Updating Engine | Critical | BroadcastChannel & storage | Dispatches and catches instantaneous cross-tab synchronization events on any mutation, updating open dashboards without full reloads. |
| **REQ-SYNC-02** | Silent Background Poller | High | 12s background polling timer | Silently fetches latest telemetry, workshops, and timestamps every 12 seconds with zero layout shift and zero UI flicker. |
| **REQ-UI-01** | 44px Sticky Header & Breadcrumbs | High | Global layout navigation | Slim 44px header bar featuring clickable breadcrumb drawer with direct jump links to all 11 core pillars and operations. |
| **REQ-UI-02** | Top-Right User Profile Capsule | Medium | Session user & branch data | Displays 'Welcome, {branchName}' text first followed by circular abbreviation logo badge, positioned next to notification bell. |
| **REQ-UI-03** | High-Visibility Notification Alert | High | Active notification count | Renders crimson red (#DC2626) bell, soft red alert tint (#FEF2F2), glowing radar ping pulse, and badge counter when unread notices > 0. |

---

## 4. Non-Functional Software Requirements

### 4.1 Performance & Latency Benchmarks
- **Telemetry Response Time**: GET `/api/system/telemetry` responds in $< 80\text{ ms}$ on cached hits and $< 700\text{ ms}$ on cold cache recalculations.
- **Timestamp API Response Time**: GET `/api/system/last-updated` responds in $< 70\text{ ms}$.
- **Live Sync Latency & Visual Stability**: Cross-tab `BroadcastChannel` synchronization latency $< 50\text{ ms}$. Silent background polling runs with $0\text{ px}$ layout shift and $0\text{ ms}$ UI blocking time.
- **Hardware Acceleration**: Tile animations, map polygon hover states, and SVG charts GPU-accelerated via `transform: translateZ(0)` to maintain consistent 60 FPS rendering.
- **Concurrent Users**: Server architecture supports 500 concurrent administrative sessions without performance degradation.

### 4.2 Security & Data Protection
- **Password Cryptography**: Passwords stored strictly as salted hashes generated via bcrypt with minimum work factor of 10.
- **Session Security**: JWT sessions encrypted with server-side `NEXTAUTH_SECRET`, enforcing HTTP-only secure cookie transport and 24-hour expiration.
- **Input Sanitization**: All user inputs sanitized to eliminate Cross-Site Scripting (XSS) and SQL injection vulnerabilities.
- **Audit Integrity**: System audit logs are append-only; database security forbids `UPDATE` or `DELETE` statements on the `SystemAuditLog` table.

---

## 5. Requirements Traceability Matrix (RTM)

### 5.1 System Baseline Requirements (SYS-01 to SYS-09)

| Requirement ID | Functional Title | FRS Reference | Code Component / API Route | Verification Status & Test Path |
| :--- | :--- | :--- | :--- | :--- |
| **SYS-01** | Role-Based Access Control | FRS § 2.1, 3.12 | `src/lib/auth.ts`, `src/lib/permissions.ts` | **VERIFIED** — 11 roles, 6 administrative levels, and functional category gates. |
| **SYS-02** | Administrative Hierarchy | FRS § 2.1, 3.12 | `src/lib/db.ts`, `src/app/organizations` | **VERIFIED** — 6-tier relational hierarchy (Ministry → Province → Zone → School), 710 organizations. |
| **SYS-03** | Historical Records | FRS § 3.12 | `data/database.json` (`monthlyProgressReturns`, `aipAmendments`, `budgetRevisions`) | **VERIFIED** — Complete audit trail of monthly returns, AIP amendments, and budget variations. |
| **SYS-04** | Audit Trail | FRS § 3.8, 3.12 | `src/lib/auditLogger.ts`, `src/app/admin/audit-logs` | **VERIFIED** — Super Admin forensic audit log capturing entered, changed, verified, and approved events. |
| **SYS-05** | Workflow Management | FRS § 3.2, 3.5, 3.12 | `src/app/api/annual-plan/submit`, `approve`, `monitoring/verify-return` | **VERIFIED** — Full submission, review, verification, rejection, and approval workflows. |
| **SYS-06** | Notifications | FRS § 7.4, 3.12 | `src/app/api/notifications/route.ts`, `AppShell.tsx` | **VERIFIED** — Automated event alerts with unread badge counter and real-time polling. |
| **SYS-07** | Data Integration | FRS § 3.12 | `src/app/workshops/new`, `import-budget-activities` | **VERIFIED** — Approved AIP and budget data retrieved into workshop scheduling and monthly progress without duplicate entry. |
| **SYS-08** | Reporting | FRS § 3.11, 3.12 | `src/app/annual-plan`, `src/app/reports`, `src/app/admin/audit-logs` | **VERIFIED** — Landscape PDF export, CSV matrices, printable reports, and participant exports. |
| **SYS-09** | Data Security | FRS § 2.3, 3.12 | `src/lib/auth.ts`, `src/app/api/audit-logs` | **VERIFIED** — Bcrypt hashing, NextAuth JWT, 403 API gates, client route guards, and NIC deduplication. |

### 5.2 Core Module Traceability Matrix

| Business Objective | FRS Section | SRS Requirement ID | Implementing Code Component | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| Institutional Security & RBAC | FRS § 2.1 - 2.3, 3.12 | REQ-SEC-01, SYS-01, SYS-09 | `src/lib/auth.ts` | Automated Session & Role Unit Tests |
| Unlogged User Privacy & Access | FRS § 2.2 | REQ-SEC-03 | `src/components/dashboard/RegionalMap.tsx` | Browser Subagent DOM Verification |
| 3-Year MTEF Strategic Budgeting | FRS § 3.1 | REQ-MTEF-01 | `src/app/api/budget`, `data/database.json` | Treasury Ceiling Enforcement Tests |
| Standard 25/29-Col AIP Matrix | FRS § 3.2 | REQ-AIP-01, REQ-AIP-02, SYS-05 | `src/lib/planning-matrix.ts` | Matrix Schema Validation Suite |
| Workshop Delivery & Venues | FRS § 3.3 | REQ-WS-01, REQ-WS-02, SYS-07 | `src/app/workshops`, `src/lib/db.ts` | Venue Clash Detection Tests |
| External Calendar Sync | FRS § 3.3 | REQ-WS-03 | `src/app/api/calendar/subscribe` | RFC 5545 iCalendar Linter |
| Three-Stage Cost Accounting | FRS § 3.4 | REQ-EXP-01, SYS-03 | `src/app/workshops`, `src/lib/db.ts` | Voucher Summation & Variance Tests |
| Field Monitoring & Deviations | FRS § 3.5 | REQ-MON-01, REQ-MON-02, SYS-05 | `src/components/dashboard/RecentMonitoringFeed` | Deviation Severity Escalation Tests |
| Independent QA Verification | FRS § 3.6 | REQ-QA-01, REQ-QA-02, SYS-04 | `src/lib/db.ts`, `VerificationRecord` | Dossier Signoff & QVI Calculation |
| Real-Time Telemetry & Traffic Light | FRS § 3.7, 4.4-4.6 | REQ-TEL-01, REQ-TEL-02 | `src/app/api/system/telemetry` | Telemetry Math & Color Hex Tests |
| Scoped Timestamp Engine | FRS § 7.2 | REQ-TEL-03 | `src/app/api/system/last-updated` | Session vs Public Timestamp Tests |
| Immutable Audit Trail Logging | FRS § 3.8, 3.12 | REQ-GOV-01, SYS-04 | `src/lib/auditLogger.ts`, `src/app/admin/audit-logs` | Tamper-Resistance Audit Tests |
| Dual-Window 6-Tile Dashboard | FRS § 3.9 | REQ-DASH-01 - REQ-DASH-04 | `src/app/dashboard/page.tsx` | 6-Tile Responsive Desktop Tests |
| Real-Time Live Updating Engine | FRS § 3.10 | REQ-SYNC-01, REQ-SYNC-02 | `src/lib/broadcastSync.ts` | Cross-Tab Broadcast Synchronization Tests |
| Global Header & Alert Bell | FRS § 7.4 | REQ-UI-01 - REQ-UI-03, SYS-06 | `src/components/layout/AppShell.tsx` | Header & Red Bell DOM Inspections |

---

## 6. Software Engineering Revision History

| Revision | Release Date | Technical Authority | Software Engineering Baseline Scope |
| :--- | :--- | :--- | :--- |
| **v1.0.0** | 20 Jan 2026 | DMISDU Core Architecture | Initial software architecture specification for workshop tracking. |
| **v1.8.0** | 15 Apr 2026 | Full-Stack Engineering Group | Integration of 25-column AIP matrix schema and PostgreSQL persistence adapter. |
| **v2.0.0** | 25 Aug 2026 | Security & M&E Engineering | Implementation of 4D-RBAC, M&E observation feeds, and QA evidence verification. |
| **v2.2.0** | 28 Oct 2026 | GIS & Frontend Team | Sri Lanka 9-province SVG map integration and MoE Traffic Light System engine. |
| **v2.4.0** | 14 Nov 2026 | DMISDU & MoE Joint Team | Separated progress metrics, side-by-side single-screen login, conditional workshop visibility, and standardized timestamp engine. |
| **v2.5.0** | 14 Nov 2026 | DMISDU & MoE Joint Team | Dual-Window 6-Tile Management Dashboard (1280x1520 HD), Multi-Tier Live Updating Engine via BroadcastChannel, 44px Sticky Header with Clickable Breadcrumb Drawer, High-Visibility Red Notification Bell, and Web Normalization. |
| **v2.6.0** | 15 Nov 2026 | DMISDU & MoE Joint Team | Implementation and formal verification of System Baseline Requirements SYS-01 to SYS-09 (RBAC, 6-Tier Hierarchy, Historical Versioning, Immutable Super Admin Audit Trail, Multi-State Workflow Governance, Automated Event Alerts, Zero-Duplicate Data Integration, Print/PDF Dossier Reporting, and Multi-Layer Data Security). |
