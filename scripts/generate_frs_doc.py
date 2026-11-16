import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
import sys
sys.path.insert(0, os.path.dirname(__file__))
import doc_styling_helpers as h

DIAGRAMS_DIR = r"D:\Data\Tests\plan\Workshop-MS-TEST\docs\diagrams"
OUTPUT_FILE = r"D:\Data\Tests\plan\Workshop-MS-TEST\IPMIS_Functional_Requirements_Specification_FRS.docx"

def build_frs_document():
    doc = docx.Document()
    h.setup_header_footer(doc, "Functional Requirements Specification (FRS)")

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

    r_title = title_p.add_run("FUNCTIONAL REQUIREMENTS SPECIFICATION (FRS)\n")
    r_title.font.name = "Segoe UI"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = h.PRIMARY_COLOR

    r_sys = title_p.add_run("Integrated Planning & Monitoring Information System (MoE-IPMIS)\n")
    r_sys.font.name = "Segoe UI"
    r_sys.font.size = Pt(14)
    r_sys.font.bold = True
    r_sys.font.color.rgb = h.SECONDARY_COLOR

    r_desc = title_p.add_run("National Platform for Multi-Tier MTEF Strategic Planning, 25/29-Column AIP Implementation, Ground Workshop Execution, Independent QA Verification & Real-Time Performance Telemetry")
    r_desc.font.name = "Segoe UI"
    r_desc.font.size = Pt(10)
    r_desc.font.italic = True
    r_desc.font.color.rgb = h.TEXT_MUTED

    doc.add_paragraph()

    # Meta Table
    meta_headers = ["Document Attribute", "Specification Details"]
    meta_rows = [
        ["System Name", "Ministry of Education Integrated Planning & Monitoring Information System (MoE-IPMIS)"],
        ["Document Identifier", "MOE-IPMIS-FRS-2026-V2.5"],
        ["Release Version", "Version 2.5.0 (Dual-Window 6-Tile Management Dashboard & Live Sync Baseline)"],
        ["Effective Date", "14 November 2026"],
        ["Issuing Authority", "Data Management & Information Systems Development Unit (DMISDU)"],
        ["Collaborating Divisions", "Policy, Planning & Review Division & Monitoring and Performance Review Division"],
        ["Classification", "Official / National Government Standard"],
        ["Standards Compliance", "MoE Traffic Light System Standard, ISO 27001 Data Security, National MTEF Guidelines"],
    ]
    h.add_styled_table(doc, meta_headers, meta_rows, col_widths=[2.2, 4.3])

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 1: EXECUTIVE OVERVIEW & BUSINESS CONTEXT
    # ---------------------------------------------------------
    h.add_heading_1(doc, "1. Executive Overview & System Background")
    
    h.add_body_p(doc, 
        "The Ministry of Education (MoE) of Sri Lanka is constitutionally and administratively responsible for the governance, policy direction, curriculum design, human resource development, and performance monitoring of the General Education Sector nationwide. The institutional hierarchy encompasses the National Ministry, 9 Provincial Departments of Education (PDEs), 100 Educational Zones, Divisional Directorates, and 10,146 government schools catering to over 4.2 million students and 240,000 teachers."
    )
    
    h.add_body_p(doc,
        "Historically, educational planning, budget preparation, workshop scheduling, in-service teacher training, and monitoring observations operated across disconnected, manual spreadsheets and decentralized paperwork. This historical fragmentation created critical operational liabilities, including: (1) delayed physical implementation tracking, (2) budget utilization variances between provincial allocations and actual field disbursements, (3) lack of independent evidence verification for reported achievements, and (4) absence of synchronized national telemetry for executive leadership."
    )

    h.add_callout_box(doc,
        "The Integrated Planning & Monitoring Information System (MoE-IPMIS) establishes a single, authoritative, real-time national digital backbone. It interconnects strategic planning (MTEF 3-Year Horizon), operational plan execution (25-column and 29-column Annual Implementation Plans), grassroots workshop management, independent field monitoring, quality assurance verification, and dynamic geo-spatial telemetry into an integrated governance architecture.",
        "EXECUTIVE MANDATE & VISION",
        border_color="8D153A", bg_color="FDF2F8"
    )

    h.add_heading_2(doc, "1.1 Core Objectives of IPMIS")
    h.add_bullet_point(doc, "Multi-Tier Strategic Planning: Enforce Medium-Term Expenditure Framework (MTEF) 3-year rolling projections and automate Annual Implementation Plan (AIP) matrix formulations across national and sub-national agencies.", "1. ")
    h.add_bullet_point(doc, "Standardized 25/29-Column AIP Matrices: Digitize and standardize the national 25-column national planning matrix and 29-column provincial/zonal implementation matrices with automated quarter-by-quarter scheduling.", "2. ")
    h.add_bullet_point(doc, "Ground Workshop Delivery & Logistics: Manage complete workshop lifecycles from agenda formulation and participant registration to commitment accounting, attendance sign-off, and electronic voucher settlements.", "3. ")
    h.add_bullet_point(doc, "Independent Monitoring & Corrective Action: Empower field monitoring officers to record on-site inspections, log operational deviations, assign severity tiers, and track remedial corrective actions.", "4. ")
    h.add_bullet_point(doc, "Quality Assurance (QA) Verification Index: Implement an independent verification layer where physical milestones and financial expenditure claims must be audited against photographic and document evidence.", "5. ")
    h.add_bullet_point(doc, "Real-Time Telemetry & MoE Traffic Light Standard: Aggregate physical progress and financial execution dynamically into a 6-tier MoE Traffic Light System presented across an interactive 9-province national map.", "6. ")
    h.add_bullet_point(doc, "Single-Screen Executive Viewport Standards: Ensure executive monitoring dashboards and public transparency interfaces adhere strictly to a single-window desktop standard (1440 × 900 px) with 0 px vertical overflow.", "7. ")

    # ---------------------------------------------------------
    # SECTION 2: 4-DIMENSIONAL ACCESS CONTROL & USER PERMISSIONS
    # ---------------------------------------------------------
    h.add_heading_1(doc, "2. 4-Dimensional Access Control & Permission Architecture")

    h.add_body_p(doc,
        "Security, data integrity, and delegated authority in IPMIS are governed by an advanced 4-Dimensional Role-Based Access Control (4D-RBAC) architecture. Unlike conventional binary access models, access rights in IPMIS are evaluated dynamically as a function of four concurrent dimensions:"
    )

    h.add_bullet_point(doc, "Defines the vertical administrative tier (Level 0 through Level 5), determining administrative override powers, user provisioning, and organizational hierarchy management.", "Dimension 1: Administrative Tier — ")
    h.add_bullet_point(doc, "Differentiates institutional functions into Planning Division (Lead Policy/AIP authority), Monitoring & QA Division (Independent inspection/verification authority), and Operating Branches / Normal Divisions (Execution, training delivery, and grassroots spend).", "Dimension 2: Functional Division — ")
    h.add_bullet_point(doc, "Constrains data visibility and update authority strictly to the officer's institutional jurisdiction (National Ministry, Provincial Department, Educational Zone, Division, or School).", "Dimension 3: Geographic & Institutional Scope — ")
    h.add_bullet_point(doc, "Granular execution flags governing specific actions (canCreateWorkshop, canApproveWorkshop, canManageUsers, canViewReports, canManageOrganizations, canVerifyEvidence, canSubmitObservation).", "Dimension 4: Operational Permission Set — ")

    h.add_heading_2(doc, "2.1 Administrative Levels Hierarchy")
    levels_data = [
        ["Level 0", "Master Super Admin", "superadmin", "Full unrestricted access across all modules, database schemas, financial years, deadlines, and system audit logs."],
        ["Level 1", "National MoE Admin", "moe.admin, admin, data.officer", "National line administration, managing MoE departments, budget ceilings, and national user accounts."],
        ["Level 2", "Apex Institution Admin", "nie.admin", "National Apex Bodies (National Institute of Education, Department of Examinations, TVEC) managing apex-level plans."],
        ["Level 3", "Provincial Admin", "provincial.admin", "Provincial Department of Education (9 provinces), managing provincial budget proposals, zonal allocations, and regional workshops."],
        ["Level 4", "Zonal Admin", "zonal.admin", "Educational Zones (100 zones), managing divisional training schedules, school allocations, and teacher registrations."],
        ["Level 5", "Divisional Admin", "divisional.admin", "Divisional Directorates and School Clusters, managing local execution, attendance logs, and ground logistics."]
    ]
    h.add_styled_table(doc, ["Level", "Role Title", "System Identifiers", "Scope of Authority & Governance"], levels_data, col_widths=[0.8, 1.6, 1.8, 2.3])

    h.add_heading_2(doc, "2.2 Institutional Role & Permission Matrix")
    h.add_body_p(doc, "The comprehensive permission matrix below establishes the exact operational capabilities assigned to each institutional role in the production IPMIS baseline:")

    perm_headers = ["Institutional Role", "Admin Level", "Functional Category", "Budget & AIP Formulate", "Approve AIP / WS", "Log Observations", "QA Verify", "Manage Users"]
    perm_rows = [
        ["Super Administrator", "Level 0", "Master", "Full Access", "Full Approval", "Audit Level", "Override", "Yes (All)"],
        ["Level 1 MoE Admin", "Level 1", "National", "Full Access", "MoE National", "Audit Level", "Yes", "Yes (MoE)"],
        ["System Administrator", "Level 1", "Technical", "Configure", "Operational", "Read Only", "No", "Yes (System)"],
        ["Level 2 Apex Admin", "Level 2", "Apex (NIE)", "Apex Scope", "Apex Scope", "Apex Scope", "Yes (Apex)", "Yes (Apex)"],
        ["Level 3 Provincial Admin", "Level 3", "Provincial", "Provincial Scope", "Provincial", "Provincial", "No", "Yes (Province)"],
        ["Level 4 Zonal Admin", "Level 4", "Zonal", "Zonal Scope", "Zonal", "Zonal", "No", "Yes (Zone)"],
        ["Level 5 Divisional Admin", "Level 5", "Divisional", "Divisional Scope", "Divisional", "Divisional", "No", "No"],
        ["Planning Division Officer", "N/A", "Planning (Lead)", "National Lead", "AIP Approval", "Read Only", "No", "No"],
        ["Monitoring & QA Officer", "N/A", "Monitoring & QA", "Read Only", "No", "Primary Field", "Sign-Off", "No"],
        ["MOE Officer / Planner", "N/A", "Normal Operating", "Branch Scope", "Branch Scope", "Self Audit", "No", "No"],
        ["Place Coordinator", "N/A", "Normal Operating", "Session Input", "No", "No", "No", "No"],
        ["Public Transparency Viewer", "N/A", "Public Unlogged", "None", "None", "None", "None", "None"]
    ]
    h.add_styled_table(doc, perm_headers, perm_rows, col_widths=[1.5, 0.7, 1.0, 0.9, 0.8, 0.8, 0.8, 0.8])

    # Insert Diagram: Role Hierarchy
    h.add_heading_2(doc, "2.3 4D Access Control Architecture Diagram")
    h.add_diagram_figure(doc, os.path.join(DIAGRAMS_DIR, "role_hierarchy_access_control.png"), 
        "Figure 1: IPMIS 4-Dimensional Institutional Access Control Architecture (Administrative Tiers, Functional Divisions, and Capabilities)"
    )

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 3: FUNCTIONAL MODULES & BUSINESS WORKFLOWS
    # ---------------------------------------------------------
    h.add_heading_1(doc, "3. Functional Modules & Business Process Workflows")

    h.add_heading_2(doc, "3.1 Module 1: MTEF 3-Year Strategic Budget Formulation")
    h.add_body_p(doc,
        "Module 1 aligns national educational priorities with the Medium-Term Expenditure Framework (MTEF). It enables the General Treasury and the Ministry of Finance to register annual and multi-year budget ceilings, categorize expenditure under standardized Treasury Object Codes (e.g., Code 1402, 1409, 2102), and designate funding sources (Consolidated Fund, World Bank GEMP, ADB, UNESCO)."
    )
    h.add_bullet_point(doc, "Treasury Budget Ceilings: Capture capital and recurrent expenditure limits by institutional tier.", "• ")
    h.add_bullet_point(doc, "Strategic Objectives & Programmes: Establish hierarchical linkages between National Education Strategic Goals, Sector Programmes, and Capital Projects.", "• ")
    h.add_bullet_point(doc, "Budget Speech Integration: Tag priority flagship capital activities directly for inclusion in the National Budget Speech highlights.", "• ")

    h.add_heading_2(doc, "3.2 Module 2: Standardized AIP Matrix Formulation (25 & 29 Columns)")
    h.add_body_p(doc,
        "The Annual Implementation Plan (AIP) matrix engine digitizes the official Ministry of Education planning framework. The system supports two distinct tabular planning structures:"
    )
    h.add_bullet_point(doc, "National 25-Column AIP Matrix: Utilized by National MoE line branches and Apex bodies, structuring project codes, target groups, quarterly milestones (Q1, Q2, Q3, Q4), performance indicators, and allocated funds.", "• ")
    h.add_bullet_point(doc, "Provincial 29-Column AIP Matrix: Extends the national schema to include sub-regional parameters: Provincial Branch, Educational Zone ID, School Typology (1AB, 1C, Type 2, Type 3), and Grassroots Implementing Agents.", "• ")
    h.add_bullet_point(doc, "Formal Amendment Lifecycle: Any post-approval change to targets or budgets must be submitted as a formal AIP Amendment with justification, maintaining full audit version history.", "• ")

    h.add_heading_2(doc, "3.3 Module 3: Ground Workshop Management & Training Delivery")
    h.add_body_p(doc,
        "Module 3 operationalizes AIP training activities into discrete on-site or virtual workshop events. Place coordinators and branch officers manage complete workshop execution:"
    )
    h.add_bullet_point(doc, "Session Scheduling & Venue Allocation: Automated clash detection across Ministry training facilities, Provincial IT Centres (PITCs), and Zonal Computer Resource Centres (CRCs).", "• ")
    h.add_bullet_point(doc, "Trainee & Resource Personnel Roster: Role-based registration of in-service teachers, principals, and curriculum specialists, tracking attendance records and certificate eligibility.", "• ")
    h.add_bullet_point(doc, "Calendar Sync Integration: Automated one-click synchronization with external officer calendars (Google Calendar, Apple Calendar, Microsoft Outlook) via RFC 5545 iCalendar feeds.", "• ")

    h.add_heading_2(doc, "3.4 Module 4: Financial Expenditure Tracking & Voucher Accounting")
    h.add_body_p(doc,
        "Ensures total fiscal discipline by tracking financial disbursements in three distinct phases:"
    )
    h.add_bullet_point(doc, "Estimated Allocation: Budget sanctioned in the approved AIP Matrix.", "1. ")
    h.add_bullet_point(doc, "Committed Expenditure: Encumbered funds reserved upon scheduling workshops or issuing purchase orders.", "2. ")
    h.add_bullet_point(doc, "Actual Paid Disbursement: Audited settlement backed by certified payment vouchers, receipts, and treasury bank transfers.", "3. ")

    h.add_heading_2(doc, "3.5 Module 5: Field Monitoring, Deviation Logging & Corrective Actions")
    h.add_body_p(doc,
        "The Monitoring Division conducts randomized and scheduled field inspections of ongoing educational activities. When field parameters deviate from AIP plans:"
    )
    h.add_bullet_point(doc, "Deviation Logging: Officers log issues classified into Procurement, Field Non-Compliance, Curriculum Delay, Infrastructure, or Staffing Deficit.", "• ")
    h.add_bullet_point(doc, "Severity Classification: Critical, High, or Medium severity determines automated escalation to Provincial or National Directors.", "• ")
    h.add_bullet_point(doc, "Corrective Action Plan (CAP): Responsible officers must submit time-bound remedial actions, tracking status from Open to Under Review to Resolved.", "• ")

    h.add_heading_2(doc, "3.6 Module 6: Quality Assurance (QA) Verification & Evidence Dossier")
    h.add_body_p(doc,
        "To eliminate inaccurate progress claims, reported physical milestone percentages and financial spend figures remain marked as 'Self-Reported' until audited by the QA Division. Officers inspect submitted photographic evidence, attendance signatures, and financial vouchers, stamping records as Verified, Rejected, or Conditionally Approved."
    )

    h.add_heading_2(doc, "3.7 Module 7: National Telemetry & Regional Map")
    h.add_body_p(doc,
        "Dynamic aggregation engine delivering real-time metrics across all 9 provinces. Features an interactive SVG-based geospatial map of Sri Lanka, interactive drilldown modals, and national progress trajectories."
    )

    h.add_heading_2(doc, "3.8 Module 8: Super Admin System Governance")
    h.add_body_p(doc,
        "Provides master control over financial year transitions, mandatory submission deadlines, system announcements, and an immutable security audit trail logging every state modification with user ID, timestamp, and entity diff."
    )

    h.add_heading_2(doc, "3.9 Module 9: Dual-Window 6-Tile Management Dashboard Architecture")
    h.add_body_p(doc,
        "The IPMIS Management Dashboard organizes national governance telemetry into a compact, high-density 6-tile layout arranged across two standardized HD windows (1280 × 1520 px, 2 × 760 px). It eliminates whitespace and banner voids, providing senior executives with at-a-glance visibility across all operational tiers:"
    )
    h.add_bullet_point(doc, "Window 1 (Executive Top Section): (1) Physical & Financial Achievement Curves tailored to branch, tracking disbursed expenditure against total allocation; (2) Province-Wise Administrative Coverage Map featuring an interactive Sri Lanka SVG choropleth with 6-tier traffic lights; (3) Management Calendar View organizing workshops, deadlines, milestones, and reviews.", "• ")
    h.add_bullet_point(doc, "Window 2 (Main Management Section): (1) Auto-Generated Implementation Timeline (Gantt-style quarterly horizons Q1–Q4, milestone tracking, division/status filtering); (2) 02. Progress Monitoring S-Curve (dynamic planned blue vs actual green cumulative progress curves with gap tracking); (3) Management Summary & KPIs (comprehensive counters covering Workshops, AIP Activities, Budget Utilization, Amendments, and Administrative Actions).", "• ")

    h.add_heading_2(doc, "3.10 Module 10: Multi-Tier Live Updating Engine & Cross-Module Broadcast Sync")
    h.add_body_p(doc,
        "To ensure decision-makers always operate on verified, authoritative data, the dashboard implements a multi-tier live synchronization engine:"
    )
    h.add_bullet_point(doc, "Cross-Tab BroadcastChannel API: Utilizes 'ipmis_live_sync' and localStorage storage events. When workshops are created, AIP targets updated, or QA verifications signed off, an instantaneous broadcast is emitted, triggering live re-renders in all open tabs without full-page reloads.", "• ")
    h.add_bullet_point(doc, "Silent Background Telemetry Polling: High-frequency background poller runs at 12-second intervals, silently re-fetching telemetry data with zero layout shifts or UI flicker.", "• ")
    h.add_bullet_point(doc, "Tab Visibility & Focus Resync: Immediately queries the latest telemetry whenever an officer switches back to the dashboard window or tab.", "• ")
    h.add_bullet_point(doc, "Interactive Live Sync Beacon: Dark blue executive ribbon features a pulsing green live beacon (● Live Sync ↻) with a continuous spinning sync state and instant manual refresh on demand.", "• ")

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 4: MATHEMATICAL CALCULATION FORMULAS
    # ---------------------------------------------------------
    h.add_heading_1(doc, "4. Mathematical Calculation Formulas & Statistical Specifications")

    h.add_body_p(doc,
        "To ensure complete transparency, mathematical accuracy, and uniformity across all 9 provinces and 100 educational zones, IPMIS computes all progress scores, utilization rates, and composite indices using standardized formulas defined below:"
    )

    # Formula 1
    h.add_heading_2(doc, "4.1 Workshop Completion Rate (WCR)")
    h.add_body_p(doc,
        "Measures the ground operational delivery rate of scheduled training programs and workshops relative to the total planned sessions across an institutional scope:"
    )
    h.add_callout_box(doc,
        "WCR (%) = ( Completed_Workshops / Total_Planned_Workshops ) × 100\n\n"
        "Where:\n"
        "• Completed_Workshops = Count of workshops with status = 'Completed'\n"
        "• Total_Planned_Workshops = Total count of workshops with status in ('Completed', 'In Progress', 'Scheduled')",
        "FORMULA 1: WORKSHOP COMPLETION RATE",
        border_color="0F766E", bg_color="F0FDFA"
    )

    # Formula 2
    h.add_heading_2(doc, "4.2 Physical Achievement Rate (PAR)")
    h.add_body_p(doc,
        "Reflects the unweighted average milestone achievement rate across all active AIP activities within a designated branch, zone, province, or the national sector:"
    )
    h.add_callout_box(doc,
        "PAR (%) = ( 1 / N ) × ∑ [i=1 to N] PhysicalProgressPct_i\n\n"
        "Where:\n"
        "• N = Total number of active AIP activities with recorded physical progress\n"
        "• PhysicalProgressPct_i = Numerical physical milestone percentage achieved for activity i (0% to 100%)",
        "FORMULA 2: PHYSICAL ACHIEVEMENT RATE",
        border_color="0F766E", bg_color="F0FDFA"
    )

    # Formula 3
    h.add_heading_2(doc, "4.3 Financial Execution / Budget Utilization Rate (BUR)")
    h.add_body_p(doc,
        "Calculates the proportion of financial resources disbursed and vouched relative to the sanctioned budgetary allocation:"
    )
    h.add_callout_box(doc,
        "BUR (%) = Min( 100%, ( Total_Actual_Disbursement / Total_Estimated_Allocation ) × 100 )\n\n"
        "Where:\n"
        "• Total_Actual_Disbursement = ∑ Actual paid expenditures backed by payment vouchers\n"
        "• Total_Estimated_Allocation = ∑ Sanctioned estimated cost allocated in the approved AIP Matrix\n"
        "• Min(100%, ...) prevents statistical distortion from temporary over-expenditures pending supplementary warrants.",
        "FORMULA 3: BUDGET UTILIZATION RATE",
        border_color="0F766E", bg_color="F0FDFA"
    )

    # Formula 4
    h.add_heading_2(doc, "4.4 National Execution Composite Rate (NER)")
    h.add_body_p(doc,
        "To prevent misleading evaluations based solely on financial spending or solely on physical claims, the national overall progress index combines physical delivery and fiscal discipline into a balanced composite score:"
    )
    h.add_callout_box(doc,
        "NER (%) = ( 0.55 × PAR ) + ( 0.45 × BUR )\n\n"
        "Where:\n"
        "• 0.55 = Physical Implementation Weighting (55% emphasis on grassroots delivery and outcomes)\n"
        "• 0.45 = Financial Disbursement Weighting (45% emphasis on timely, auditable fiscal execution)",
        "FORMULA 4: NATIONAL EXECUTION COMPOSITE RATE",
        border_color="0F766E", bg_color="F0FDFA"
    )

    # Formula 5
    h.add_heading_2(doc, "4.5 Calibrated Provincial Progress Rate (PPR)")
    h.add_body_p(doc,
        "Used to calculate the dynamic progress percentage for each of the 9 provinces on the National Monitoring Map. It calibrates strategic AIP milestone delivery with ground workshop operations:"
    )
    h.add_callout_box(doc,
        "WsDeliveryScore = [ ( Completed_Ws + 0.5 × InProgress_Ws ) / Total_Prov_Ws ] × 100\n\n"
        "PPR (%) = Min( 100, Max( 30, Round( 0.70 × AvgProvActPhys + 0.30 × WsDeliveryScore ) ) )\n\n"
        "Where:\n"
        "• AvgProvActPhys = Average physical progress of AIP activities belonging to that provincial educational branch\n"
        "• WsDeliveryScore = Operational workshop completion score (in-progress workshops weighted at 50% credit)\n"
        "• Min/Max bounds [30%, 100%] ensure proper visual mapping and avoid zero-floor anomalies during mid-year phases.",
        "FORMULA 5: CALIBRATED PROVINCIAL PROGRESS RATE",
        border_color="0F766E", bg_color="F0FDFA"
    )

    # Formula 6: Traffic Light Scale
    h.add_heading_2(doc, "4.6 MoE Traffic Light System Standards & Threshold Matrix")
    h.add_body_p(doc,
        "The MoE Traffic Light System establishes the official statutory color-coded classification standard applied across all institutional dashboards, maps, and reports:"
    )

    tl_headers = ["Progress Band", "Color Name", "Hex Code", "Badge / Status Label", "Operational Meaning & Statutory Protocol"]
    tl_rows = [
        ["100%", "Green", "#16A34A", "100% Target Achieved", "Full physical delivery and financial settlement completed. Ready for annual sign-off."],
        ["90% - 99%", "Light Green", "#65A30D", "90-99% High Progress", "On track for complete delivery within current quarter. Standard monitoring."],
        ["80% - 89%", "Yellow", "#EAB308", "80-89% Satisfactory", "Adequate progress; minor administrative or procurement follow-up recommended."],
        ["70% - 79%", "Amber", "#F59E0B", "70-79% Attention Needed", "Performance delay detected. Zonal/Provincial review required to avoid critical stall."],
        ["50% - 69%", "Light Red / Coral", "#F87171", "50-69% Underperforming", "Substantial implementation lag. Corrective Action Plan (CAP) mandatory."],
        ["< 50%", "Red", "#DC2626", "< 50% Critical Deficit", "Severe operational deficit. Immediate intervention by National/Provincial Director."]
    ]
    h.add_styled_table(doc, tl_headers, tl_rows, col_widths=[1.1, 1.1, 0.9, 1.7, 1.9])

    # Formula 7
    h.add_heading_2(doc, "4.7 Quality Assurance (QA) Verification Index (QVI)")
    h.add_body_p(doc,
        "Measures the proportion of institutional achievements that have successfully completed independent field audit and evidence verification:"
    )
    h.add_callout_box(doc,
        "QVI (%) = ( Verified_AIP_Activities / Total_Reported_AIP_Activities ) × 100\n\n"
        "Where:\n"
        "• Verified_AIP_Activities = Count of activities with VerificationRecord status = 'Verified' and evidence approved\n"
        "• Total_Reported_AIP_Activities = Total active activities claiming milestone progress > 0%",
        "FORMULA 6: QA VERIFICATION INDEX",
        border_color="0F766E", bg_color="F0FDFA"
    )

    # Formula 8
    h.add_heading_2(doc, "4.8 Budget and Schedule Variance Analysis")
    h.add_bullet_point(doc, "Budget Variance (Rs.): ΔB = Total_Estimated_Allocation - Total_Actual_Spend", "• ")
    h.add_bullet_point(doc, "Budget Variance Percentage (%): ΔB% = ( ΔB / Total_Estimated_Allocation ) × 100", "• ")
    h.add_bullet_point(doc, "Schedule Variance (Days): ΔD = Actual_Completion_Date - Planned_Milestone_Date", "• ")

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 5: DATA FLOW DIAGRAMS (DFDs)
    # ---------------------------------------------------------
    h.add_heading_1(doc, "5. Data Flow Diagrams (DFDs) & Process Models")

    h.add_body_p(doc,
        "The data flow architecture of IPMIS is documented through structured hierarchical Data Flow Diagrams (DFD Level 0, Level 1, and Level 2) illustrating the flow of data between external entities, core operational processes, and central data stores."
    )

    h.add_heading_2(doc, "5.1 DFD Level 0: National System Context Diagram")
    h.add_body_p(doc,
        "Figure 2 illustrates the highest level contextual boundary of IPMIS, showing interactions between the central MoE-IPMIS system and primary external stakeholder entities including the General Treasury, Planning Division, 9 Provincial Departments, 100 Educational Zones, Field M&E Officers, and Public Transparency Viewers."
    )
    h.add_diagram_figure(doc, os.path.join(DIAGRAMS_DIR, "dfd_level_0_context.png"), 
        "Figure 2: IPMIS DFD Level 0 Context Diagram (National System Boundary and External Entity Interfaces)"
    )

    h.add_heading_2(doc, "5.2 DFD Level 1: Subsystem Data Flow Architecture")
    h.add_body_p(doc,
        "Figure 3 presents the Level 1 functional decomposition of IPMIS into six core automated subsystems (1.0 Budget Formulation, 2.0 AIP Matrix Cascading, 3.0 Workshop Logistics, 4.0 Expenditure Tracking, 5.0 Field Monitoring, 6.0 QA Verification & Telemetry) and their associated persistent data stores (D1 to D5)."
    )
    h.add_diagram_figure(doc, os.path.join(DIAGRAMS_DIR, "dfd_level_1_overview.png"), 
        "Figure 3: IPMIS DFD Level 1 Architecture (Subsystem Processes, Data Stores, and Bi-Directional Information Flows)"
    )

    h.add_heading_2(doc, "5.3 DFD Level 2: Detailed AIP & Workshop Execution Lifecycle")
    h.add_body_p(doc,
        "Figure 4 details the end-to-end operational lifecycle of an educational initiative, tracing from 3-year strategic objective mapping and 25/29-column AIP formulation through workshop execution, attendance vouchering, field monitoring deviation logging, independent QA verification, and final telemetry roll-up."
    )
    h.add_diagram_figure(doc, os.path.join(DIAGRAMS_DIR, "dfd_level_2_aip_workshop.png"), 
        "Figure 4: IPMIS DFD Level 2 Lifecycle Flow (From Strategic Goals to QA Verification and Telemetry Rollup)"
    )

    h.add_heading_2(doc, "5.4 System & Technology Architecture")
    h.add_body_p(doc,
        "Figure 5 displays the multi-tier technology architecture powering IPMIS, highlighting the Client Viewport Tier, Application & Security Pipeline Tier, and the Dual Persistence Tier (PostgreSQL relational engine with in-memory stat mtime caching and JSON snapshot fallback)."
    )
    h.add_diagram_figure(doc, os.path.join(DIAGRAMS_DIR, "system_architecture_diagram.png"), 
        "Figure 5: IPMIS Full System Architecture & Technology Stack (Presentation, Application, and Persistence Tiers)"
    )

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 6: DATA SCHEMA & DATA DICTIONARY
    # ---------------------------------------------------------
    h.add_heading_1(doc, "6. Data Schema & Comprehensive Data Dictionary")

    h.add_body_p(doc,
        "The IPMIS data schema enforces relational integrity, audit tracking, and multi-tier institutional relationships. The core entities and their operational attributes are specified below:"
    )

    h.add_heading_2(doc, "6.1 Core Entities Data Dictionary")
    data_dict_headers = ["Entity Name", "Primary Key", "Foreign Keys / References", "Key Operational Attributes", "Integrity Rules"]
    data_dict_rows = [
        ["Organization", "id", "parentId, typeId", "name, code, level, functionalCategory, provinceId", "Hierarchical tree; Level 1 (National) to Level 5 (Divisional)."],
        ["User", "id", "organizationId, roleId", "username, fullName, designation, email, passwordHash, isActive", "Username unique; password hashed with bcrypt; role-scoped."],
        ["AipPlan", "id", "branchId, financialYearId", "title, year, status, submittedAt, approvedAt", "One active plan per branch per financial year."],
        ["AipActivity", "id", "planId, branchId, objectCodeId", "activityCode, title, estimatedCost, financialProgress, physicalProgressPct, q1-q4", "EstimatedCost >= 0; physicalProgressPct in 0-100%."],
        ["Workshop", "id", "activityId, targetOrgId, placeId", "workshopNumber, title, startDate, endDate, status, commitments, actualPaid", "WorkshopNumber sequential; venue clash prevention enforced."],
        ["Trainee", "id", "workshopId", "fullName, designation, schoolName, attendanceStatus, voucherRef", "Linked to valid workshop; attendance audited."],
        ["MonitoringObservation", "id", "aipActivityId, workshopId", "observationType, title, details, severity, status, correctiveActionId", "Severity in (Critical, High, Medium, Low); status tracked."],
        ["VerificationRecord", "id", "aipActivityId, verifiedByUserId", "reportedPhysicalPct, verifiedPhysicalPct, evidenceApproved, status", "Independent signoff; status in (Verified, Rejected, Conditional)."],
        ["SystemAuditLog", "id", "userId, organizationId", "timestamp, category, action, entityType, entityId, summary, severity", "Append-only immutable audit trail; tamper-proof."]
    ]
    h.add_styled_table(doc, data_dict_headers, data_dict_rows, col_widths=[1.3, 0.7, 1.4, 1.8, 1.5])

    # ---------------------------------------------------------
    # SECTION 7: OPERATIONAL & PERFORMANCE STANDARDS
    # ---------------------------------------------------------
    h.add_heading_1(doc, "7. Operational & Non-Functional System Standards")

    h.add_heading_2(doc, "7.1 Single-Window Desktop Viewport Standards")
    h.add_body_p(doc,
        "As mandated by executive operational requirements, all primary operational interfaces—including the Public Transparency Landing Page, Institutional Side-by-Side Login Window, and Officer Dashboards—must render within a standard 1440 × 900 px desktop screen with strictly zero vertical scrollbar (0 px overflow). Content is dynamically proportioned using CSS Grid and Flexbox with flex-shrink preservation."
    )

    h.add_heading_2(doc, "7.2 Web Speed Optimization & Latency Benchmarks")
    h.add_body_p(doc,
        "To normalize and optimize web responsiveness across sub-national offices with variable bandwidth, IPMIS incorporates in-memory micro-caching with stat mtime validation and HTTP Cache-Control headers:"
    )
    h.add_bullet_point(doc, "Telemetry API Response Time: < 80 ms on cached hits (X-Cache: HIT) and < 700 ms on cold start calculations.", "• ")
    h.add_bullet_point(doc, "Last Updated Timestamp Response Time: < 70 ms with automatic organization-specific scoping for authenticated officers and planning-baseline scoping for public viewers.", "• ")
    h.add_bullet_point(doc, "Zero-Flicker Transitions: React 18 client-side state hydration with Next.js App Router pre-rendering.", "• ")

    h.add_heading_2(doc, "7.3 Information Security & Statutory Compliance")
    h.add_body_p(doc,
        "IPMIS complies with the Sri Lanka National Information and Cyber Security Strategy and ISO/IEC 27001 standards. All passwords use salted bcrypt hashing; API communication enforces HTTPS TLS 1.3 encryption; and state transitions are immutably recorded in the SystemAuditLog table."
    )

    h.add_heading_2(doc, "7.4 Modernized Global Header & Navigation Pane Standards")
    h.add_body_p(doc,
        "The IPMIS navigation architecture features a slim 44px sticky global header bar, completely eliminating legacy oversized banners. It incorporates: (1) a clickable breadcrumb navigation drawer accessing all 11 core system pillars and operational directories; (2) a user identity capsule in the top-right header corner formatted with name first, then branch logo ('Welcome, MOE ICT Branch (ICT)'); and (3) a high-visibility active notification bell displaying crimson red (#DC2626) with an alert tint (#FEF2F2), red border (#EF4444), glowing radar ping pulse, and counter badge whenever unread notices are present."
    )

    h.add_heading_2(doc, "7.5 Web Normalization & GPU Hardware Acceleration Standards")
    h.add_body_p(doc,
        "Standardizes .page-container padding across operational views (padding: 0.75rem 1.25rem) while maintaining compact executive spacing for .dashboard-container (0.35rem 1rem !important). Hardware acceleration (transform: translateZ(0); backface-visibility: hidden;) is applied across all dashboard tiles and interactive SVG charts to prevent frame drops during hover, resize, and tab switching. Global scrollbars are normalized with an ultra-thin 6px profile."
    )

    doc.add_page_break()

    # ---------------------------------------------------------
    # SECTION 8: SIGN-OFF & REVISION HISTORY
    # ---------------------------------------------------------
    h.add_heading_1(doc, "8. Document Approval & Revision History")

    rev_headers = ["Revision", "Release Date", "Primary Author", "Summary of Technical & Functional Changes"]
    rev_rows = [
        ["v1.0.0", "15 Jan 2026", "DMISDU Core Team", "Initial draft of workshop and trainee tracking system."],
        ["v1.8.0", "10 Apr 2026", "Planning Division", "Incorporation of 25-column AIP matrix and budget proposals."],
        ["v2.0.0", "15 Aug 2026", "Monitoring Division", "Introduction of Field Monitoring, Deviations, and QA Verification layer."],
        ["v2.2.0", "20 Oct 2026", "DMISDU & MoE ICT", "Sri Lanka 9-province interactive GIS map and MoE Traffic Light System."],
        ["v2.4.0", "14 Nov 2026", "Joint Directorate", "Separated physical/financial progress metrics, side-by-side single-screen login, conditional workshop visibility, normalized API caching, and standardized timestamp engine."],
        ["v2.5.0", "14 Nov 2026", "Joint Directorate", "Dual-Window 6-Tile Management Dashboard (1280x1520 HD), Multi-Tier Live Updating Engine via BroadcastChannel, 44px Sticky Header with Clickable Breadcrumb Drawer, High-Visibility Red Notification Bell, and Web Normalization."]
    ]
    h.add_styled_table(doc, rev_headers, rev_rows, col_widths=[0.8, 1.1, 1.5, 3.3])

    doc.save(OUTPUT_FILE)
    print(f"Successfully generated FRS document at: {OUTPUT_FILE}")

if __name__ == "__main__":
    build_frs_document()
