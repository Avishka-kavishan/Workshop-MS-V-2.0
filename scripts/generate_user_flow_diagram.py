import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Polygon

# Ensure output directory
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(WORKSPACE_DIR, "docs", "diagrams")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "system_user_flow.png")

# Set matplotlib cache directory to avoid temp warning
os.environ["MPLCONFIGDIR"] = os.path.join(WORKSPACE_DIR, ".matplotlib_cache")
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

def draw_card(ax, x, y, w, h, title, subtitle="", items=None, bg="#FFFFFF", border="#CBD5E1", 
              text_color="#0F172A", title_size=9, sub_size=7.5, item_size=6.5, lw=1.5, radius=0.012):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.001,rounding_size={radius}",
        linewidth=lw,
        edgecolor=border,
        facecolor=bg,
        zorder=2
    )
    ax.add_patch(box)
    
    if items:
        # Card with title, subtitle, and bullet items
        ax.text(x + w / 2, y + h - 0.022, title, ha="center", va="top", fontsize=title_size, fontweight="bold", color=text_color, zorder=3)
        if subtitle:
            ax.text(x + w / 2, y + h - 0.042, subtitle, ha="center", va="top", fontsize=sub_size, color="#475569", style="italic", zorder=3)
        
        start_y = y + h - (0.065 if subtitle else 0.045)
        step = (start_y - (y + 0.015)) / max(len(items), 1)
        for i, item in enumerate(items):
            iy = start_y - i * step
            ax.text(x + 0.012, iy, f"• {item}", ha="left", va="center", fontsize=item_size, color="#334155", zorder=3)
    elif subtitle:
        ax.text(x + w / 2, y + h * 0.62, title, ha="center", va="center", fontsize=title_size, fontweight="bold", color=text_color, zorder=3)
        ax.text(x + w / 2, y + h * 0.30, subtitle, ha="center", va="center", fontsize=sub_size, color="#64748B", zorder=3)
    else:
        ax.text(x + w / 2, y + h / 2, title, ha="center", va="center", fontsize=title_size, fontweight="bold", color=text_color, zorder=3)

def draw_diamond(ax, cx, cy, w, h, title, subtitle="", bg="#FFFBEB", border="#F59E0B", text_color="#92400E"):
    pts = [
        [cx, cy + h / 2],
        [cx + w / 2, cy],
        [cx, cy - h / 2],
        [cx - w / 2, cy]
    ]
    poly = Polygon(pts, closed=True, edgecolor=border, facecolor=bg, linewidth=1.5, zorder=2)
    ax.add_patch(poly)
    
    if subtitle:
        ax.text(cx, cy + 0.012, title, ha="center", va="center", fontsize=8, fontweight="bold", color=text_color, zorder=3)
        ax.text(cx, cy - 0.014, subtitle, ha="center", va="center", fontsize=6.5, color="#B45309", zorder=3)
    else:
        ax.text(cx, cy, title, ha="center", va="center", fontsize=8, fontweight="bold", color=text_color, zorder=3)

def draw_arrow(ax, x1, y1, x2, y2, label="", color="#475569", label_pos=0.5, label_offset=(0, 0), lw=1.5, rad=0.0):
    connectionstyle = f"arc3,rad={rad}" if rad != 0 else "arc3"
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
            connectionstyle=connectionstyle
        ),
        zorder=4
    )
    if label:
        lx = x1 + (x2 - x1) * label_pos + label_offset[0]
        ly = y1 + (y2 - y1) * label_pos + label_offset[1]
        ax.text(
            lx, ly, label,
            ha="center", va="center",
            fontsize=6.5,
            fontweight="bold",
            color=color,
            bbox=dict(boxstyle="round,pad=0.2", facecolor="#FFFFFF", edgecolor=color, linewidth=0.6, alpha=0.95),
            zorder=5
        )

def generate_user_flow():
    fig, ax = plt.subplots(figsize=(16, 11), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#F8FAFC")

    # -------------------------------------------------------------------------
    # Header Banner (Sri Lanka MoE Maroon & Gold branding)
    # -------------------------------------------------------------------------
    header_box = FancyBboxPatch((0.02, 0.925), 0.96, 0.065, boxstyle="round,pad=0.001,rounding_size=0.01",
                                linewidth=1.5, edgecolor="#FFBE29", facecolor="#8D153A", zorder=2)
    ax.add_patch(header_box)
    ax.text(0.04, 0.965, "MINISTRY OF EDUCATION • SRI LANKA", fontsize=9, fontweight="bold", color="#FFBE29", zorder=3)
    ax.text(0.04, 0.940, "MoE-IPMIS: System User Flow (User Journey, Decisions & Actions)", fontsize=13, fontweight="bold", color="#FFFFFF", zorder=3)
    ax.text(0.96, 0.950, "Standard Operating Workflow • 6 Operational Tiers", ha="right", va="center", fontsize=8.5, color="#E2E8F0", zorder=3)

    # -------------------------------------------------------------------------
    # Background Swimlane Tiers (Columns)
    # -------------------------------------------------------------------------
    lanes = [
        ("STAGE 1: AUTH & ROLE SCOPE", 0.02, 0.145, "#F1F5F9", "#CBD5E1", "#1E293B"),
        ("STAGE 2: BUDGET & AIP PLANNING", 0.18, 0.18, "#EFF6FF", "#93C5FD", "#1E40AF"),
        ("STAGE 3: GOVERNANCE & APPROVAL", 0.375, 0.17, "#FAF5FF", "#D8B4FE", "#6B21A8"),
        ("STAGE 4: WORKSHOP EXECUTION", 0.56, 0.18, "#ECFDF5", "#6EE7B7", "#065F46"),
        ("STAGE 5: FIELD MONITORING & QA", 0.755, 0.14, "#FFFBEB", "#FCD34D", "#92400E"),
        ("STAGE 6: TELEMETRY & AUDIT", 0.91, 0.07, "#FFF1F2", "#FDA4AF", "#9F1239")
    ]
    
    for title, lx, lw_box, bg_c, bdr_c, txt_c in lanes:
        lane_box = FancyBboxPatch((lx, 0.03), lw_box, 0.88, boxstyle="round,pad=0.001,rounding_size=0.008",
                                  linewidth=1, edgecolor=bdr_c, facecolor=bg_c, alpha=0.45, zorder=1)
        ax.add_patch(lane_box)
        ax.text(lx + lw_box / 2, 0.895, title, ha="center", va="center", fontsize=7.5, fontweight="bold", color=txt_c, zorder=2)

    # -------------------------------------------------------------------------
    # STAGE 1: Authentication & Role Scoping
    # -------------------------------------------------------------------------
    draw_card(ax, 0.03, 0.76, 0.125, 0.11, "1. Portal Entry", "Institutional Access",
              ["Visit Web Portal", "Enter Username & Pwd", "Default: password123"],
              bg="#FFFFFF", border="#1E293B", text_color="#1E293B", title_size=8.5)

    draw_card(ax, 0.03, 0.58, 0.125, 0.14, "2. 4D-RBAC Enforcer", "Permission Scoping",
              ["Check Admin Hierarchy", "Scope by Geo/Branch", "Filter Operational Caps", "Toggle Dual-Role (EQD/Plan)"],
              bg="#F8FAFC", border="#64748B", text_color="#0F172A", title_size=8)

    draw_card(ax, 0.03, 0.38, 0.125, 0.16, "3. Persona Fast-Switch", "Demo & Audit Switcher",
              ["Level 0: Super Admin", "Level 1: MOE Line HQ", "Level 2-4: PED / ZEO / DEO", "Special: EQD/Planning", "Normal: ICT/Maths/Reforms"],
              bg="#FFFFFF", border="#94A3B8", text_color="#1E293B", title_size=8)

    draw_arrow(ax, 0.092, 0.76, 0.092, 0.72, lw=1.2)
    draw_arrow(ax, 0.092, 0.58, 0.092, 0.54, lw=1.2)

    # -------------------------------------------------------------------------
    # STAGE 2: Budget & AIP Planning (Planners & Branch Officers)
    # -------------------------------------------------------------------------
    draw_card(ax, 0.19, 0.73, 0.16, 0.14, "4. Budget Proposal Formulation", "Stage 1: Multi-Year Ceilings",
              ["Query Treasury Ceilings", "Select Standard Object Codes", "Enter Recurrent vs Capital", "Attach Justification Notes"],
              bg="#FFFFFF", border="#3B82F6", text_color="#1D4ED8", title_size=8.5)

    draw_card(ax, 0.19, 0.52, 0.16, 0.17, "5. AIP Matrix Formulation", "Stage 2: 25 / 29-Column Matrices",
              ["Define Strategic Pillars", "Formulate Key Activities", "Set Q1-Q4 Physical Targets", "Set Quarterly Financial Breakdown", "Validate KPI Output Metrics"],
              bg="#FFFFFF", border="#2563EB", text_color="#1E40AF", title_size=8.5)

    draw_card(ax, 0.19, 0.34, 0.16, 0.13, "6. Internal Branch Review", "Branch Head Verification",
              ["Check Ceiling Compliance", "Verify Objective Alignment", "Mark Submission Ready", "Submit to Planning Directorate"],
              bg="#F0F9FF", border="#60A5FA", text_color="#0369A1", title_size=8)

    draw_arrow(ax, 0.155, 0.65, 0.19, 0.80, label="Planners Login", color="#2563EB", lw=1.3)
    draw_arrow(ax, 0.27, 0.73, 0.27, 0.69, label="Ceilings Set", color="#2563EB", lw=1.2)
    draw_arrow(ax, 0.27, 0.52, 0.27, 0.47, label="Activities Drafted", color="#2563EB", lw=1.2)

    # -------------------------------------------------------------------------
    # STAGE 3: Governance Review & Statutory Approval (Planning & EQD)
    # -------------------------------------------------------------------------
    draw_card(ax, 0.385, 0.73, 0.15, 0.14, "7. Governance Review Hub", "Policy Planning & EQD Officers",
              ["Receive Branch Submissions", "Audit Ceiling Utilization", "Verify Strategic Alignment", "Cross-check Provincial Targets"],
              bg="#FFFFFF", border="#7C3AED", text_color="#6D28D9", title_size=8.5)

    draw_diamond(ax, 0.46, 0.58, 0.13, 0.09, "8. Approval Gate", "Criteria Compliance?",
                 bg="#FEF3C7", border="#D97706", text_color="#B45309")

    draw_card(ax, 0.385, 0.41, 0.15, 0.10, "Revision Feedback", "Returned for Adjustment",
              ["Comment Deficiency Details", "Unlock Draft for Editing", "Re-submission Required"],
              bg="#FFF1F2", border="#E11D48", text_color="#BE123C", title_size=7.5)

    draw_card(ax, 0.385, 0.24, 0.15, 0.12, "9. Statutory Approval", "Mandate Issuance",
              ["Stamp Digital Approval", "Freeze Activity Baseline", "Issue Warrants & Mandates", "Unlock Workshop Scheduling"],
              bg="#F5F3FF", border="#8B5CF6", text_color="#5B21B6", title_size=8.5)

    draw_arrow(ax, 0.35, 0.40, 0.385, 0.80, label="Submit Plan Dossier", color="#6D28D9", lw=1.4)
    draw_arrow(ax, 0.46, 0.73, 0.46, 0.625, lw=1.2)
    draw_arrow(ax, 0.395, 0.58, 0.385, 0.46, label="Return / Reject", color="#E11D48", lw=1.3, rad=0.2)
    draw_arrow(ax, 0.385, 0.46, 0.35, 0.58, label="Re-submit Plan", color="#E11D48", lw=1.2, rad=0.2)
    draw_arrow(ax, 0.46, 0.535, 0.46, 0.36, label="Approved", color="#059669", lw=1.4)

    # -------------------------------------------------------------------------
    # STAGE 4: Workshop Scheduling & Training Execution (Coordinators)
    # -------------------------------------------------------------------------
    draw_card(ax, 0.575, 0.74, 0.15, 0.14, "10. Workshop Scheduling", "WS-YYYY-XXXX Registry",
              ["Select Approved AIP Activity", "Define Date, Venue & Target Org", "Automated Venue Clash Check", "RFC 5545 iCalendar Sync"],
              bg="#FFFFFF", border="#059669", text_color="#047857", title_size=8.5)

    draw_card(ax, 0.575, 0.56, 0.15, 0.14, "11. Roster Management", "Trainees & Resource Persons",
              ["Register Trainees by NIC/School", "Assign Lead Resource Persons", "Verify Capacity vs Quota", "Generate Participant Badges"],
              bg="#FFFFFF", border="#10B981", text_color="#065F46", title_size=8.5)

    draw_card(ax, 0.575, 0.37, 0.15, 0.14, "12. In-Field Execution", "Ground Delivery",
              ["Conduct Training Sessions", "Digital Attendance Tracking", "(Registered / Attended / Absent)", "Log Real-Time Session Notes"],
              bg="#ECFDF5", border="#34D399", text_color="#064E3B", title_size=8.5)

    draw_card(ax, 0.575, 0.18, 0.15, 0.14, "13. Expenditure & Claims", "Self-Reported Returns",
              ["Post Commitment Vouchers", "Record Paid Disbursements", "Upload Photo Evidence Dossier", "Claim Physical % Milestone"],
              bg="#F0FDF4", border="#059669", text_color="#047857", title_size=8.5)

    draw_arrow(ax, 0.535, 0.30, 0.575, 0.81, label="Authorized Mandate", color="#059669", lw=1.4)
    draw_arrow(ax, 0.65, 0.74, 0.65, 0.70, lw=1.2)
    draw_arrow(ax, 0.65, 0.56, 0.65, 0.51, lw=1.2)
    draw_arrow(ax, 0.65, 0.37, 0.65, 0.32, lw=1.2)

    # -------------------------------------------------------------------------
    # STAGE 5: Independent Field Monitoring & Quality Assurance
    # -------------------------------------------------------------------------
    draw_card(ax, 0.765, 0.72, 0.12, 0.16, "14. On-Site Inspection", "Field M&E Officers",
              ["Unannounced Visits", "Verify Physical Attendance", "Inspect Training Materials", "Log Deficiency Severity", "(Critical/High/Med/Low)"],
              bg="#FFFFFF", border="#D97706", text_color="#B45309", title_size=8)

    draw_diamond(ax, 0.825, 0.53, 0.11, 0.09, "15. QA Gate", "Evidence Valid?",
                 bg="#FEF3C7", border="#D97706", text_color="#92400E")

    draw_card(ax, 0.765, 0.38, 0.12, 0.10, "Remedial Directive", "Corrective Action Order",
              ["Flag Non-Compliance", "Assign Remedial Task", "Statutory Deadline"],
              bg="#FFF7ED", border="#F97316", text_color="#C2410C", title_size=7.5)

    draw_card(ax, 0.765, 0.20, 0.12, 0.14, "16. QA Signoff", "QVI Scorecard Stamped",
              ["Verify Receipts & Proof", "Calculate QA Index (QVI)", "Stamp Official Signoff", "Release to Executive Telemetry"],
              bg="#FEF3C7", border="#F59E0B", text_color="#78350F", title_size=8)

    draw_arrow(ax, 0.725, 0.44, 0.765, 0.80, label="Field Audit Alert", color="#D97706", lw=1.3)
    draw_arrow(ax, 0.725, 0.25, 0.765, 0.53, label="Claimed Progress", color="#D97706", lw=1.3)
    draw_arrow(ax, 0.825, 0.72, 0.825, 0.575, lw=1.2)
    draw_arrow(ax, 0.825, 0.485, 0.825, 0.34, label="Verified Signoff", color="#059669", lw=1.3)
    draw_arrow(ax, 0.77, 0.53, 0.765, 0.43, label="Deficiency", color="#EA580C", lw=1.2, rad=0.2)

    # -------------------------------------------------------------------------
    # STAGE 6: Executive Telemetry & Global Governance (Leadership / Super Admin)
    # -------------------------------------------------------------------------
    draw_card(ax, 0.915, 0.65, 0.06, 0.23, "17. Executive 6-Tile Dashboard", "Dual-Window Live Display",
              ["Window 1: S-Curve & Heatmap", "Window 2: Gantt & Active Activity", "9-Province Traffic Light Scores", "Real-Time Broadcast Sync", "Budget Variance Calculation"],
              bg="#FFFFFF", border="#BE123C", text_color="#9F1239", title_size=7.5, item_size=6)

    draw_card(ax, 0.915, 0.30, 0.06, 0.25, "18. Super Admin", "Apex Governance",
              ["Fiscal Rollover Control", "Submission Deadlines", "System Broadcasts", "Immutable Audit Logs (D5)", "Full JSON Diff History"],
              bg="#FFF1F2", border="#E11D48", text_color="#881337", title_size=7.5, item_size=6)

    draw_arrow(ax, 0.885, 0.27, 0.915, 0.76, label="Verified Telemetry", color="#9F1239", lw=1.4)
    draw_arrow(ax, 0.945, 0.65, 0.945, 0.55, lw=1.2)

    # -------------------------------------------------------------------------
    # Bottom Summary Bar & Legend
    # -------------------------------------------------------------------------
    legend_box = FancyBboxPatch((0.02, 0.005), 0.96, 0.045, boxstyle="round,pad=0.001,rounding_size=0.006",
                                linewidth=1, edgecolor="#CBD5E1", facecolor="#FFFFFF", zorder=2)
    ax.add_patch(legend_box)
    
    legend_items = [
        ("Level 0: Super Admin", "#1E293B"),
        ("Level 1: MOE HQ Line Directorate", "#1D4ED8"),
        ("Special Branches: Dual Roles (EQD / Planning)", "#6D28D9"),
        ("Operational Units: Workshops & Trainees", "#047857"),
        ("Independent QA & Field Monitoring", "#B45309"),
        ("Real-Time Telemetry Rollup", "#9F1239")
    ]
    
    lx_pos = 0.035
    for text, col in legend_items:
        dot = patches.Circle((lx_pos, 0.027), 0.005, facecolor=col, edgecolor="none", zorder=3)
        ax.add_patch(dot)
        ax.text(lx_pos + 0.012, 0.027, text, ha="left", va="center", fontsize=7.2, fontweight="bold", color="#334155", zorder=3)
        lx_pos += 0.155

    plt.tight_layout()
    plt.savefig(OUT_PATH, dpi=300, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close()
    print(f"Generated user flow diagram successfully at: {OUT_PATH}")

if __name__ == "__main__":
    generate_user_flow()
