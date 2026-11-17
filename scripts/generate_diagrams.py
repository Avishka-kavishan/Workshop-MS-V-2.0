import os
import sys

# Ensure matplotlib writes config to temp to avoid permission warning
os.environ['MPLCONFIGDIR'] = os.path.join(os.environ.get('TEMP', 'C:\\Temp'), 'matplotlib_cfg')

import matplotlib.pyplot as plt
import matplotlib.patches as patches

def generate_diagrams(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    # -------------------------------------------------------------
    # DIAGRAM 1: System & Data Access Architecture (DAL Flow)
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(13, 8), dpi=300)
    ax.set_xlim(0, 13)
    ax.set_ylim(0, 8.5)
    ax.axis('off')
    
    # Background
    fig.patch.set_facecolor('#F8FAFC')
    ax.set_facecolor('#F8FAFC')
    
    # Title Box
    title_box = patches.FancyBboxPatch((0.5, 7.5), 12, 0.75, boxstyle="round,pad=0.1", 
                                      ec="#00534E", fc="#00534E", lw=1.5)
    ax.add_patch(title_box)
    ax.text(6.5, 7.85, "WORKSHOP MANAGEMENT SYSTEM (WMS) - SYSTEM & DATA ACCESS ARCHITECTURE", 
            ha='center', va='center', color='white', fontsize=12, fontweight='bold', fontfamily='sans-serif')
    
    # Layer 1: Client & API Layer
    layer1_bg = patches.FancyBboxPatch((0.5, 5.4), 12, 1.8, boxstyle="round,pad=0.1",
                                      ec="#94A3B8", fc="#FFFFFF", lw=1, ls='--')
    ax.add_patch(layer1_bg)
    ax.text(0.8, 6.9, "1. PRESENTATION & API LAYER (Next.js App Router)", 
            color="#0F172A", fontsize=10, fontweight='bold')
    
    # Boxes in Layer 1
    b_ui = patches.FancyBboxPatch((1.0, 5.6), 5.0, 1.0, boxstyle="round,pad=0.1", ec="#0284C7", fc="#E0F2FE", lw=1.5)
    ax.add_patch(b_ui)
    ax.text(3.5, 6.2, "Next.js React Client Shell", ha='center', va='center', fontsize=9.5, fontweight='bold', color="#0369A1")
    ax.text(3.5, 5.85, "AppShell, Workshop Forms, AIP Matrix, FRS Dashboards", ha='center', va='center', fontsize=8, color="#0C4A6E")
    
    b_api = patches.FancyBboxPatch((7.0, 5.6), 5.0, 1.0, boxstyle="round,pad=0.1", ec="#0284C7", fc="#E0F2FE", lw=1.5)
    ax.add_patch(b_api)
    ax.text(9.5, 6.2, "Next.js API Route Handlers", ha='center', va='center', fontsize=9.5, fontweight='bold', color="#0369A1")
    ax.text(9.5, 5.85, "/api/workshops, /api/aip, /api/auth, /api/frs, /api/db", ha='center', va='center', fontsize=8, color="#0C4A6E")
    
    # Layer 2: Data Access & Abstraction Layer (DAL)
    layer2_bg = patches.FancyBboxPatch((0.5, 2.7), 12, 2.4, boxstyle="round,pad=0.1",
                                      ec="#94A3B8", fc="#FFFFFF", lw=1, ls='--')
    ax.add_patch(layer2_bg)
    ax.text(0.8, 4.8, "2. DATA ACCESS & ADAPTATION LAYER (DAL)", 
            color="#0F172A", fontsize=10, fontweight='bold')
    
    b_dal = patches.FancyBboxPatch((1.0, 3.4), 11.0, 1.1, boxstyle="round,pad=0.1", ec="#D97706", fc="#FEF3C7", lw=1.5)
    ax.add_patch(b_dal)
    ax.text(6.5, 4.15, "Unified Data Access Gateway (src/lib/db.ts)", ha='center', va='center', fontsize=10, fontweight='bold', color="#B45309")
    ax.text(6.5, 3.75, "Auto-detects database configuration • In-Memory Cache • Transparent Failover • Query Routing", 
            ha='center', va='center', fontsize=8.5, color="#78350F")
    
    b_pg_adapter = patches.FancyBboxPatch((1.0, 2.9), 5.2, 0.45, boxstyle="round,pad=0.05", ec="#059669", fc="#D1FAE5", lw=1.2)
    ax.add_patch(b_pg_adapter)
    ax.text(3.6, 3.12, "src/lib/postgres.ts (Row Mappers & CRUD)", ha='center', va='center', fontsize=8, fontweight='bold', color="#065F46")
    
    b_pool = patches.FancyBboxPatch((6.8, 2.9), 5.2, 0.45, boxstyle="round,pad=0.05", ec="#059669", fc="#D1FAE5", lw=1.2)
    ax.add_patch(b_pool)
    ax.text(9.4, 3.12, "src/lib/pg.ts (pg.Pool Connection Pooling & SSL)", ha='center', va='center', fontsize=8, fontweight='bold', color="#065F46")
    
    # Layer 3: Physical Storage Engines
    layer3_bg = patches.FancyBboxPatch((0.5, 0.3), 12, 2.1, boxstyle="round,pad=0.1",
                                      ec="#94A3B8", fc="#FFFFFF", lw=1, ls='--')
    ax.add_patch(layer3_bg)
    ax.text(0.8, 2.1, "3. STORAGE ENGINES (Dual Hybrid Architecture)", 
            color="#0F172A", fontsize=10, fontweight='bold')
    
    b_pg_store = patches.FancyBboxPatch((1.0, 0.5), 5.2, 1.4, boxstyle="round,pad=0.1", ec="#4338CA", fc="#EEF2FF", lw=1.5)
    ax.add_patch(b_pg_store)
    ax.text(3.6, 1.55, "PRIMARY: PostgreSQL Engine", ha='center', va='center', fontsize=10, fontweight='bold', color="#3730A3")
    ax.text(3.6, 1.25, "Neon / Supabase / Self-Hosted / Local PostgreSQL", ha='center', va='center', fontsize=8, color="#312E81")
    ax.text(3.6, 0.95, "• 17 Relational Tables with Foreign Key Constraints\n• JSONB Support (Matrix targets & attendance)\n• B-Tree Performance Indexes", 
            ha='center', va='center', fontsize=7.5, color="#1E1B4B")
    
    b_json_store = patches.FancyBboxPatch((6.8, 0.5), 5.2, 1.4, boxstyle="round,pad=0.1", ec="#64748B", fc="#F1F5F9", lw=1.5)
    ax.add_patch(b_json_store)
    ax.text(9.4, 1.55, "FALLBACK: File / In-Memory JSON Store", ha='center', va='center', fontsize=10, fontweight='bold', color="#334155")
    ax.text(9.4, 1.25, "data/database.json  (or /tmp/database.json on Vercel)", ha='center', va='center', fontsize=8, color="#1E293B")
    ax.text(9.4, 0.95, "• Automatic zero-config offline fallback\n• Seed data auto-sync from initial json\n• Non-blocking memory cache sync", 
            ha='center', va='center', fontsize=7.5, color="#0F172A")
    
    # Connection Arrows
    # API -> DAL
    ax.annotate('', xy=(6.5, 4.5), xytext=(6.5, 5.6),
                arrowprops=dict(facecolor='#0284C7', edgecolor='#0284C7', width=2, headwidth=7, shrink=0.05))
    # DAL -> Primary
    ax.annotate('', xy=(3.6, 1.9), xytext=(3.6, 2.9),
                arrowprops=dict(facecolor='#059669', edgecolor='#059669', width=2, headwidth=7, shrink=0.05))
    # DAL -> Fallback
    ax.annotate('', xy=(9.4, 1.9), xytext=(9.4, 2.9),
                arrowprops=dict(facecolor='#64748B', edgecolor='#64748B', width=2, headwidth=7, shrink=0.05, linestyle='--'))
    
    plt.tight_layout()
    diagram1_path = os.path.join(output_dir, "wms_architecture_layer.png")
    plt.savefig(diagram1_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"Generated: {diagram1_path}")
    
    # -------------------------------------------------------------
    # DIAGRAM 2: Entity Relationship Diagram (ERD & Data Schema)
    # -------------------------------------------------------------
    fig2, ax2 = plt.subplots(figsize=(15, 10), dpi=300)
    ax2.set_xlim(0, 15)
    ax2.set_ylim(0, 10)
    ax2.axis('off')
    
    fig2.patch.set_facecolor('#F8FAFC')
    ax2.set_facecolor('#F8FAFC')
    
    # Title
    t_box2 = patches.FancyBboxPatch((0.5, 9.1), 14, 0.75, boxstyle="round,pad=0.1", ec="#0F4C81", fc="#0F4C81", lw=1.5)
    ax2.add_patch(t_box2)
    ax2.text(7.5, 9.47, "WORKSHOP MANAGEMENT SYSTEM (WMS) - CORE ENTITY RELATIONSHIP MODEL", 
             ha='center', va='center', color='white', fontsize=13, fontweight='bold', fontfamily='sans-serif')
    
    def draw_entity(x, y, w, h, title, fields, border_color="#0284C7", bg_color="#FFFFFF", title_color="#0369A1"):
        box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08", ec=border_color, fc=bg_color, lw=1.4)
        ax2.add_patch(box)
        # Title header
        t_bg = patches.FancyBboxPatch((x, y + h - 0.55), w, 0.55, boxstyle="round,pad=0.05", ec=border_color, fc=border_color, lw=1)
        ax2.add_patch(t_bg)
        ax2.text(x + w/2, y + h - 0.28, title, ha='center', va='center', fontsize=9, fontweight='bold', color='white')
        
        # Field rows
        line_y = y + h - 0.8
        for field in fields:
            ax2.text(x + 0.15, line_y, field, fontsize=7.2, color='#1E293B', fontfamily='monospace')
            line_y -= 0.27
            
    # Entities Layout
    # 1. Organization Types
    draw_entity(0.6, 6.7, 3.2, 2.1, "organization_types", [
        "PK id : VARCHAR(100)",
        "   name : VARCHAR(255)",
        "   level : INT (1-4)",
        "   description : TEXT",
        "   created_at : TIMESTAMPTZ"
    ], border_color="#0D9488")
    
    # 2. Organizations
    draw_entity(4.3, 6.2, 3.4, 2.6, "organizations", [
        "PK id : VARCHAR(100)",
        "   name : VARCHAR(255)",
        "   code : VARCHAR(100)",
        "FK type_id -> organization_types",
        "FK parent_id -> organizations",
        "   unit_type : location | branch",
        "   address, phone, email",
        "   is_active : BOOLEAN"
    ], border_color="#0D9488")
    
    # 3. User Roles
    draw_entity(8.2, 7.0, 3.1, 1.8, "user_roles", [
        "PK id : VARCHAR(100)",
        "   name : VARCHAR(255)",
        "   can_create_workshop",
        "   can_approve_workshop",
        "   can_manage_users"
    ], border_color="#4F46E5")
    
    # 4. Users
    draw_entity(11.6, 6.2, 2.9, 2.6, "users", [
        "PK id : VARCHAR(100)",
        "   username : UNIQUE",
        "   password_hash",
        "   full_name, email, phone",
        "   designation : VARCHAR",
        "FK organization_id",
        "FK role_id -> user_roles",
        "   is_active : BOOLEAN"
    ], border_color="#4F46E5")
    
    # 5. Workshops (Center Core)
    draw_entity(5.5, 2.2, 4.0, 3.3, "workshops (Core)", [
        "PK id : VARCHAR(100)",
        "   workshop_number, year",
        "   branch, subject, title",
        "   aim, expected_output",
        "   place_id, place_name",
        "   target_path : JSONB",
        "   start_date, end_date",
        "   venue, days_held",
        "   expected & actual trainees",
        "   status, confirmation_status",
        "   reschedule_count : INT"
    ], border_color="#DC2626", bg_color="#FFF5F5")
    
    # 6. Trainees
    draw_entity(0.6, 2.6, 3.4, 2.4, "trainees", [
        "PK id : VARCHAR(100)",
        "FK workshop_id -> workshops",
        "   nic_number : VARCHAR(50)",
        "   name, designation",
        "   school_institute, region",
        "   attendance_status",
        "   daily_attendance : JSONB"
    ], border_color="#E11D48")
    
    # 7. Resource Persons
    draw_entity(0.6, 0.4, 3.4, 2.0, "resource_persons", [
        "PK id : VARCHAR(100)",
        "FK workshop_id (optional)",
        "   nic, passportNumber",
        "   name, workplace",
        "   qualifications, phone",
        "   role_in_workshop"
    ], border_color="#E11D48")
    
    # 8. Workshop Reschedules
    draw_entity(10.5, 3.2, 3.9, 2.2, "workshop_reschedules", [
        "PK id : VARCHAR(100)",
        "FK workshop_id -> workshops",
        "   rescheduled_by_user_id",
        "   old_start_date, old_end_date",
        "   new_start_date, new_end_date",
        "   old_venue, new_venue",
        "   reason : TEXT"
    ], border_color="#B45309")
    
    # 9. Workshop Approvals & Audit
    draw_entity(10.5, 1.2, 3.9, 1.8, "workshop_approvals", [
        "PK id : VARCHAR(100)",
        "FK workshop_id -> workshops",
        "   reviewer_id, action",
        "   previous_status_id",
        "   new_status_id, comments"
    ], border_color="#B45309")
    
    # 10. AIP Plans
    draw_entity(4.5, 0.3, 2.6, 1.6, "aip_plans", [
        "PK id : VARCHAR(100)",
        "FK branch_id -> orgs",
        "   year, phase_title",
        "   status : Draft|Approved"
    ], border_color="#15803D")
    
    # 11. AIP Activities
    draw_entity(7.4, 0.3, 2.8, 1.6, "aip_activities", [
        "PK id : VARCHAR(100)",
        "FK plan_id -> aip_plans",
        "   activity_code, activity",
        "   vote_number, cost",
        "   monthly/quarterly JSONB"
    ], border_color="#15803D")
    
    # Draw Connective lines with arrows
    # org_types -> orgs
    ax2.annotate('', xy=(4.3, 7.5), xytext=(3.8, 7.5),
                 arrowprops=dict(facecolor='#0D9488', edgecolor='#0D9488', width=1.5, headwidth=5))
    # users -> orgs
    ax2.annotate('', xy=(7.7, 7.5), xytext=(11.6, 7.5),
                 arrowprops=dict(facecolor='#4F46E5', edgecolor='#4F46E5', width=1.5, headwidth=5))
    # users -> user_roles
    ax2.annotate('', xy=(11.3, 7.8), xytext=(11.6, 7.8),
                 arrowprops=dict(facecolor='#4F46E5', edgecolor='#4F46E5', width=1.5, headwidth=5))
    # orgs -> workshops
    ax2.annotate('', xy=(7.0, 5.5), xytext=(6.5, 6.2),
                 arrowprops=dict(facecolor='#0D9488', edgecolor='#0D9488', width=1.5, headwidth=5))
    # workshops -> trainees
    ax2.annotate('', xy=(4.0, 3.8), xytext=(5.5, 3.8),
                 arrowprops=dict(facecolor='#DC2626', edgecolor='#DC2626', width=1.5, headwidth=5))
    # workshops -> reschedules
    ax2.annotate('', xy=(10.5, 4.3), xytext=(9.5, 4.3),
                 arrowprops=dict(facecolor='#B45309', edgecolor='#B45309', width=1.5, headwidth=5))
    # workshops -> approvals
    ax2.annotate('', xy=(10.5, 2.2), xytext=(9.5, 2.5),
                 arrowprops=dict(facecolor='#B45309', edgecolor='#B45309', width=1.5, headwidth=5))
    # aip_plans -> aip_activities
    ax2.annotate('', xy=(7.4, 1.1), xytext=(7.1, 1.1),
                 arrowprops=dict(facecolor='#15803D', edgecolor='#15803D', width=1.5, headwidth=5))
    # aip_activities -> workshops
    ax2.annotate('', xy=(7.5, 2.2), xytext=(7.5, 1.9),
                 arrowprops=dict(facecolor='#15803D', edgecolor='#15803D', width=1.5, headwidth=5, linestyle=':'))
    
    plt.tight_layout()
    diagram2_path = os.path.join(output_dir, "wms_erd_diagram.png")
    plt.savefig(diagram2_path, dpi=300, facecolor=fig2.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"Generated: {diagram2_path}")
    
    return diagram1_path, diagram2_path

if __name__ == '__main__':
    img_dir = os.path.join(os.getcwd(), 'docs', 'assets')
    generate_diagrams(img_dir)
