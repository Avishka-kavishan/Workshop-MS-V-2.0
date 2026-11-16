# Ministry of Education Sri Lanka
## Integrated Planning & Monitoring Information System (MoE-IPMIS)
### Functional Requirements Specification (FRS)

**Document Identifier:** MOE-IPMIS-FRS-2026-V2.5  
**Release Version:** Version 2.5.0 (Dual-Window 6-Tile Management Dashboard & Live Sync Baseline)  
**Effective Date:** 14 November 2026  
**Issuing Authority:** Data Management & Information Systems Development Unit (DMISDU)  
**Collaborating Divisions:** Policy, Planning & Review Division & Monitoring and Performance Review Division  
**Classification:** Official / National Government Standard  
**Compliance Standards:** MoE Traffic Light System Standard, ISO/IEC 27001 Data Security, National MTEF Guidelines  

---

## 1. Executive Overview & System Background

The Ministry of Education (MoE) of Sri Lanka is constitutionally and administratively responsible for the governance, policy direction, curriculum design, human resource development, and performance monitoring of the General Education Sector nationwide. The institutional hierarchy encompasses the National Ministry, 9 Provincial Departments of Education (PDEs), 100 Educational Zones, Divisional Directorates, and 10,146 government schools catering to over 4.2 million students and 240,000 teachers.

Historically, educational planning, budget preparation, workshop scheduling, in-service teacher training, and monitoring observations operated across disconnected, manual spreadsheets and decentralized paperwork. This fragmentation created critical operational liabilities:
1. Delayed physical implementation tracking.
2. Significant budget variances between allocated Treasury ceilings and field disbursements.
3. Lack of independent verification for self-reported progress claims.
4. Absence of synchronized national telemetry for executive decision-making.

The Integrated Planning & Monitoring Information System (MoE-IPMIS) establishes a single, authoritative, real-time national digital backbone. It interconnects strategic planning (MTEF 3-Year Horizon), operational plan execution (25-column and 29-column Annual Implementation Plans), grassroots workshop management, independent field monitoring, quality assurance verification, and dynamic geo-spatial telemetry into an integrated governance architecture.

---

## 2. 4-Dimensional Access Control & Permission Architecture

IPMIS enforces an institutional 4-Dimensional Role-Based Access Control (4D-RBAC) security model governed by:
- **Dimension 1 (Administrative Hierarchy)**: Level 0 (Super Admin) down to Level 5 (School/Field Level).
- **Dimension 2 (Functional Category)**: System Administration, Strategic Planning, Workshop Execution, Monitoring & Quality Assurance, and Financial Operations.
- **Dimension 3 (Geographic & Institutional Scope)**: Scoped to specific organization nodes (National Ministry, Provincial Depts, Zonal Offices, Training Centres, Schools).
- **Dimension 4 (Granular Operational Capabilities)**: Explicit capability permissions (`read`, `create`, `update`, `approve`, `verify`, `export`, `admin`).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       IPMIS 4D-RBAC PERMISSION TIERS                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Level 0: Super Administrator (Full Cross-Cutting Governance & Audit Access) │
│ Level 1: National MoE Leadership & Planning Directorate                      │
│ Level 2: 9 Provincial Departments of Education (PDEs)                       │
│ Level 3: 100 Educational Zonal Directorates                                │
│ Level 4: Divisional Education Offices & Regional Training Centres           │
│ Level 5: School Principals, Project Coordinators & Field Facilitators       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Functional Modules

### 3.1 Module 1: MTEF 3-Year Strategic Budget Formulation
- Multi-year capital and recurrent budget allocation by Treasury object code.
- Strategic objective alignment across Basic Education, Secondary Education, Quality Assurance, and Digital Transformation pillars.
- Enforcement of statutory spending ceilings and warrant authorizations.

### 3.2 Module 2: Standardized AIP Matrix Formulation (25 & 29 Columns)
- **25-Column National Plan**: Comprehensive multi-year activity formulation with quarter-by-quarter baseline delivery targets, output indicators, and KPI milestones.
- **29-Column Provincial Plan**: Sub-national extension incorporating zone ID, school typology, and implementing agency granularity.
- **Formal AIP Amendment Lifecycle**: Enforces formal review workflows for proposed changes to approved baseline activities and budget lines.

### 3.3 Module 3: Ground Workshop Management & Training Delivery
- Scheduling of in-service teacher training, professional development programs, and curriculum rollouts.
- Automatic collision detection across training centres and facilities.
- Teacher trainee roster management with digital attendance verification.
- Bi-directional RFC 5545 iCalendar synchronization with external calendar providers (Google, Apple, Outlook).

### 3.4 Module 4: Financial Expenditure Tracking & Voucher Accounting
- Three-stage expenditure management: (1) Approved Estimated Budget, (2) Contractual Commitments, and (3) Paid Cash Disbursements.
- Automatic computation of budget variances ($\Delta B$) and utilization percentages.
- Linking of physical ground delivery with accounting vouchers.

### 3.5 Module 5: Field Monitoring, Deviation Logging & Remediation
- Structured capture of on-site monitoring observations by authorized field inspectors.
- Severity classification: Critical, High, Medium, and Low.
- Tracking of corrective action remediation plans from logging through review and statutory closure.

### 3.6 Module 6: Quality Assurance (QA) Evidence Verification
- Two-tier progress classification: Distinguishes between self-reported claims and verified achievements.
- Independent inspection of photographic evidence dossiers, verified attendee rosters, and accounting receipts.
- Direct computation of the QA Verification Index (QVI).

### 3.7 Module 7: National Telemetry & Province Coverage Map
- Real-time aggregation of multi-tier data into calibrated provincial progress scores.
- Interactive SVG choropleth map of Sri Lanka displaying the 9 provinces with 6-tier traffic light ratings.
- Modal drill-down from province to zone and school level.

### 3.8 Module 8: Super Admin System Governance
- Master controls for fiscal year rollover, gazetted submission deadlines, and broadcast announcements.
- Immutable security audit logging recording every create, update, and delete transaction with full before/after JSON diffs.

### 3.9 Module 9: Dual-Window 6-Tile Management Dashboard Architecture
- High-density management layout arranged across two standardized HD desktop windows (1280 × 1520 px total, 2 × 760 px windows):
  - **Window 1 (Executive Top Section - 3 Columns)**:
    - *Col 1: Physical & Financial Achievement Curves*: Branch-specific trajectory, comparing physical implementation % against financial disbursement % and tracking total allocation.
    - *Col 2: Province-Wise Administrative Coverage Map*: Interactive Sri Lanka choropleth with 6-tier traffic light thresholds, hover data, and modal inspection.
    - *Col 3: Calendar View*: Interactive monthly calendar highlighting workshops, milestones, deadlines, and reviews.
  - **Window 2 (Main Management Section - 3 Columns)**:
    - *Tile 01: Auto-Generated Implementation Timeline (Gantt)*: Visual Gantt-style quarterly delivery horizons (Q1–Q4) with milestone tracking, progress bars, and division/status filtering.
    - *Tile 02: 02. Progress Monitoring S-Curve*: Planned blue vs actual green cumulative progress trajectories, performance gap tracking (e.g. -24%), and ahead/on-track/delayed activity breakdown.
    - *Tile 03: Management Summary & KPIs*: Compact KPI indicator stack spanning 5 management groups: Workshops, Annual Implementation Plan, Budget Utilization, AIP Amendments, and Administrative Actions.

### 3.10 Module 10: Multi-Tier Live Updating Engine & Cross-Module Broadcast Sync
- Instantaneous cross-tab synchronization using the browser `BroadcastChannel` API and storage fallback (`src/lib/broadcastSync.ts`).
- Mutations in workshop scheduling, AIP progress updates, or QA verification signoffs emit instant broadcast events, refreshing all open dashboard windows in real-time without full-page reloads.
- Silent background telemetry polling every 12 seconds with zero layout shift and zero UI flicker.
- Automatic re-synchronization on tab visibility and window focus changes.
- Interactive `● Live Sync ↻` status beacon in the executive ribbon providing visual connection feedback and manual on-demand refresh capability.

### 3.11 Module 11: Tile-Level Action Menu, Excel & PDF Export Engine
- Dedicated 3-dots action menu (`...`) positioned on the **left top corner** of each of the 6 management tiles.
- **Client-Side Excel Export**: Formats tile-specific telemetry and progress records into a clean `.csv` file with UTF-8 Byte Order Mark (BOM) for native Microsoft Excel compatibility on Windows without encoding defects.
- **Institutional PDF Dossier Generation**: Automatically formats and renders print-ready government dossiers with official Democratic Socialist Republic of Sri Lanka Ministry of Education headers, certification sign-off blocks, and summary KPI cards.
- **Tile-Level Live Telemetry Refresh**: Triggers targeted telemetry synchronization for that specific item.
- **One-Click Summary Clipboard Copy**: Generates an executive text bulletin with KPI statistics and tabular records for immediate pasting into ministerial memos or executive correspondence.
- **Expand & Drill-Down Modal**: Opens a high-density tabular view with search filtering, full row inspection, and direct export options.

### 3.12 System Functional Requirements (SYS-01 to SYS-09) & User Level Matrix

The following baseline system requirements govern the platform's cross-cutting capabilities across all user levels:

| ID | Requirement | Description | System Implementation Reference | Supported User Levels & Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **SYS-01** | **Role-based access control** | Control functions according to user roles and permissions. | `src/lib/auth.ts`, `src/lib/permissions.ts`, `src/lib/planningHierarchy.ts` | **Super Admin**: Universal authority across all 6 tiers.<br>**Planning Officer**: Vote allocations, ceilings, plan reviews.<br>**M&E Specialist**: Verification and corrective actions.<br>**Branch Officer**: Proposals, AIP drafting, workshops.<br>**Place Coordinator**: Venue rosters and attendance. |
| **SYS-02** | **Administrative hierarchy** | Support Ministry → Province → Zone → School. | `src/lib/db.ts` (`organizations`, `organizationTypes`), `src/app/organizations/page.tsx` | Full 6-tier hierarchy: Level 1 (MoE), Level 2 (Apex: NIE, EPD, DoE), Level 3 (9 Provinces), Level 4 (100 Zones), Level 5 (312 Divisions), Level 6 (Schools/Units). 710 institutions. |
| **SYS-03** | **Historical records** | Retain all progress submissions and revisions. | `data/database.json` (`monthlyProgressReturns`, `aipAmendments`, `budgetRevisions`, `verificationRecords`) | Retains every monthly progress return, planned vs actual, cent expenditures, AIP circular amendments, before/after budget reallocations, and QA verification dossiers. |
| **SYS-04** | **Audit trail** | Record who entered, changed, verified, or approved information and when. | `src/lib/auditLogger.ts`, `src/app/api/audit-logs/route.ts`, `src/app/admin/audit-logs/page.tsx` | Immutable audit engine logging entered, changed, verified, and approved actions with timestamp, username, role, client IP, user agent, and JSON diffs. Restricted to Super Admin. |
| **SYS-05** | **Workflow management** | Support submission, review, verification, rejection and approval. | `src/app/api/annual-plan/submit`, `approve`, `src/app/api/monitoring/monthly-returns`, `verify-return`, `src/app/api/planning/budget` | **AIP Workflow**: Draft → Submitted → Reviewed → Approved or Returned.<br>**Budget Workflow**: Proposal → Allocation → Revision → Approved/Rejected.<br>**M&E Workflow**: Monthly Return → Review → Verified or Corrective Action Issued. |
| **SYS-06** | **Notifications** | Provide automated alerts and reminders. | `src/app/api/notifications/route.ts`, `src/components/layout/AppShell.tsx` | Event-driven alert dispatch on submissions, approvals, returns, verifications, corrective directives, and workshop reschedules with real-time unread radar pulse. |
| **SYS-07** | **Data integration** | Retrieve approved AIP, budget, workshop and planning information without unnecessary duplicate entry. | `src/app/workshops/new/page.tsx`, `src/app/api/annual-plan/import-budget-activities/route.ts` | Workshop creation binds directly to approved AIP activities, auto-populating titles and votes. AIP imports budget proposals; monthly returns pull approved AIP milestones. |
| **SYS-08** | **Reporting** | Provide downloadable and printable reports. | `src/app/annual-plan/page.tsx`, `src/app/reports/page.tsx`, `src/app/admin/audit-logs/page.tsx` | Landscape paper-saving filing PDF export (`handleExportLandscapePdf`), CSV matrix downloads, `@media print` clean reports, and ISO 27001 CSV audit export. |
| **SYS-09** | **Data security** | Protect confidential information and enforce access restrictions. | `src/lib/auth.ts`, `src/app/api/audit-logs/route.ts`, `src/app/admin/audit-logs/page.tsx` | Bcrypt password hashing, NextAuth JWT sessions, server-side HTTP 403 API barriers, client-side security guard screens, sidebar cloaking, and NIC/passport deduplication. |

---

## 4. Mathematical Calculation Formulas & Statistical Specifications

1. **Workshop Completion Rate (WCR)**:
   $$\text{WCR} = \left(\frac{\text{Completed Workshops}}{\text{Total Planned Workshops}}\right) \times 100\%$$

2. **Physical Achievement Rate (PAR)**:
   $$\text{PAR} = \frac{1}{N} \sum_{i=1}^{N} \text{ProgressPct}_i$$

3. **Budget Utilization Rate (BUR)**:
   $$\text{BUR} = \left(\frac{\text{Total Actual Expenditure}}{\text{Total Approved Budget}}\right) \times 100\%$$

4. **National Execution Composite Rate (NER)**:
   $$\text{NER} = (0.55 \times \text{PAR}) + (0.45 \times \text{BUR})$$

5. **MoE Traffic Light Rating Standards**:
   - **Green (100%)**: Optimal execution, milestones completed on schedule.
   - **Light Green (90–99%)**: Minor non-critical variance, on track.
   - **Yellow (80–89%)**: Moderate execution gap, monitor closely.
   - **Amber (70–79%)**: Significant delay, requires branch intervention.
   - **Light Red (50–69%)**: Critical bottleneck, executive remediation mandated.
   - **Red (< 50%)**: Severe failure, immediate administrative escalation.

---

## 5. Non-Functional & User Interface Standards

- **44px Sticky Header & Breadcrumb Drawer**: Slim global navigation bar with clickable navigation drawer covering all 11 core pillars and operations.
- **User Identity Placement**: Name first, then logo badge (`Welcome, MOE ICT Branch (ICT)`), positioned in the top-right header corner next to the notification bell.
- **High-Visibility Notification Alert**: Renders crimson red (`#DC2626`) with an alert background tint (`#FEF2F2`), red border (`#EF4444`), glowing radar ping pulse, and badge counter whenever active unread notices exist.
- **Web Normalization & GPU Acceleration**: Standardized `.page-container` padding (`0.75rem 1.25rem` standard, `0.35rem 1rem` executive compact) with hardware acceleration (`transform: translateZ(0)`) and thin 6px scrollbars.

---

## 6. Document Revision History

| Version | Release Date | Author / Authority | Summary of Scope & Technical Changes |
| :--- | :--- | :--- | :--- |
| **v1.0.0** | 15 Jan 2026 | DMISDU Core Team | Initial draft of workshop and trainee tracking system. |
| **v1.8.0** | 10 Apr 2026 | Planning Division | 25-column AIP matrix and budget proposal schemas. |
| **v2.0.0** | 15 Aug 2026 | Monitoring Division | Field monitoring deviation feeds and QA verification dossiers. |
| **v2.2.0** | 20 Oct 2026 | DMISDU & MoE ICT | Interactive 9-province SVG map and Traffic Light System engine. |
| **v2.4.0** | 14 Nov 2026 | Joint Directorate | Separated progress metrics, side-by-side login, and scoped timestamp engine. |
| **v2.5.0** | 14 Nov 2026 | Joint Directorate | Dual-Window 6-Tile Management Dashboard (1280x1520 HD), Multi-Tier Live Updating Engine via BroadcastChannel, 44px Sticky Header with Clickable Breadcrumb Drawer, High-Visibility Red Notification Bell, and Web Normalization. |
