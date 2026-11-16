import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
import doc_styling_helpers as h

DIAGRAMS_DIR = r"D:\Data\Tests\plan\Workshop-MS-TEST\docs\diagrams"
OUTPUT_FILE = r"D:\Data\Tests\plan\Workshop-MS-TEST\IPMIS_Software_Requirements_Specification_SRS.docx"

def build_srs_document():
    doc = docx.Document()
    h.setup_header_footer(doc, "Software Requirements Specification (SRS)")

    # ---------------------------------------------------------
    # COVER / TITLE BLOCK
    # ---------------------------------------------------------
    title_p = doc.add_paragraph()
    h.format_paragraph(title_p, space_before=30, space_after=6)
    r_sub = title_p.add_run("GOVERNMENT OF SRI LANKA • MINISTRY OF EDUCATION\n")
    r_sub.font.name = "Segoe UI"
    r_sub.font.size = Pt(11)
    r_sub.font.bold = True
    r_sub.font.color.rgb = h.ACCENT_COLOR

    r_title = title_p.add_run("SOFTWARE REQUIREMENTS SPECIFICATION (SRS)\n")
    r_title.font.name = "Segoe UI"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = h.PRIMARY_COLOR

    r_sys = title_p.add_run("Integrated Planning & Monitoring Information System (MoE-IPMIS)\n")
    r_sys.font.name = "Segoe UI"
    r_sys.font.size = Pt(14)
    r_sys.font.bold = True
    r_sys.font.color.rgb = h.SECONDARY_COLOR

    r_desc = title_p.add_run("Compliant with IEEE Std 830-1998 Standard for Software Requirements Specifications • System Version 2.4.0 Baseline")
    r_desc.font.name = "Segoe UI"
    r_desc.font.size = Pt(10)
    r_desc.font.italic = True
    r_desc.font.color.rgb = h.TEXT_MUTED

    doc.add_paragraph()

    # Meta Table
    meta_headers = ["Specification Attribute", "System Detail"]
    meta_rows = [
        ["System Name", "Ministry of Education Integrated Planning & Monitoring Information System (MoE-IPMIS)"],
        ["Specification Standard", "IEEE Std 830-1998 (Recommended Practice for Software Requirements Specifications)"],
        ["Document Identifier", "MOE-IPMIS-SRS-2026-V2.5"],
        ["Release Version", "Version 2.5.0 (Dual-Window 6-Tile Management Dashboard & Live Sync Baseline)"],
        ["Effective Date", "14 November 2026"],
        ["Lead Technical Authority", "Data Management & Information Systems Development Unit (DMISDU)"],
        ["Target Runtime", "Next.js 14 (App Router), Node.js 20 LTS, PostgreSQL 15+, Tailwind CSS 3.4"],
        ["Desktop Viewport Constraint", "1440 × 900 px & 1280 × 1520 px Dual-Window Responsive Display"],
        ["Security & Data Protocol", "4D Role-Based Access Control (4D-RBAC), Salted Bcrypt Hashing, Immutable Audit Logs"]
    ]
    h.add_styled_table(doc, meta_headers, meta_rows, col_widths=[2.3, 4.2])

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 1: INTRODUCTION
    # ---------------------------------------------------------
    h.add_heading_1(doc, "1. Introduction")

    h.add_heading_2(doc, "1.1 Purpose")
    h.add_body_p(doc,
        "This Software Requirements Specification (SRS) document provides a complete, formal, and authoritative technical specification for the Integrated Planning & Monitoring Information System (MoE-IPMIS) of the Ministry of Education, Sri Lanka. It specifies the external interfaces, hardware and software dependencies, detailed functional capabilities, performance criteria, security protocols, and verification methods governing the software architecture."
    )

    h.add_heading_2(doc, "1.2 Document Conventions")
    h.add_body_p(doc,
        "This document conforms to the structure defined by IEEE Std 830-1998. Requirements are cataloged with unique identifiers using the format REQ-[SUBSYSTEM]-[INDEX]. Priority classifications are defined as Critical (mandatory for deployment), High (essential core capability), or Medium (operational enhancement)."
    )

    h.add_heading_2(doc, "1.3 Intended Audience")
    h.add_body_p(doc,
        "This document is intended for: (1) Software architects, full-stack engineers, and database administrators maintaining or extending IPMIS; (2) Quality assurance, security auditors, and independent verification officers validating software compliance; (3) Executive leadership and planning directors at the Ministry of Education Sri Lanka requiring statutory technical assurance."
    )

    h.add_heading_2(doc, "1.4 Product Scope")
    h.add_body_p(doc,
        "MoE-IPMIS is an enterprise-grade, web-based national planning, monitoring, and telemetry platform. It encompasses: (1) Medium-Term Expenditure Framework (MTEF) 3-year strategic budget formulation; (2) National 25-column and Provincial 29-column Annual Implementation Plan (AIP) matrix automation; (3) Ground workshop execution and attendance tracking; (4) Three-stage financial voucher accounting; (5) Multi-tier field monitoring and deviation logging; (6) Independent QA evidence verification; (7) Real-time GIS telemetry mapping across 9 provinces; and (8) Immutable audit logging and administrative governance."
    )

    h.add_heading_2(doc, "1.5 References")
    h.add_bullet_point(doc, "IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications.", "1. ")
    h.add_bullet_point(doc, "General Education Sector Development Plan (GESDP), Ministry of Education, Sri Lanka.", "2. ")
    h.add_bullet_point(doc, "Treasury Circulars on Medium-Term Expenditure Framework (MTEF) and Object Code Classifications, Ministry of Finance.", "3. ")
    h.add_bullet_point(doc, "Sri Lanka National Information and Cyber Security Strategy (SLCERT / National Cybersecurity Act).", "4. ")

    # ---------------------------------------------------------
    # SECTION 2: OVERALL DESCRIPTION
    # ---------------------------------------------------------
    h.add_heading_1(doc, "2. Overall Description")

    h.add_heading_2(doc, "2.1 Product Perspective")
    h.add_body_p(doc,
        "MoE-IPMIS operates as the central hub of the Ministry's digital architecture. It interfaces upstream with the General Treasury for budget ceilings and warrants, and downstream with 9 Provincial Departments of Education (PDEs), 100 Educational Zones, and over 10,000 schools for activity execution and physical evidence gathering. Furthermore, it synchronizes workshop agendas with external calendar ecosystems (Google Calendar, Apple Calendar, Outlook) and presents aggregated progress to the public via an open transparency dashboard."
    )

    h.add_heading_2(doc, "2.2 Product Functions Overview")
    h.add_bullet_point(doc, "Budget & Strategic Planning: Registering MTEF 3-year ceilings, programmes, projects, and object codes.", "• ")
    h.add_bullet_point(doc, "AIP Matrix Engine: 25-column national and 29-column provincial matrix authoring with quarter-by-quarter scheduling.", "• ")
    h.add_bullet_point(doc, "Workshop Management: Venue clash detection, trainee registration, resource person billing, and attendance tracking.", "• ")
    h.add_bullet_point(doc, "Expenditure Accounting: Recording estimated, committed, and paid actuals with payment voucher linkage.", "• ")
    h.add_bullet_point(doc, "Field Monitoring: On-site inspection logging, deviation tracking, severity escalation, and remedial plans.", "• ")
    h.add_bullet_point(doc, "QA Verification: Evidence dossier review, milestone auditing, and verification status stamping.", "• ")
    h.add_bullet_point(doc, "Real-Time Telemetry: Rolling calculations of national execution rates, workshop delivery scores, and MoE traffic light color bands.", "• ")
    h.add_bullet_point(doc, "System Governance: Super Admin control over financial years, submission deadlines, announcements, and immutable audit logs.", "• ")

    h.add_heading_2(doc, "2.3 User Classes & Characteristics")
    h.add_body_p(doc,
        "IPMIS serves 11 user roles across 6 administrative levels, characterized by varying technical proficiency, institutional authority, and operational responsibilities:"
    )
    user_classes = [
        ["Super Administrator", "Technical experts managing multi-tenancy, database migrations, deadlines, and security logs."],
        ["Level 1 MoE Admin", "Senior ministry executive officers overseeing national line divisions, budget ceilings, and approvals."],
        ["Level 2 Apex Admin", "Directors and planners at apex institutions (National Institute of Education, Exams Dept)."],
        ["Level 3 Provincial Admin", "Provincial Directors and IT coordinators managing regional education plans across 9 provinces."],
        ["Level 4 Zonal Admin", "Zonal Education Directors coordinating school clusters and teacher in-service training."],
        ["Level 5 Divisional Admin", "Field divisional officers managing school-level attendance, logistics, and resource disbursement."],
        ["Planning Division Officer", "National planning specialists conducting MTEF formulation and 25/29-column matrix approvals."],
        ["Monitoring & QA Officer", "Field inspectors conducting randomized on-site verification and evidence sign-off."],
        ["MOE Officer / Planner", "Branch-level program officers organizing teacher workshops and curriculum rollouts."],
        ["Place Coordinator", "IT centre and training facility managers verifying local hall attendance and logistics."],
        ["Public Transparency Viewer", "Citizens, researchers, and media inspecting high-level educational progress and regional maps."]
    ]
    h.add_styled_table(doc, ["User Class", "Operational Characteristics & Profile"], user_classes, col_widths=[2.2, 4.3])

    h.add_heading_2(doc, "2.4 Operating Environment")
    h.add_bullet_point(doc, "Server Architecture: Node.js 20 LTS runtime executing Next.js 14 App Router server actions and route handlers.", "• ")
    h.add_bullet_point(doc, "Database Tier: PostgreSQL 15+ relational database engine with pooled transactional connections, supplemented by an in-memory stat mtime micro-cache and JSON snapshot fallback.", "• ")
    h.add_bullet_point(doc, "Client Platforms: Modern web browsers (Google Chrome 110+, Microsoft Edge 110+, Mozilla Firefox 115+, Apple Safari 16+) on Windows, macOS, Linux, and iOS/Android.", "• ")

    h.add_heading_2(doc, "2.5 Design & Implementation Constraints")
    h.add_callout_box(doc,
        "MANDATORY DESKTOP VIEWPORT CONSTRAINT:\n"
        "All primary executive and public monitoring screens must render within a single standard desktop viewport of 1440 × 900 px with strictly ZERO vertical scrollbar (0 px overflow). UI components must utilize dynamic flex-shrink calculations and CSS Grid layouts to adapt symmetrically without clipping or truncation.",
        "CRITICAL ARCHITECTURAL CONSTRAINT",
        border_color="0284C7", bg_color="F0F9FF"
    )

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 3: EXTERNAL INTERFACE REQUIREMENTS
    # ---------------------------------------------------------
    h.add_heading_1(doc, "3. External Interface Requirements")

    h.add_heading_2(doc, "3.1 User Interfaces (UI)")
    h.add_body_p(doc,
        "The IPMIS presentation layer delivers responsive, institutional interfaces styled with the official Ministry of Education palette (Deep Crimson #8D153A, National Gold #FFBE29, Slate Navy #1E293B, and Emerald #0F766E):"
    )
    h.add_bullet_point(doc, "Public Transparency Landing Page: Symmetrical two-column executive display featuring a multi-year performance monitoring chart on the left, an interactive 9-province SVG map with traffic-light polygon coloring on the right, separated physical (73%) and financial (31%) metric cards, and a baseline MoE planning timestamp footer.", "• ")
    h.add_bullet_point(doc, "Single-Screen Side-by-Side Login Page: Focused institutional sign-in interface (1440 × 900 px, 0 px overflow). The left pane displays an enlarged official crest logo (114 px, clickable to return to the landing page), Ministry branding, and key capabilities. The right pane contains the authenticated credentials card with zero footer timestamp.", "• ")
    h.add_bullet_point(doc, "Interactive Province Details Modal: Triggered by clicking provincial polygons or pins. Displays overall execution rates, budget expenditure, planned workshops, constituent educational zones, and the 'Standards: MoE Traffic Light System' attribution. For unlogged public visitors, the 'View Workshops →' button is strictly suppressed, displaying only the 'Close' button.", "• ")
    h.add_bullet_point(doc, "Dual-Window 6-Tile Management Dashboard: Compact executive command center arranged across two 1280 × 760 px HD windows (1280 × 1520 px total). Window 1 delivers Branch Achievement Curves, Sri Lanka Province Coverage Map, and Management Calendar. Window 2 delivers Auto-Generated Gantt Timeline, 02. Progress Monitoring S-Curve, and 5-Group Management Summary KPIs.", "• ")
    h.add_bullet_point(doc, "44px Global Sticky Header & Breadcrumb Navigation Drawer: Unified navigation header containing clickable breadcrumb drawer accessing all 11 system pillars and operations, user identity capsule ('Welcome, MOE ICT Branch (ICT)' with name first then logo), and an eye-catching red active notification bell with radar ping and glowing badge counter.", "• ")
    h.add_bullet_point(doc, "Interactive Live Sync Ribbon Beacon: Embedded in the dark blue executive ribbon featuring a green connection beacon (● Live Sync ↻) with rotating sync animation on telemetry refresh and instant manual refresh on demand.", "• ")

    h.add_heading_2(doc, "3.2 Hardware Interfaces")
    h.add_body_p(doc, "Standard desktop and laptop hardware supporting minimum screen resolutions of 1366 × 768 px and optimized for 1440 × 900 px and 1920 × 1080 px displays. No specialized hardware peripherals are required.")

    h.add_heading_2(doc, "3.3 Software Interfaces")
    h.add_bullet_point(doc, "Database Interface: Node-postgres (pg) connection pool interfacing with PostgreSQL over TCP/IP SSL. Automatic fallback to local fs-based JSON database engine.", "• ")
    h.add_bullet_point(doc, "Authentication Service: NextAuth.js v4 implementing JWT session tokens with 24-hour expiration, client cookies, and bcrypt credential hashing.", "• ")
    h.add_bullet_point(doc, "Calendar Protocol: RFC 5545 compliant iCalendar feed generation enabling one-click event synchronization with Google Calendar, Apple Calendar, and Microsoft Outlook.", "• ")

    h.add_heading_2(doc, "3.4 Communications Interfaces")
    h.add_body_p(doc,
        "All client-server communications use HTTPS TLS 1.3 encryption. REST API route handlers (/api/system/telemetry, /api/system/last-updated, /api/workshops, /api/aip) transfer data using JSON payloads. Telemetry responses include HTTP Cache-Control headers ('public, s-maxage=4, stale-while-revalidate=8') and custom 'X-Cache' diagnostic headers."
    )

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 4: SYSTEM FEATURES & DETAILED FUNCTIONAL REQUIREMENTS
    # ---------------------------------------------------------
    h.add_heading_1(doc, "4. System Features & Software Functional Requirements")

    h.add_body_p(doc,
        "This section details the functional software requirements governing IPMIS. Each requirement specifies inputs, processing rules, output states, and exception conditions:"
    )

    req_headers = ["Requirement ID", "Feature Description", "Priority", "Input / Stimulus", "Processing Logic & Output State"]
    req_rows = [
        ["REQ-SEC-01", "Institutional Authentication", "Critical", "Username & Password", "Validates against User table using salted bcrypt.compareSync. Issues signed JWT session token."],
        ["REQ-SEC-02", "4D Access Control Guard", "Critical", "API request & Session JWT", "Evaluates adminLevel (0-5), functionalCategory, and organizationId against target resource. Returns 403 on breach."],
        ["REQ-SEC-03", "Conditional Workshop Visibility", "High", "Public vs Logged-In Session", "RegionalMap suppresses 'View Workshops →' link if session.user is null, rendering only 'Close' button."],
        ["REQ-MTEF-01", "Treasury Budget Ceilings", "High", "Ceiling allocation form", "Records capital and recurrent ceilings by financial year and institution. Enforces upper allocation limits."],
        ["REQ-AIP-01", "25-Column AIP Formulation", "Critical", "National AIP entry form", "Validates project codes, quarter-by-quarter targets, and estimated costs. Generates unique aipActivityCode."],
        ["REQ-AIP-02", "29-Column Provincial AIP", "Critical", "Provincial AIP entry form", "Extends 25-col schema with zoneId, schoolTypology, and implementingAgency fields for sub-national tracking."],
        ["REQ-AIP-03", "AIP Amendment Control", "High", "Amendment request form", "Flags approved activities as 'Amendment Pending'. Requires formal review by Planning Division before target updates."],
        ["REQ-WS-01", "Workshop Scheduling", "High", "Workshop creation modal", "Auto-generates sequential workshopNumber (e.g., WS-0056). Performs venue clash detection across training centres."],
        ["REQ-WS-02", "Trainee Roster Management", "High", "Teacher enrollment batch", "Registers in-service teachers by NIC and school. Records attendance status and calculates meal/travel allowances."],
        ["REQ-WS-03", "Calendar RFC 5545 Sync", "Medium", "Subscribe Calendar button", "Generates dynamic .ics URL subscribing officer to automated workshop notifications across Google/Apple/Outlook."],
        ["REQ-EXP-01", "Three-Tier Cost Tracking", "Critical", "Voucher entry form", "Tracks EstimatedCost, Commitments, and ActualPaid. Calculates budget variance ΔB and flags cost overruns."],
        ["REQ-MON-01", "Field Inspection Logging", "High", "M&E Observation form", "Captures inspection findings, categorization, severity (Critical/High/Medium/Low), and evidence attachments."],
        ["REQ-MON-02", "Corrective Action Tracking", "High", "Remedial action plan form", "Assigns remedial deadlines and responsible officers. Tracks state transitions from Open to Under Review to Resolved."],
        ["REQ-QA-01", "Evidence Verification Audit", "Critical", "QA Dossier inspection", "Compares self-reported physical % and spend against verified evidence. Updates VerificationRecord status."],
        ["REQ-QA-02", "QA Verification Index (QVI)", "High", "Telemetry calculation trigger", "Computes (Verified_Activities / Total_Activities) × 100%. Incorporates index into executive KPI telemetry."],
        ["REQ-TEL-01", "Real-Time Telemetry Rollup", "Critical", "GET /api/system/telemetry", "Computes National Execution Rate (NER = 0.55*PAR + 0.45*BUR) and calibrated provincial progress scores."],
        ["REQ-TEL-02", "MoE Traffic Light Engine", "Critical", "Progress percentage score", "Applies 6-tier color scale (Green, Light Green, Yellow, Amber, Light Red, Red) to all provincial SVG polygons."],
        ["REQ-TEL-03", "Dynamic Scoped Timestamp", "High", "GET /api/system/last-updated", "Returns officer's organization last-updated time for logged users; returns MoE Planning baseline for public users."],
        ["REQ-GOV-01", "Immutable Audit Logging", "Critical", "Any CRUD state modification", "Appends immutable record to SystemAuditLog containing timestamp, userId, entityType, action, and JSON diff."],
        ["REQ-DASH-01", "Dual-Window 6-Tile Layout", "Critical", "GET /dashboard", "Renders 6 management tiles across 2 windows (1280x1520 HD): Achievement Curves, Province Map, Calendar, Gantt Timeline, S-Curve, and KPIs."],
        ["REQ-DASH-02", "Implementation Timeline Gantt", "High", "AIP activity records", "Maps planned vs actual completion horizons across Q1-Q4 with milestone delivery, division filtering, and status tabs."],
        ["REQ-DASH-03", "Progress Monitoring S-Curve", "High", "Monthly cumulative progress", "Plots planned blue vs actual green cumulative progress curves with live gap tracking (-24%) and status classification."],
        ["REQ-DASH-04", "Management Summary & KPIs", "High", "Telemetry KPI dataset", "Aggregates numerical counters and progress bars across Workshops, AIP Activities, Budget Utilization, Amendments, and Actions."],
        ["REQ-SYNC-01", "Multi-Tier Live Updating Engine", "Critical", "BroadcastChannel & storage event", "Dispatches and catches instantaneous cross-tab synchronization events on any mutation, updating open dashboards without full reloads."],
        ["REQ-SYNC-02", "Silent Background Poller", "High", "12s background polling timer", "Silently fetches latest telemetry, workshops, and timestamps every 12 seconds with zero layout shift and zero UI flicker."],
        ["REQ-UI-01", "44px Sticky Header & Breadcrumbs", "High", "Global layout navigation", "Slim 44px header bar featuring clickable breadcrumb drawer with direct jump links to all 11 core pillars and operations."],
        ["REQ-UI-02", "Top-Right User Profile Capsule", "Medium", "Session user & branch data", "Displays 'Welcome, {branchName}' text first followed by circular abbreviation logo badge, positioned next to notification bell."],
        ["REQ-UI-03", "High-Visibility Notification Alert", "High", "Active unread notification count", "Renders crimson red (#DC2626) bell, soft red alert tint (#FEF2F2), glowing radar ping pulse, and badge counter when unread notices > 0."]
    ]
    h.add_styled_table(doc, req_headers, req_rows, col_widths=[1.1, 1.4, 0.7, 1.3, 2.0])

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 5: NON-FUNCTIONAL REQUIREMENTS
    # ---------------------------------------------------------
    h.add_heading_1(doc, "5. Non-Functional Software Requirements")

    h.add_heading_2(doc, "5.1 Performance Requirements")
    h.add_bullet_point(doc, "Telemetry Cache Response Time: GET /api/system/telemetry must respond in under 80 ms on cached hits and under 700 ms on cold-cache recalculations.", "• ")
    h.add_bullet_point(doc, "Timestamp API Response Time: GET /api/system/last-updated must respond in under 70 ms with micro-cached payloads.", "• ")
    h.add_bullet_point(doc, "Client Render Speed: Complete hydration and rendering of the public transparency dashboard within 1.2 seconds on standard broadband.", "• ")
    h.add_bullet_point(doc, "Live Sync Latency & Visual Stability: Cross-tab BroadcastChannel sync latency < 50 ms. Background polling runs with 0 px layout shift and 0 ms UI blocking time.", "• ")
    h.add_bullet_point(doc, "Hardware Acceleration: Tile animations, map polygon hover states, and charts GPU-accelerated via transform: translateZ(0) to maintain 60 FPS rendering.", "• ")
    h.add_bullet_point(doc, "Concurrent Users: Server architecture supports 500 concurrent administrative sessions without performance degradation.", "• ")

    h.add_heading_2(doc, "5.2 Security & Data Protection Requirements")
    h.add_bullet_point(doc, "Password Cryptography: Passwords stored strictly as salted hashes generated via bcrypt with minimum work factor of 10.", "• ")
    h.add_bullet_point(doc, "Session Security: JWT sessions encrypted with server-side NEXTAUTH_SECRET, enforcing HTTP-only secure cookie transport and 24-hour expiration.", "• ")
    h.add_bullet_point(doc, "Input Sanitization: All user inputs sanitized to eliminate Cross-Site Scripting (XSS) and SQL injection vulnerabilities.", "• ")
    h.add_bullet_point(doc, "Audit Integrity: System audit logs are append-only; database security forbids UPDATE or DELETE statements on the SystemAuditLog table.", "• ")

    h.add_heading_2(doc, "5.3 Software Quality Attributes")
    h.add_bullet_point(doc, "Availability: High availability SLA of 99.9% uptime during official government operating hours.", "• ")
    h.add_bullet_point(doc, "Maintainability: Strict TypeScript type safety across all components, models, and API routes with zero compilation errors.", "• ")
    h.add_bullet_point(doc, "Portability: Cloud-native containerized architecture deployable across on-premises government data centres or national cloud infrastructure.", "• ")

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 6: EMBEDDED ARCHITECTURE & DATA FLOW MODELS
    # ---------------------------------------------------------
    h.add_heading_1(doc, "6. Embedded Architecture & Data Flow Models")

    h.add_body_p(doc,
        "The software architecture and process models specified in Section 3 and Section 4 are visually depicted in the engineering diagrams below:"
    )

    h.add_heading_2(doc, "6.1 Full System & Technology Architecture")
    h.add_diagram_figure(doc, os.path.join(DIAGRAMS_DIR, "system_architecture_diagram.png"), 
        "Figure 1: IPMIS Full System Architecture (Presentation Tier, Security Pipeline, Application Engine, and Persistence Layers)"
    )

    h.add_heading_2(doc, "6.2 DFD Level 0: National System Context Model")
    h.add_diagram_figure(doc, os.path.join(DIAGRAMS_DIR, "dfd_level_0_context.png"), 
        "Figure 2: IPMIS DFD Level 0 Context Model (External Systems, Stakeholder Entities, and Data Boundaries)"
    )

    h.add_heading_2(doc, "6.3 DFD Level 1: Subsystem Data Flow Architecture")
    h.add_diagram_figure(doc, os.path.join(DIAGRAMS_DIR, "dfd_level_1_overview.png"), 
        "Figure 3: IPMIS DFD Level 1 Subsystem Flow (Processes 1.0 through 6.0 and Core Data Stores D1 through D5)"
    )

    h.add_heading_2(doc, "6.4 DFD Level 2: AIP & Workshop Execution Lifecycle")
    h.add_diagram_figure(doc, os.path.join(DIAGRAMS_DIR, "dfd_level_2_aip_workshop.png"), 
        "Figure 4: IPMIS DFD Level 2 Lifecycle Model (Sequential Flow from 3-Yr Goal Formulation to QA Signoff)"
    )

    h.add_heading_2(doc, "6.5 4D Institutional Access Control Architecture")
    h.add_diagram_figure(doc, os.path.join(DIAGRAMS_DIR, "role_hierarchy_access_control.png"), 
        "Figure 5: IPMIS 4-Dimensional Access Control Architecture (Administrative Tiers, Functional Divisions, and Capabilities)"
    )

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 7: REQUIREMENTS TRACEABILITY MATRIX (RTM)
    # ---------------------------------------------------------
    h.add_heading_1(doc, "7. Requirements Traceability Matrix (RTM)")

    h.add_body_p(doc,
        "The Requirements Traceability Matrix (RTM) establishes bi-directional traceability between executive business objectives, FRS functional specifications, and SRS software requirement implementations:"
    )

    rtm_headers = ["Business Objective", "FRS Section", "SRS Requirement ID", "Implementing Code Component", "Verification Method"]
    rtm_rows = [
        ["Institutional Security & RBAC", "FRS § 2.1 - 2.3", "REQ-SEC-01, REQ-SEC-02", "src/lib/auth.ts", "Automated Session & Role Unit Tests"],
        ["Unlogged User Privacy & Access", "FRS § 2.2", "REQ-SEC-03", "src/components/dashboard/RegionalMap.tsx", "Browser Subagent DOM Verification"],
        ["3-Year MTEF Strategic Budgeting", "FRS § 3.1", "REQ-MTEF-01", "src/app/api/budget, data/database.json", "Treasury Ceiling Enforcement Tests"],
        ["Standard 25/29-Col AIP Matrix", "FRS § 3.2", "REQ-AIP-01, REQ-AIP-02", "src/lib/planning-matrix.ts", "Matrix Schema Validation Suite"],
        ["Workshop Delivery & Venues", "FRS § 3.3", "REQ-WS-01, REQ-WS-02", "src/app/workshops, src/lib/db.ts", "Venue Clash Detection Tests"],
        ["External Calendar Sync", "FRS § 3.3", "REQ-WS-03", "src/app/api/calendar/subscribe", "RFC 5545 iCalendar Linter"],
        ["Three-Stage Cost Accounting", "FRS § 3.4", "REQ-EXP-01", "src/app/workshops, src/lib/db.ts", "Voucher Summation & Variance Tests"],
        ["Field Monitoring & Deviations", "FRS § 3.5", "REQ-MON-01, REQ-MON-02", "src/components/dashboard/RecentMonitoringFeed", "Deviation Severity Escalation Tests"],
        ["Independent QA Verification", "FRS § 3.6", "REQ-QA-01, REQ-QA-02", "src/lib/db.ts, VerificationRecord", "Dossier Signoff & QVI Calculation"],
        ["Real-Time Telemetry & Traffic Light", "FRS § 3.7, 4.4-4.6", "REQ-TEL-01, REQ-TEL-02", "src/app/api/system/telemetry", "Telemetry Math & Color Hex Tests"],
        ["Scoped Timestamp Engine", "FRS § 7.2", "REQ-TEL-03", "src/app/api/system/last-updated", "Session vs Public Timestamp Tests"],
        ["Immutable Audit Trail Logging", "FRS § 3.8", "REQ-GOV-01", "src/lib/db.ts (SystemAuditLog)", "Tamper-Resistance Audit Tests"],
        ["Dual-Window 6-Tile Dashboard", "FRS § 3.9", "REQ-DASH-01 - REQ-DASH-04", "src/app/dashboard/page.tsx", "6-Tile Responsive Desktop Tests"],
        ["Real-Time Live Updating Engine", "FRS § 3.10", "REQ-SYNC-01, REQ-SYNC-02", "src/lib/broadcastSync.ts", "Cross-Tab Broadcast Synchronization Tests"],
        ["Global Header & Alert Bell", "FRS § 7.4", "REQ-UI-01 - REQ-UI-03", "src/components/layout/AppShell.tsx", "Header & Red Bell DOM Inspections"]
    ]
    h.add_styled_table(doc, rtm_headers, rtm_rows, col_widths=[1.5, 0.9, 1.2, 1.7, 1.2])

    # ---------------------------------------------------------
    # SECTION 8: SIGN-OFF & REVISION HISTORY
    # ---------------------------------------------------------
    h.add_heading_1(doc, "8. Software Engineering Sign-Off & Revision History")

    srs_rev_headers = ["Revision", "Release Date", "Technical Lead", "Software Engineering Baseline Scope"]
    srs_rev_rows = [
        ["v1.0.0", "20 Jan 2026", "DMISDU Core Architecture", "Initial software architecture specification for workshop tracking."],
        ["v1.8.0", "15 Apr 2026", "Full-Stack Engineering Group", "Integration of 25-column AIP matrix schema and PostgreSQL persistence adapter."],
        ["v2.0.0", "25 Aug 2026", "Security & M&E Engineering", "Implementation of 4D-RBAC, M&E observation feeds, and QA evidence verification."],
        ["v2.2.0", "28 Oct 2026", "GIS & Frontend Team", "Sri Lanka 9-province SVG map integration and MoE Traffic Light System engine."],
        ["v2.4.0", "14 Nov 2026", "DMISDU & MoE Joint Team", "Separated physical/financial progress metrics, side-by-side single-screen login, conditional workshop visibility for unlogged visitors, normalized API caching, and standardized timestamp engine."],
        ["v2.5.0", "14 Nov 2026", "DMISDU & MoE Joint Team", "Dual-Window 6-Tile Management Dashboard (1280x1520 HD), Multi-Tier Live Updating Engine via BroadcastChannel, 44px Sticky Header with Clickable Breadcrumb Drawer, High-Visibility Red Notification Bell, and Web Normalization."]
    ]
    h.add_styled_table(doc, srs_rev_headers, srs_rev_rows, col_widths=[0.8, 1.1, 1.5, 3.1])

    doc.save(OUTPUT_FILE)
    print(f"Successfully generated SRS document at: {OUTPUT_FILE}")

if __name__ == "__main__":
    build_srs_document()
