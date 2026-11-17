import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    """Set the background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set inner padding for a table cell (in twentieths of a point / dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def add_heading_with_spacing(doc, text, level, space_before=14, space_after=6, color_rgb=(0, 83, 78)):
    p = doc.add_heading(text, level=level)
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.keep_with_next = True
    for run in p.runs:
        run.font.name = 'Calibri'
        run.font.color.rgb = RGBColor(*color_rgb)
    return p

def create_table(doc, headers, rows_data, col_widths=None):
    table = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    # Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "00534E") # Teal header
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=150, right=150)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.name = 'Calibri'
            run.font.bold = True
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(255, 255, 255)

    # Data Rows
    for r_idx, row in enumerate(rows_data):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = str(val)
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=90, bottom=90, left=140, right=140)
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.name = 'Calibri'
                run.font.size = Pt(8.5)
                run.font.color.rgb = RGBColor(30, 41, 59)

    # Apply column widths if provided
    if col_widths:
        for row in table.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = Inches(width)

    # Border styling via XML
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:insideV w:val="none"/>
            <w:left w:val="none"/>
            <w:right w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)
    
    # Add a little space after table
    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(0)
    p_spacer.paragraph_format.space_after = Pt(8)
    return table

def build_docx(output_path, img1_path, img2_path):
    doc = Document()
    
    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # ---------------------------------------------------------
    # DOCUMENT COVER / TITLE HEADER
    # ---------------------------------------------------------
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(10)
    title_p.paragraph_format.space_after = Pt(2)
    run_title = title_p.add_run("Workshop Management System (WMS)")
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(24)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0, 83, 78) # Ministry Teal

    subtitle_p = doc.add_paragraph()
    subtitle_p.paragraph_format.space_before = Pt(0)
    subtitle_p.paragraph_format.space_after = Pt(12)
    run_sub = subtitle_p.add_run("Technical Architecture & Database Schema Specification")
    run_sub.font.name = 'Calibri'
    run_sub.font.size = Pt(14)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGBColor(71, 85, 105)

    # Metadata callout block
    meta_table = doc.add_table(rows=2, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_widths = [3.4, 3.4]
    meta_data = [
        [("Organization", "Ministry of Education Sri Lanka"), ("System Target", "Enterprise Hybrid Cloud Deployment")],
        [("Document Version", "2.0 (PostgreSQL & Dual-DAL Hybrid)"), ("Last Updated", "November 2026 / Academic Year 2026-2027")]
    ]
    for r_idx, row in enumerate(meta_data):
        for c_idx, (label, val) in enumerate(row):
            cell = meta_table.rows[r_idx].cells[c_idx]
            cell.width = Inches(meta_widths[c_idx])
            set_cell_background(cell, "F1F5F9")
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            p = cell.paragraphs[0]
            r1 = p.add_run(f"{label}: ")
            r1.font.bold = True
            r1.font.size = Pt(8.5)
            r1.font.color.rgb = RGBColor(15, 23, 42)
            r2 = p.add_run(val)
            r2.font.size = Pt(8.5)
            r2.font.color.rgb = RGBColor(51, 65, 85)
            
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(8)
    p_div.paragraph_format.space_after = Pt(12)
    r_div = p_div.add_run("―" * 48)
    r_div.font.color.rgb = RGBColor(203, 213, 225)

    # ---------------------------------------------------------
    # SECTION 1: EXECUTIVE SUMMARY
    # ---------------------------------------------------------
    add_heading_with_spacing(doc, "1. Executive Architecture Summary", level=1)
    
    p = doc.add_paragraph(
        "The Workshop Management System (WMS) is an enterprise web platform designed to administer, "
        "schedule, verify, and financially track training workshops, seminars, and capacity-building programs "
        "across the hierarchy of the Ministry of Education Sri Lanka (National Ministry, Provincial Departments, "
        "Zonal Education Offices, and Educational Divisions). "
        "The system incorporates a hybrid dual-layer database architecture capable of operating with high-concurrency "
        "PostgreSQL servers in production while seamlessly offering offline and zero-config local fallback via structured JSON stores."
    )
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.15

    # ---------------------------------------------------------
    # SECTION 2: SYSTEM ARCHITECTURE & DAL FLOW + IMAGE 1
    # ---------------------------------------------------------
    add_heading_with_spacing(doc, "2. System Architecture & Data Access Layer Flow", level=1)
    
    p = doc.add_paragraph(
        "The platform utilizes an abstraction layer between Next.js API route handlers and physical storage engines. "
        "The Data Access Layer (DAL) automatically detects whether PostgreSQL credentials are present; when available, "
        "connections are managed via a high-performance connection pool (pg.Pool) with SSL verification. When unconfigured, "
        "the system transparently falls back to file-backed in-memory persistence without application restarts."
    )
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.15

    # Embed Image 1
    if os.path.exists(img1_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(6)
        p_img.paragraph_format.space_after = Pt(4)
        run_img = p_img.add_run()
        run_img.add_picture(img1_path, width=Inches(6.8))
        
        caption_p = doc.add_paragraph()
        caption_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        caption_p.paragraph_format.space_after = Pt(14)
        r_cap = caption_p.add_run("Figure 1: WMS Storage & Data Access Layer Architecture (DAL)")
        r_cap.font.italic = True
        r_cap.font.size = Pt(8.5)
        r_cap.font.color.rgb = RGBColor(100, 116, 139)

    # ---------------------------------------------------------
    # SECTION 3: ENTITY RELATIONSHIP MODEL (ERD) + IMAGE 2
    # ---------------------------------------------------------
    add_heading_with_spacing(doc, "3. Entity-Relationship Model (Core Systems)", level=1)
    
    p = doc.add_paragraph(
        "The relational schema is organized into modular functional domains: "
        "1) Administrative Hierarchy & Multi-Tier Role-Based Access Control (RBAC), "
        "2) Workshop Lifecycle Operations & Reschedule Auditing, "
        "3) Annual Implementation Plan (AIP) & Activity Milestone Tracking, and "
        "4) Financial Resource System (FRS) with Quality Assurance & Verification."
    )
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.15

    # Embed Image 2
    if os.path.exists(img2_path):
        p_img2 = doc.add_paragraph()
        p_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img2.paragraph_format.space_before = Pt(6)
        p_img2.paragraph_format.space_after = Pt(4)
        run_img2 = p_img2.add_run()
        run_img2.add_picture(img2_path, width=Inches(6.8))
        
        caption_p2 = doc.add_paragraph()
        caption_p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        caption_p2.paragraph_format.space_after = Pt(14)
        r_cap2 = caption_p2.add_run("Figure 2: WMS Relational Entity-Relationship Diagram (ERD)")
        r_cap2.font.italic = True
        r_cap2.font.size = Pt(8.5)
        r_cap2.font.color.rgb = RGBColor(100, 116, 139)

    # ---------------------------------------------------------
    # SECTION 4: DETAILED TABLE SPECIFICATIONS
    # ---------------------------------------------------------
    add_heading_with_spacing(doc, "4. Database Schema Specifications", level=1)

    # Module 4.1
    add_heading_with_spacing(doc, "4.1. Module 1: Administrative Structure & RBAC", level=2, color_rgb=(15, 76, 129))
    
    doc.add_paragraph("Table 1: organization_types").runs[0].font.bold = True
    create_table(doc, 
        ["Column Name", "Data Type", "Constraints", "Description"],
        [
            ["id", "VARCHAR(100)", "PRIMARY KEY", "Unique tier identifier (e.g. org-type-moe)"],
            ["name", "VARCHAR(255)", "NOT NULL", "Hierarchical label (Ministry, Province, Zone, School)"],
            ["level", "INT", "NOT NULL", "Hierarchy depth (1=MoE, 2=Province, 3=Zone, 4=School)"],
            ["description", "TEXT", "-", "Contextual description of administrative tier"],
            ["created_at", "TIMESTAMPTZ", "DEFAULT NOW()", "System record creation timestamp"]
        ],
        col_widths=[1.5, 1.3, 1.5, 2.5]
    )

    doc.add_paragraph("Table 2: organizations").runs[0].font.bold = True
    create_table(doc,
        ["Column Name", "Data Type", "Constraints", "Description"],
        [
            ["id", "VARCHAR(100)", "PRIMARY KEY", "Organization identifier (e.g. org-wp, org-moe-ict)"],
            ["name", "VARCHAR(255)", "NOT NULL", "Official name of the institution or ministry branch"],
            ["code", "VARCHAR(100)", "-", "Official administrative / ministry code"],
            ["type_id", "VARCHAR(100)", "FK -> organization_types", "Associated level classification"],
            ["parent_id", "VARCHAR(100)", "FK -> organizations", "Parent node for recursive tree hierarchy"],
            ["unit_type", "VARCHAR(50)", "DEFAULT 'location'", "Distinguishes 'location' from operational 'branch'"],
            ["address", "TEXT", "-", "Physical postal address"],
            ["phone", "VARCHAR(50)", "-", "Office contact telephone number"],
            ["email", "VARCHAR(255)", "-", "Official organizational email address"],
            ["is_active", "BOOLEAN", "DEFAULT TRUE", "Operational status flag"]
        ],
        col_widths=[1.3, 1.3, 1.6, 2.6]
    )

    doc.add_paragraph("Table 3: user_roles").runs[0].font.bold = True
    create_table(doc,
        ["Column Name", "Data Type", "Constraints", "Description"],
        [
            ["id", "VARCHAR(100)", "PRIMARY KEY", "Role code (e.g. superadmin, branch-officer)"],
            ["name", "VARCHAR(255)", "NOT NULL", "User-friendly role display label"],
            ["can_create_workshop", "BOOLEAN", "DEFAULT FALSE", "Permission to schedule and register workshops"],
            ["can_approve_workshop", "BOOLEAN", "DEFAULT FALSE", "Authority to endorse or confirm workshop events"],
            ["can_manage_users", "BOOLEAN", "DEFAULT FALSE", "Administration permission over personnel"],
            ["can_view_reports", "BOOLEAN", "DEFAULT FALSE", "Access to system analytics and national reports"],
            ["can_manage_organizations", "BOOLEAN", "DEFAULT FALSE", "Ability to create or modify organizational nodes"]
        ],
        col_widths=[1.7, 1.2, 1.4, 2.5]
    )

    doc.add_paragraph("Table 4: users").runs[0].font.bold = True
    create_table(doc,
        ["Column Name", "Data Type", "Constraints", "Description"],
        [
            ["id", "VARCHAR(100)", "PRIMARY KEY", "Unique user account ID"],
            ["username", "VARCHAR(100)", "UNIQUE NOT NULL", "Login account handle"],
            ["password_hash", "VARCHAR(255)", "NOT NULL", "Bcrypt-hashed authentication secret"],
            ["full_name", "VARCHAR(255)", "NOT NULL", "Officer's full legal name"],
            ["designation", "VARCHAR(255)", "-", "Official designation (e.g. Director, In-Service Advisor)"],
            ["organization_id", "VARCHAR(100)", "FK -> organizations", "Primary assigned organizational station"],
            ["role_id", "VARCHAR(100)", "FK -> user_roles", "Primary authorization role assignment"],
            ["is_active", "BOOLEAN", "DEFAULT TRUE", "Account active/suspended indicator"]
        ],
        col_widths=[1.4, 1.3, 1.5, 2.6]
    )

    # Module 4.2
    add_heading_with_spacing(doc, "4.2. Module 2: Workshop Operations & Attendance", level=2, color_rgb=(15, 76, 129))
    
    doc.add_paragraph("Table 5: workshops (Core Entity)").runs[0].font.bold = True
    create_table(doc,
        ["Column Name", "Data Type", "Constraints", "Description"],
        [
            ["id", "VARCHAR(100)", "PRIMARY KEY", "Workshop UUID"],
            ["workshop_number", "VARCHAR(100)", "-", "Human-readable sequential code (WS-2025-001)"],
            ["year", "VARCHAR(10)", "-", "Implementation academic/budget year"],
            ["branch", "VARCHAR(255)", "-", "Organizing branch name (e.g. IT Branch, Planning)"],
            ["subject", "VARCHAR(255)", "-", "Curriculum subject or thematic area"],
            ["title", "VARCHAR(500)", "NOT NULL", "Complete formal program title"],
            ["aim", "TEXT", "-", "Primary aim and capacity objective"],
            ["target_path", "JSONB", "DEFAULT '[]'", "Organizational hierarchy tree routing path"],
            ["start_date, end_date", "VARCHAR(50)", "-", "Event schedule timeframe"],
            ["venue", "VARCHAR(500)", "-", "Physical hall, school, or center name"],
            ["days_held", "INT", "DEFAULT 1", "Total duration of program in days"],
            ["expected_trainees", "INT", "DEFAULT 0", "Forecasted participant attendance"],
            ["actual_trainees", "INT", "DEFAULT 0", "Final certified physical attendees"],
            ["status", "VARCHAR(50)", "DEFAULT 'Scheduled'", "State: Scheduled, In Progress, Completed, Rescheduled"],
            ["confirmation_status", "VARCHAR(50)", "DEFAULT 'Confirmed'", "Confirmed vs Tentative"],
            ["reschedule_count", "INT", "DEFAULT 0", "Total number of date/venue changes"]
        ],
        col_widths=[1.5, 1.2, 1.4, 2.7]
    )

    doc.add_paragraph("Table 6: workshop_reschedules (Audit Trail)").runs[0].font.bold = True
    create_table(doc,
        ["Column Name", "Data Type", "Constraints", "Description"],
        [
            ["id", "VARCHAR(100)", "PRIMARY KEY", "Reschedule audit log record ID"],
            ["workshop_id", "VARCHAR(100)", "FK -> workshops", "Target workshop reference"],
            ["rescheduled_by_user_id", "VARCHAR(100)", "-", "Actioning officer user ID"],
            ["rescheduled_by_name", "VARCHAR(255)", "-", "Officer full name"],
            ["rescheduled_by_org_name", "VARCHAR(255)", "-", "Officer department / organization"],
            ["old_start_date, old_end_date", "VARCHAR(50)", "-", "Previous schedule window"],
            ["new_start_date, new_end_date", "VARCHAR(50)", "-", "Adjusted schedule window"],
            ["old_venue, new_venue", "VARCHAR(500)", "-", "Venue change tracking"],
            ["reason", "TEXT", "-", "Formal justified reason for postponement/change"]
        ],
        col_widths=[1.7, 1.2, 1.3, 2.6]
    )

    doc.add_paragraph("Table 7: trainees").runs[0].font.bold = True
    create_table(doc,
        ["Column Name", "Data Type", "Constraints", "Description"],
        [
            ["id", "VARCHAR(100)", "PRIMARY KEY", "Trainee record ID"],
            ["workshop_id", "VARCHAR(100)", "FK -> workshops", "Linked workshop"],
            ["nic_number", "VARCHAR(50)", "-", "National Identity Card number"],
            ["name", "VARCHAR(255)", "NOT NULL", "Participant name"],
            ["position", "VARCHAR(255)", "-", "Academic or civil service position"],
            ["school_institute", "VARCHAR(255)", "-", "Participant's originating school / institute"],
            ["region, province", "VARCHAR(255)", "-", "Educational zone and province"],
            ["attendance_status", "VARCHAR(50)", "DEFAULT 'registered'", "Status: registered, attended, absent"],
            ["daily_attendance", "JSONB", "DEFAULT '{}'", "Day-by-day JSON attendance tracking map"]
        ],
        col_widths=[1.5, 1.2, 1.4, 2.7]
    )

    # Module 4.3
    add_heading_with_spacing(doc, "4.3. Module 3: Annual Implementation Plans (AIP)", level=2, color_rgb=(15, 76, 129))
    
    doc.add_paragraph("Table 8: aip_plans").runs[0].font.bold = True
    create_table(doc,
        ["Column Name", "Data Type", "Constraints", "Description"],
        [
            ["id", "VARCHAR(100)", "PRIMARY KEY", "AIP Master Plan ID"],
            ["branch_id", "VARCHAR(100)", "FK -> organizations", "Formulating department / branch ID"],
            ["branch_name", "VARCHAR(255)", "-", "Branch display title"],
            ["year", "VARCHAR(10)", "DEFAULT '2027'", "Implementation financial year"],
            ["main_responsibility", "VARCHAR(255)", "-", "Primary designated coordinating officer"],
            ["status", "VARCHAR(50)", "DEFAULT 'Draft'", "Status: Draft, Submitted, Approved, Dispatched"]
        ],
        col_widths=[1.5, 1.2, 1.4, 2.7]
    )

    doc.add_paragraph("Table 9: aip_activities").runs[0].font.bold = True
    create_table(doc,
        ["Column Name", "Data Type", "Constraints", "Description"],
        [
            ["id", "VARCHAR(100)", "PRIMARY KEY", "AIP Activity ID"],
            ["plan_id", "VARCHAR(100)", "FK -> aip_plans", "Parent annual implementation master plan"],
            ["activity_code", "VARCHAR(50)", "NOT NULL", "Line item code (e.g. ACT-01, ACT-02)"],
            ["activity", "TEXT", "NOT NULL", "Formal activity description"],
            ["vote_number", "VARCHAR(100)", "-", "Assigned treasury vote number"],
            ["estimated_cost", "NUMERIC(15,3)", "DEFAULT 0", "Estimated activity budget in Rs."],
            ["financial_months", "JSONB", "DEFAULT '[]'", "12-month array of financial projections"],
            ["physical_months", "JSONB", "DEFAULT '[]'", "12-month array of physical milestone markers"],
            ["financial_q1 to q4", "NUMERIC(15,3)", "DEFAULT 0", "Quarterly financial breakdown amounts"],
            ["target_q1 to q4", "VARCHAR(50)", "-", "Quarterly performance target descriptions"]
        ],
        col_widths=[1.5, 1.2, 1.4, 2.7]
    )

    # ---------------------------------------------------------
    # SECTION 5: PERFORMANCE INDEXING MATRIX
    # ---------------------------------------------------------
    add_heading_with_spacing(doc, "5. Performance Indexing Matrix", level=1)
    
    p = doc.add_paragraph(
        "To ensure sub-millisecond query performance across large national datasets, "
        "B-Tree indexes are deployed on foreign keys, temporal filters, and status columns."
    )
    p.paragraph_format.space_after = Pt(8)

    create_table(doc,
        ["Index Identifier", "Target Table", "Indexed Columns", "Optimization Objective"],
        [
            ["idx_organizations_parent", "organizations", "(parent_id)", "Fast recursive tree queries for provincial hierarchies"],
            ["idx_organizations_type", "organizations", "(type_id)", "Instant tier filtering (all zones, all schools)"],
            ["idx_users_org", "users", "(organization_id)", "Accelerated lookup of officers by station"],
            ["idx_users_role", "users", "(role_id)", "Rapid evaluation of RBAC authorization rules"],
            ["idx_workshops_place", "workshops", "(place_id)", "Instant venue and host location filtering"],
            ["idx_workshops_status", "workshops", "(status)", "High-performance operational dashboard filtering"],
            ["idx_workshops_year", "workshops", "(year)", "Annual report aggregations and archiving queries"],
            ["idx_trainees_workshop", "trainees", "(workshop_id)", "Instant retrieval of workshop participant lists"],
            ["idx_aip_plans_branch", "aip_plans", "(branch_id, year)", "Composite lookup for branch annual plans"],
            ["idx_aip_activities_branch", "aip_activities", "(branch_id, year)", "Composite query for activity matrix calculations"]
        ],
        col_widths=[1.8, 1.2, 1.3, 2.5]
    )

    # ---------------------------------------------------------
    # SECTION 6: FAILOVER & RESILIENCE STRATEGY
    # ---------------------------------------------------------
    add_heading_with_spacing(doc, "6. Failover & Disaster Recovery Mechanism", level=1)
    
    p = doc.add_paragraph(
        "The system's hybrid DAL architecture guarantees continuous availability through dynamic resilience strategies:\n"
        "• Automatic Reconnection: The PostgreSQL client pool (pg.Pool) automatically handles dropped idle connections with exponential backoff.\n"
        "• Serverless Optimization: In Vercel or AWS Lambda environments, the file store is mounted to the transient /tmp filesystem, seeded dynamically on cold starts.\n"
        "• Data Portability: Built-in export tools in /api/db allow administrators to produce unified JSON snapshots and PostgreSQL dumps on demand."
    )
    p.paragraph_format.space_after = Pt(14)
    p.paragraph_format.line_spacing = 1.15

    doc.save(output_path)
    print(f"Successfully created: {output_path}")

if __name__ == '__main__':
    doc_out = os.path.join(os.getcwd(), 'docs', 'Workshop_MS_Database_Architecture.docx')
    img1 = os.path.join(os.getcwd(), 'docs', 'assets', 'wms_architecture_layer.png')
    img2 = os.path.join(os.getcwd(), 'docs', 'assets', 'wms_erd_diagram.png')
    build_docx(doc_out, img1, img2)
