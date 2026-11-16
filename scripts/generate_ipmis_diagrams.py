import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

OUT_DIR = r"D:\Data\Tests\plan\Workshop-MS-TEST\docs\diagrams"
os.makedirs(OUT_DIR, exist_ok=True)

def draw_card(ax, x, y, w, h, title, subtitle="", bg="#FFFFFF", border="#CBD5E1", text_color="#0F172A", title_size=9, sub_size=7):
    # pad=0 ensures exact width and height without unwanted expansion
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.002,rounding_size=0.015",
        linewidth=1.5,
        edgecolor=border,
        facecolor=bg,
        zorder=2
    )
    ax.add_patch(box)
    
    if subtitle:
        ax.text(x + w / 2, y + h * 0.62, title, ha="center", va="center", fontsize=title_size, fontweight="bold", color=text_color, zorder=3)
        ax.text(x + w / 2, y + h * 0.28, subtitle, ha="center", va="center", fontsize=sub_size, color="#64748B", zorder=3)
    else:
        ax.text(x + w / 2, y + h / 2, title, ha="center", va="center", fontsize=title_size, fontweight="bold", color=text_color, zorder=3)

def draw_arrow(ax, x1, y1, x2, y2, label="", color="#475569", label_pos=0.5, label_offset=(0, 0.025), lw=1.5):
    ax.annotate(
        "",
        xy=(x2, y2),
        xytext=(x1, y1),
        arrowprops=dict(
            arrowstyle="->,head_width=0.25,head_length=0.35",
            color=color,
            lw=lw,
            shrinkA=3,
            shrinkB=3,
        ),
        zorder=4
    )
    if label:
        lx = x1 + (x2 - x1) * label_pos + label_offset[0]
        ly = y1 + (y2 - y1) * label_pos + label_offset[1]
        ax.text(
            lx, ly, label,
            ha="center", va="center",
            fontsize=7,
            fontweight="bold",
            color=color,
            bbox=dict(boxstyle="round,pad=0.25", facecolor="#FFFFFF", edgecolor=color, linewidth=0.75, alpha=0.95),
            zorder=5
        )

# ----------------------------------------------------------------------
# 1. DFD Level 0 Context Diagram
# ----------------------------------------------------------------------
def generate_dfd_level_0():
    fig, ax = plt.subplots(figsize=(13, 8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#F8FAFC")

    # Header
    ax.text(0.5, 0.965, "IPMIS - DFD Level 0: National System Context Diagram", ha="center", va="center", fontsize=15, fontweight="bold", color="#8D153A")
    ax.text(0.5, 0.935, "Ministry of Education • Integrated Planning & Monitoring Information System", ha="center", va="center", fontsize=9.5, color="#475569")

    # Central Core System
    core_box = FancyBboxPatch((0.36, 0.36), 0.28, 0.26, boxstyle="round,pad=0.002,rounding_size=0.02", linewidth=2.5, edgecolor="#FFBE29", facecolor="#8D153A", zorder=3)
    ax.add_patch(core_box)
    ax.text(0.5, 0.54, "[ 0.0 ]", ha="center", va="center", fontsize=11, fontweight="bold", color="#FFBE29", zorder=4)
    ax.text(0.5, 0.47, "MoE-IPMIS\nCore System", ha="center", va="center", fontsize=12.5, fontweight="bold", color="#FFFFFF", zorder=4)
    ax.text(0.5, 0.40, "National Data Engine & Telemetry", ha="center", va="center", fontsize=8, color="#F1F5F9", zorder=4)

    # 1. General Treasury (Top)
    draw_card(ax, 0.37, 0.77, 0.26, 0.11, "General Treasury / MoF", "Ceilings, Allocations & Object Codes", bg="#EFF6FF", border="#3B82F6", text_color="#1E40AF")
    draw_arrow(ax, 0.44, 0.77, 0.44, 0.62, "Budget Ceilings", color="#1E40AF", label_offset=(-0.05, 0))
    draw_arrow(ax, 0.56, 0.62, 0.56, 0.77, "Financial Progress", color="#1E40AF", label_offset=(0.05, 0))

    # 2. National Planning Division (Top Left)
    draw_card(ax, 0.04, 0.64, 0.25, 0.11, "National Planning Division", "Strategic Objectives & MTEF Formulations", bg="#FEFCE8", border="#EAB308", text_color="#854D0E")
    draw_arrow(ax, 0.29, 0.67, 0.36, 0.56, "Strategic Goals & AIP", color="#854D0E", label_offset=(0, 0.03))
    draw_arrow(ax, 0.36, 0.51, 0.29, 0.62, "National Rollups", color="#854D0E", label_offset=(0, -0.03))

    # 3. Provincial & Zonal Education Depts (Bottom Left)
    draw_card(ax, 0.04, 0.23, 0.25, 0.11, "9 Provincial & 100 Zonal Depts", "Proposals, Execution & Progress", bg="#F0FDF4", border="#16A34A", text_color="#166534")
    draw_arrow(ax, 0.29, 0.31, 0.36, 0.42, "Budget Proposals", color="#166534", label_offset=(0, 0.03))
    draw_arrow(ax, 0.36, 0.37, 0.29, 0.26, "Allocations & Dashboards", color="#166534", label_offset=(0, -0.03))

    # 4. Schools & Field Divisions (Bottom)
    draw_card(ax, 0.37, 0.06, 0.26, 0.11, "Schools & Divisional Offices", "Attendance, Logistics & Delivery", bg="#F8FAFC", border="#64748B", text_color="#1E293B")
    draw_arrow(ax, 0.44, 0.17, 0.44, 0.36, "Attendance & Vouchers", color="#475569", label_offset=(-0.07, 0))
    draw_arrow(ax, 0.56, 0.36, 0.56, 0.17, "Schedules & Logistics", color="#475569", label_offset=(0.07, 0))

    # 5. Field M&E & QA Verification Officers (Bottom Right)
    draw_card(ax, 0.71, 0.23, 0.25, 0.11, "Field Monitoring & QA Officers", "Independent Audits & Evidence", bg="#FDF2F8", border="#DB2777", text_color="#9D174D")
    draw_arrow(ax, 0.71, 0.31, 0.64, 0.42, "Field Observations & QA", color="#9D174D", label_offset=(0, 0.03))
    draw_arrow(ax, 0.64, 0.37, 0.71, 0.26, "Flagged Deviations", color="#9D174D", label_offset=(0, -0.03))

    # 6. Public Transparency & Viewers (Top Right)
    draw_card(ax, 0.71, 0.64, 0.25, 0.11, "Public & Institutional Viewers", "Open Data & Province Map", bg="#F5F3FF", border="#8B5CF6", text_color="#5B21B6")
    draw_arrow(ax, 0.64, 0.56, 0.71, 0.67, "Aggregated Progress", color="#5B21B6", label_offset=(0, 0.03))
    draw_arrow(ax, 0.71, 0.62, 0.64, 0.51, "Telemetry Query", color="#5B21B6", label_offset=(0, -0.03))

    # Footer note
    ax.text(0.5, 0.018, "Governance Standards: 4-Dimensional RBAC • Immutable Audit Trails • MoE Traffic Light System Standard", ha="center", va="center", fontsize=8, color="#64748B", style="italic")

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "dfd_level_0_context.png"), bbox_inches="tight")
    plt.close()
    print("Regenerated dfd_level_0_context.png")

# ----------------------------------------------------------------------
# 2. DFD Level 1 System Flow Diagram
# ----------------------------------------------------------------------
def generate_dfd_level_1():
    fig, ax = plt.subplots(figsize=(13, 8.5), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#F8FAFC")

    # Header
    ax.text(0.5, 0.97, "IPMIS - DFD Level 1: Subsystem Data Flow Architecture", ha="center", va="center", fontsize=15, fontweight="bold", color="#8D153A")
    ax.text(0.5, 0.94, "Decomposition of Core Functional Subsystems, Pipelines & Data Stores", ha="center", va="center", fontsize=9.5, color="#475569")

    # Layout Coordinates
    c1_x, c2_x, c3_x = 0.05, 0.375, 0.70
    w = 0.25
    r1_y, r2_y, r3_y = 0.74, 0.44, 0.14
    h_proc, h_store = 0.13, 0.12

    # Row 1: Core Formulations (Top)
    draw_card(ax, c1_x, r1_y, w, h_proc, "1.0 Budget Formulation\n& Ceiling Allocation", "Treasury Ceilings & Object Codes", bg="#EFF6FF", border="#3B82F6", text_color="#1E40AF")
    draw_card(ax, c2_x, r1_y, w, h_proc, "2.0 AIP Matrix Formulation\n& Target Cascading", "25-Col & 29-Col Multi-Tier Plans", bg="#FEFCE8", border="#EAB308", text_color="#854D0E")
    draw_card(ax, c3_x, r1_y, w, h_proc, "3.0 Workshop Scheduling\n& Logistics Delivery", "Sessions, Trainees & Resource Persons", bg="#F0FDF4", border="#16A34A", text_color="#166534")

    # Row 2: Central Data Stores (Middle)
    draw_card(ax, c1_x, r2_y, w, h_store, "D1: Budget & Ceilings Store", "Allocations, Warrants & Codes", bg="#F1F5F9", border="#94A3B8", text_color="#334155")
    draw_card(ax, c2_x, r2_y, w, h_store, "D2: AIP Matrix & Amendments", "Multi-Year Activities & Milestones", bg="#F1F5F9", border="#94A3B8", text_color="#334155")
    draw_card(ax, c3_x, r2_y, w, h_store, "D3: Workshop & Trainee Store", "Schedules, Attendance, Vouchers", bg="#F1F5F9", border="#94A3B8", text_color="#334155")

    # Row 3: Execution, Monitoring & Telemetry (Bottom)
    draw_card(ax, c1_x, r3_y, w, h_proc, "4.0 Expenditure Tracking\n& Voucher Accounting", "Commitments, Paid Actuals & Vouchers", bg="#FFFBEB", border="#F59E0B", text_color="#B45309")
    draw_card(ax, c2_x, r3_y, w, h_proc, "5.0 Field Monitoring\n& Deviation Logging", "Inspections & Corrective Actions", bg="#FDF2F8", border="#DB2777", text_color="#9D174D")
    draw_card(ax, c3_x, r3_y, w, h_proc, "6.0 QA Verification, Broadcast\nSync & 6-Tile Dashboard", "BroadcastChannel, S-Curve & Traffic Lights", bg="#F5F3FF", border="#8B5CF6", text_color="#5B21B6")

    # Connectors
    # P1 -> D1
    draw_arrow(ax, c1_x + w/2, r1_y, c1_x + w/2, r2_y + h_store, "Ceilings & Approvals", color="#3B82F6", label_offset=(-0.06, 0))
    # D1 -> P2
    draw_arrow(ax, c1_x + w, r2_y + h_store * 0.8, c2_x, r1_y + h_proc * 0.2, "Ceiling Allocations", color="#1E40AF")
    # P2 -> D2
    draw_arrow(ax, c2_x + w/2, r1_y, c2_x + w/2, r2_y + h_store, "Approved Activities", color="#EAB308", label_offset=(0.06, 0))
    # D2 -> P3
    draw_arrow(ax, c2_x + w, r2_y + h_store * 0.8, c3_x, r1_y + h_proc * 0.2, "Activity Mandates", color="#854D0E")
    # P3 -> D3
    draw_arrow(ax, c3_x + w/2, r1_y, c3_x + w/2, r2_y + h_store, "Workshop Records", color="#16A34A", label_offset=(0.06, 0))

    # D3 -> P4
    draw_arrow(ax, c3_x + 0.05, r2_y, c1_x + w - 0.02, r3_y + h_proc, "Delivery Costs", color="#B45309")
    # P4 -> D2
    draw_arrow(ax, c1_x + w/2, r3_y + h_proc, c2_x + 0.05, r2_y, "Actual Expenditure", color="#B45309")

    # D3 -> P5
    draw_arrow(ax, c3_x + 0.10, r2_y, c2_x + w/2, r3_y + h_proc, "In-Field Sessions", color="#DB2777")
    # P5 -> D2
    draw_arrow(ax, c2_x + w/2, r3_y + h_proc, c2_x + w/2, r2_y, "Milestone Progress", color="#DB2777")

    # D2 -> P6
    draw_arrow(ax, c2_x + w, r2_y + 0.02, c3_x + 0.05, r3_y + h_proc, "Reported KPIs", color="#8B5CF6")
    # P6 -> Output
    draw_arrow(ax, c3_x + w/2, r3_y, c3_x + w/2, 0.03, "MoE Traffic Light Rollup", color="#8B5CF6", label_offset=(0.08, 0.04))

    # Footer note
    ax.text(0.5, 0.015, "Data Flows comply with ISO 27001 Data Integrity & National Sri Lanka Education MTEF Guidelines", ha="center", va="center", fontsize=8, color="#64748B", style="italic")

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "dfd_level_1_overview.png"), bbox_inches="tight")
    plt.close()
    print("Regenerated dfd_level_1_overview.png")

# ----------------------------------------------------------------------
# 3. DFD Level 2 AIP & Workshop Lifecycle Diagram
# ----------------------------------------------------------------------
def generate_dfd_level_2():
    fig, ax = plt.subplots(figsize=(13, 8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#F8FAFC")

    # Header
    ax.text(0.5, 0.97, "IPMIS - DFD Level 2: Detailed AIP Activity & Workshop Execution Lifecycle", ha="center", va="center", fontsize=15, fontweight="bold", color="#8D153A")
    ax.text(0.5, 0.94, "From 3-Year Strategic Goal Formulation to QA Evidence Verification & Telemetry Aggregation", ha="center", va="center", fontsize=9.5, color="#475569")

    # Grid parameters
    c1, c2, c3 = 0.05, 0.375, 0.70
    w = 0.25
    r1, r2, r3 = 0.72, 0.42, 0.12
    h = 0.16

    steps = [
        ("2.1 Strategic Objective\n& Programme Mapping", "MTEF 3-Yr Horizon", c1, r1, "#EFF6FF", "#3B82F6", "#1E40AF"),
        ("2.2 25/29-Col AIP Formulation\n& Quarterly Targets", "Physical & Financial Targets", c2, r1, "#FEFCE8", "#EAB308", "#854D0E"),
        ("2.3 National / Apex\nApproval & Warrants", "Administrative Sanction", c3, r1, "#F0FDF4", "#16A34A", "#166534"),
        ("2.6 Expenditure Posting\n& Physical Milestone", "Commitment & Paid Vouchers", c1, r2, "#F5F3FF", "#8B5CF6", "#5B21B6"),
        ("2.5 Workshop Execution\n& Attendance Vouchers", "In-Field Service Delivery", c2, r2, "#FDF2F8", "#DB2777", "#9D174D"),
        ("2.4 Workshop Scheduling\n& Participant Registry", "Trainees & Resource Persons", c3, r2, "#FFFBEB", "#F59E0B", "#B45309"),
        ("2.7 Field M&E Inspection\n& Deviation Logging", "Root Cause & Corrective Action", c1, r3, "#FFF1F2", "#E11D48", "#9F1239"),
        ("2.8 Independent QA Audit\n& Evidence Verification", "Dossier Signoff (Verified/Reject)", c2, r3, "#F0FDFA", "#0D9488", "#115E59"),
        ("2.9 Live Telemetry Rollup\n& 6-Tile Management Sync", "Gantt, S-Curve & Broadcast Channel", c3, r3, "#FAF5FF", "#7C3AED", "#581C87")
    ]

    for title, sub, x, y, bg, border, txt in steps:
        draw_card(ax, x, y, w, h, title, sub, bg=bg, border=border, text_color=txt, title_size=9, sub_size=7)

    # Clean non-overlapping directional connectors
    # Row 1: Left to Right
    draw_arrow(ax, c1 + w, r1 + h/2, c2, r1 + h/2, "Strategic Link", color="#3B82F6")
    draw_arrow(ax, c2 + w, r1 + h/2, c3, r1 + h/2, "Submit Plan", color="#EAB308")

    # Down from 2.3 to 2.4
    draw_arrow(ax, c3 + w/2, r1, c3 + w/2, r2 + h, "Approved AIP", color="#16A34A", label_offset=(0.06, 0))

    # Row 2: Right to Left
    draw_arrow(ax, c3, r2 + h/2, c2 + w, r2 + h/2, "Sessions Ready", color="#F59E0B")
    draw_arrow(ax, c2, r2 + h/2, c1 + w, r2 + h/2, "Attendance Held", color="#DB2777")

    # Down from 2.6 to 2.7
    draw_arrow(ax, c1 + w/2, r2, c1 + w/2, r3 + h, "Reported KPIs", color="#8B5CF6", label_offset=(-0.06, 0))

    # Row 3: Left to Right
    draw_arrow(ax, c1 + w, r3 + h/2, c2, r3 + h/2, "Observations Logged", color="#E11D48")
    draw_arrow(ax, c2 + w, r3 + h/2, c3, r3 + h/2, "QA Verified", color="#0D9488")

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "dfd_level_2_aip_workshop.png"), bbox_inches="tight")
    plt.close()
    print("Regenerated dfd_level_2_aip_workshop.png")

# ----------------------------------------------------------------------
# 4. 4D Role & Access Control Hierarchy Diagram
# ----------------------------------------------------------------------
def generate_role_hierarchy_diagram():
    fig, ax = plt.subplots(figsize=(13, 8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#F8FAFC")

    # Header
    ax.text(0.5, 0.97, "IPMIS - 4-Dimensional Institutional Access Control Matrix", ha="center", va="center", fontsize=15, fontweight="bold", color="#8D153A")
    ax.text(0.5, 0.94, "Administrative Tiers • Functional Divisions • Scope Boundaries • Operational Permissions", ha="center", va="center", fontsize=9.5, color="#475569")

    # Column 1: Administrative Tiers (Left)
    c1_x, w1 = 0.05, 0.27
    h_level = 0.095
    levels = [
        ("Level 0: Master Super Admin", "superadmin • Full System Control", c1_x, 0.77, "#FEF2F2", "#EF4444", "#991B1B"),
        ("Level 1: National MoE Admin", "moe.admin, admin • National Line", c1_x, 0.64, "#EFF6FF", "#3B82F6", "#1E40AF"),
        ("Level 2: Apex Institution Admin", "nie.admin • NIE & Apex Bodies", c1_x, 0.51, "#FEFCE8", "#EAB308", "#854D0E"),
        ("Level 3: Provincial Admin", "provincial.admin • 9 Provinces", c1_x, 0.38, "#F0FDF4", "#16A34A", "#166534"),
        ("Level 4: Zonal Admin", "zonal.admin • 100 Zones", c1_x, 0.25, "#FDF2F8", "#DB2777", "#9D174D"),
        ("Level 5: Divisional Admin", "divisional.admin • Divisions & Schools", c1_x, 0.12, "#F8FAFC", "#64748B", "#1E293B"),
    ]
    for title, sub, x, y, bg, border, txt in levels:
        draw_card(ax, x, y, w1, h_level, title, sub, bg=bg, border=border, text_color=txt, title_size=8.5, sub_size=6.8)

    # Column 2: Functional Divisions (Center)
    c2_x, w2 = 0.365, 0.27
    divisions = [
        ("Planning Division (Lead)", "Formulates MTEF, 25/29-Col AIP,\nApproves Allocations & Deadlines", c2_x, 0.65, "#FEFCE8", "#EAB308", "#854D0E"),
        ("Monitoring & QA Division", "Independent Field Inspections,\nQA Verification Index, Traffic Light", c2_x, 0.40, "#FDF2F8", "#DB2777", "#9D174D"),
        ("Operating Branch / Normal", "Workshop Delivery, Teacher Training,\nLocal Spend, Logistics & Vouchers", c2_x, 0.15, "#EFF6FF", "#3B82F6", "#1E40AF")
    ]
    for title, sub, x, y, bg, border, txt in divisions:
        draw_card(ax, x, y, w2, 0.19, title, sub, bg=bg, border=border, text_color=txt, title_size=9, sub_size=7)

    # Column 3: Operational Capabilities (Right)
    c3_x, w3 = 0.68, 0.27
    h_cap = 0.12
    capabilities = [
        ("System Architecture & Schema", "Financial Years, Deadlines, Users & DB", c3_x, 0.75, "#F1F5F9", "#475569", "#0F172A"),
        ("AIP Matrix Formulation & Approval", "25/29-Col Entry, Ceilings & Amendments", c3_x, 0.59, "#F1F5F9", "#475569", "#0F172A"),
        ("Workshop Execution & Logistics", "Scheduling, Attendance & Vouchers", c3_x, 0.43, "#F1F5F9", "#475569", "#0F172A"),
        ("Independent Monitoring & QA", "Field Inspections, Traffic Light Scoring", c3_x, 0.27, "#F1F5F9", "#475569", "#0F172A"),
        ("Public Transparency & Telemetry", "Province Map & Real-Time Dashboards", c3_x, 0.11, "#F1F5F9", "#475569", "#0F172A")
    ]
    for title, sub, x, y, bg, border, txt in capabilities:
        draw_card(ax, x, y, w3, h_cap, title, sub, bg=bg, border=border, text_color=txt, title_size=8.5, sub_size=6.8)

    # Connectors
    draw_arrow(ax, c1_x + w1, 0.82, c2_x, 0.75, "Full Authority", color="#EF4444")
    draw_arrow(ax, c1_x + w1, 0.69, c2_x, 0.74, "National Policy", color="#3B82F6")
    draw_arrow(ax, c1_x + w1, 0.43, c2_x, 0.24, "Regional Ops", color="#16A34A")

    draw_arrow(ax, c2_x + w2, 0.74, c3_x, 0.65, "Formulates AIP", color="#854D0E")
    draw_arrow(ax, c2_x + w2, 0.49, c3_x, 0.33, "Verifies QA", color="#9D174D")
    draw_arrow(ax, c2_x + w2, 0.24, c3_x, 0.49, "Executes Sessions", color="#1E40AF")

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "role_hierarchy_access_control.png"), bbox_inches="tight")
    plt.close()
    print("Regenerated role_hierarchy_access_control.png")

# ----------------------------------------------------------------------
# 5. Full System & Technology Architecture Diagram
# ----------------------------------------------------------------------
def generate_system_architecture_diagram():
    fig, ax = plt.subplots(figsize=(13, 8.5), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#F8FAFC")

    # Header
    ax.text(0.5, 0.975, "IPMIS - Full System Architecture & Technology Stack", ha="center", va="center", fontsize=15, fontweight="bold", color="#8D153A")
    ax.text(0.5, 0.945, "Next.js 14 App Router • NextAuth.js • Telemetry Engine • Dual Persistence Tier", ha="center", va="center", fontsize=9.5, color="#475569")

    # Outer Tier Enclosures
    # Tier 1 (Top)
    t1_box = FancyBboxPatch((0.04, 0.68), 0.92, 0.23, boxstyle="round,pad=0.002,rounding_size=0.015", linewidth=1.5, edgecolor="#0284C7", facecolor="#F0F9FF")
    ax.add_patch(t1_box)
    ax.text(0.06, 0.88, "TIER 1: PRESENTATION & CLIENT VIEWPORT (Next.js 14 App Router, React 18, Tailwind CSS)", fontsize=8.5, fontweight="bold", color="#0369A1")
    draw_card(ax, 0.06, 0.70, 0.26, 0.15, "Public Transparency Landing", "Province Map, Symmetrical Layout, 0px Overflow", bg="#FFFFFF", border="#BAE6FD")
    draw_card(ax, 0.37, 0.70, 0.26, 0.15, "Institutional Auth & SSO", "Side-by-Side Single-Screen Login", bg="#FFFFFF", border="#BAE6FD")
    draw_card(ax, 0.68, 0.70, 0.26, 0.15, "6-Tile Multi-Window Dashboard", "Live BroadcastChannel, S-Curve & Timeline", bg="#FFFFFF", border="#BAE6FD")

    # Tier 2 (Middle)
    t2_box = FancyBboxPatch((0.04, 0.36), 0.92, 0.28, boxstyle="round,pad=0.002,rounding_size=0.015", linewidth=1.5, edgecolor="#8D153A", facecolor="#FDF2F8")
    ax.add_patch(t2_box)
    ax.text(0.06, 0.61, "TIER 2: APPLICATION ENGINE & SECURITY PIPELINE (Next.js Server Actions, Route Handlers, Node.js)", fontsize=8.5, fontweight="bold", color="#8D153A")
    draw_card(ax, 0.06, 0.38, 0.20, 0.19, "Authentication & RBAC\n(NextAuth.js v4)", "JWT Sessions, Bcrypt,\n4D Permission Guard", bg="#FFFFFF", border="#FBCFE8")
    draw_card(ax, 0.285, 0.38, 0.20, 0.19, "Telemetry & Live Engine\n(/api/system/telemetry)", "Traffic Light Calculator, Broadcast\nSync & SLST Timestamp Engine", bg="#FFFFFF", border="#FBCFE8")
    draw_card(ax, 0.51, 0.38, 0.20, 0.19, "Planning & AIP Service\n(/api/aip, /api/budget)", "25/29-Col Matrices,\nMTEF Formulations", bg="#FFFFFF", border="#FBCFE8")
    draw_card(ax, 0.735, 0.38, 0.20, 0.19, "Audit & Monitoring Service\n(/api/monitoring, /api/qa)", "Immutable Logs, Verification,\nEvidence Vault", bg="#FFFFFF", border="#FBCFE8")

    # Tier 3 (Bottom)
    t3_box = FancyBboxPatch((0.04, 0.05), 0.92, 0.27, boxstyle="round,pad=0.002,rounding_size=0.015", linewidth=1.5, edgecolor="#16A34A", facecolor="#F0FDF4")
    ax.add_patch(t3_box)
    ax.text(0.06, 0.29, "TIER 3: PERSISTENCE, CACHING & EXTERNAL ECOSYSTEM INTEGRATIONS", fontsize=8.5, fontweight="bold", color="#166534")
    draw_card(ax, 0.06, 0.07, 0.26, 0.18, "PostgreSQL Database Engine\n(Primary Relational Store)", "Workshops, Trainees, AIP Activities,\nAudit Logs, Users & Roles", bg="#FFFFFF", border="#BBF7D0")
    draw_card(ax, 0.37, 0.07, 0.26, 0.18, "In-Memory Micro-Cache &\nJSON Snapshot Fallback", "Sub-Millisecond Read Engine,\nStat Mtime Freshness Validation", bg="#FFFFFF", border="#BBF7D0")
    draw_card(ax, 0.68, 0.07, 0.26, 0.18, "External Integrations &\nGIS geoBoundaries Layer", "Google/Apple/Outlook iCal Sync,\nSri Lanka Province Polygon Engine", bg="#FFFFFF", border="#BBF7D0")

    # Connectors between tiers
    draw_arrow(ax, 0.19, 0.68, 0.16, 0.57, "HTTPS / REST", color="#0284C7")
    draw_arrow(ax, 0.50, 0.68, 0.38, 0.57, "Dynamic Telemetry", color="#0284C7")
    draw_arrow(ax, 0.81, 0.68, 0.61, 0.57, "CRUD AIP & Workshops", color="#0284C7")

    draw_arrow(ax, 0.16, 0.38, 0.19, 0.25, "Pooled Queries", color="#16A34A")
    draw_arrow(ax, 0.38, 0.38, 0.50, 0.25, "Mtime Cached Reads", color="#16A34A")
    draw_arrow(ax, 0.83, 0.38, 0.81, 0.25, "Calendar Sync & GeoJSON", color="#16A34A")

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "system_architecture_diagram.png"), bbox_inches="tight")
    plt.close()
    print("Regenerated system_architecture_diagram.png")

if __name__ == "__main__":
    generate_dfd_level_0()
    generate_dfd_level_1()
    generate_dfd_level_2()
    generate_role_hierarchy_diagram()
    generate_system_architecture_diagram()
    print("All diagrams regenerated with pixel-perfect geometries!")
