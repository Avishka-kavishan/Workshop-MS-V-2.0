import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

# Sheet 1: User Credentials
ws1 = wb.active
ws1.title = 'User Credentials'
ws1.views.sheetView[0].showGridLines = True

# Palettes
maroon_dark = '6B112C'
maroon_primary = '8D153A'
gray_border = 'D1D5DB'
gray_zebra = 'F9FAFB'

font_title = Font(name='Segoe UI', size=14, bold=True, color='FFFFFF')
font_sec = Font(name='Segoe UI', size=11, bold=True, color='FFFFFF')
font_th = Font(name='Segoe UI', size=9.5, bold=True, color='FFFFFF')
font_td = Font(name='Segoe UI', size=9.5)
font_code = Font(name='Consolas', size=9.5, bold=True, color='8D153A')
font_pwd = Font(name='Consolas', size=9.5, bold=True, color='1F2937')

fill_title = PatternFill(start_color=maroon_dark, end_color=maroon_dark, fill_type='solid')
fill_sec_admin = PatternFill(start_color='1E293B', end_color='1E293B', fill_type='solid')
fill_sec_special = PatternFill(start_color=maroon_primary, end_color=maroon_primary, fill_type='solid')
fill_sec_normal = PatternFill(start_color='065F46', end_color='065F46', fill_type='solid')
fill_sec_ops = PatternFill(start_color='4C1D95', end_color='4C1D95', fill_type='solid')
fill_sec_field = PatternFill(start_color='B45309', end_color='B45309', fill_type='solid')
fill_th = PatternFill(start_color=maroon_dark, end_color=maroon_dark, fill_type='solid')
fill_zebra = PatternFill(start_color=gray_zebra, end_color=gray_zebra, fill_type='solid')

border_thin = Border(
    left=Side(style='thin', color=gray_border),
    right=Side(style='thin', color=gray_border),
    top=Side(style='thin', color=gray_border),
    bottom=Side(style='thin', color=gray_border)
)

# Title Rows
ws1.merge_cells('A1:J1')
ws1['A1'] = 'MINISTRY OF EDUCATION • SRI LANKA'
ws1['A1'].font = font_title
ws1['A1'].fill = fill_title
ws1['A1'].alignment = Alignment(horizontal='center', vertical='center')
ws1.row_dimensions[1].height = 28

ws1.merge_cells('A2:J2')
ws1['A2'] = 'Integrated Planning, Monitoring & Workshop Management System — User Credentials & Access Control Directory'
ws1['A2'].font = Font(name='Segoe UI', size=11, bold=True, color='FFFFFF')
ws1['A2'].fill = PatternFill(start_color=maroon_primary, end_color=maroon_primary, fill_type='solid')
ws1['A2'].alignment = Alignment(horizontal='center', vertical='center')
ws1.row_dimensions[2].height = 22

ws1.merge_cells('A3:J3')
ws1['A3'] = 'Security Notice: All seeded sample accounts use the default password "123". Special Branches (Planning, Monitoring, Data Management, Education Quality Development) feature Two Accounts: Normal (Standard Branch Operations) & Special (Supervisory Governance).'
ws1['A3'].font = Font(name='Segoe UI', size=9, italic=True, color='374151')
ws1['A3'].fill = PatternFill(start_color='FEF3C7', end_color='FEF3C7', fill_type='solid')
ws1['A3'].alignment = Alignment(horizontal='center', vertical='center')
ws1.row_dimensions[3].height = 20

# Table Headers
headers = [
    'S/N',
    'Administrative Scope / Category',
    'Username',
    'Password',
    'Full Name / Officer Description',
    'Official Email',
    'Assigned Role',
    'Institution / Organization',
    'Functional Category',
    'Delegated Authority & Permissions Scope'
]

for col_idx, h in enumerate(headers, 1):
    cell = ws1.cell(5, col_idx, h)
    cell.font = font_th
    cell.fill = fill_th
    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    cell.border = border_thin
ws1.row_dimensions[5].height = 28

# User Data Sections
sections = [
    {
        'title': '1. Master Super Administrator & Hierarchical Administrative Levels (Level 0 to Level 5)',
        'fill': fill_sec_admin,
        'users': [
            (1, 'Type 1: Super Admin (Level 0)', 'superadmin', '123', 'Ministry Chief Super Administrator', 'superadmin@moe.gov.lk', 'Super Administrator', 'Ministry of Education (Apex HQ)', 'Level 0 Apex', 'Full sovereign apex access across all 6 administrative levels, full admin console, user/admin creation with level chooser, approval overrides, audit trail'),
            (2, 'Type 2: Level 1 Admin (MoE National)', 'moe', '123', 'Ministry National Headquarters Administrator', 'moe@moe.gov.lk', 'Level 1 Administrator (MoE National)', 'Ministry of Education (National Level 1)', 'Admin Level 1', 'National line ministry administration, 88 branches management, national workshop coordination, macro ceilings, AIP approvals (alias: moe.admin)'),
            (3, 'Type 2: Level 2 Admin (Apex Body)', 'nie.admin', '123', 'National Apex Administrator (NIE / EPD / DoE)', 'nie.admin@nie.ac.lk', 'Level 2 Administrator (National Apex)', 'National Institute of Education (Level 2)', 'Admin Level 2', 'Institutional apex administration, curriculum workshops, teacher development, apex faculty governance (alias: nie)'),
            (4, 'Type 2: Level 3 Admin (Provincial)', 'ped.sp', '123', 'Southern Provincial Education Administrator', 'ped.sp@sp.edu.lk', 'Level 3 Administrator (Provincial)', 'Southern Province Education Department (Level 3)', 'Admin Level 3', 'Provincial administration, oversees Southern Province child zones, divisions, schools (horizontal isolation from other provinces, alias: provincial.admin)'),
            (5, 'Type 2: Level 4 Admin (Zonal)', 'zeo.galle', '123', 'Galle Zonal Education Administrator', 'zeo.galle@galle.zone.gov.lk', 'Level 4 Administrator (Zonal)', 'Galle Zonal Education Office (Level 4)', 'Admin Level 4', 'Zonal administration, oversees child Galle divisions and schools, manages zonal IT/resource centers (alias: zonal.admin)'),
            (6, 'Type 2: Level 5 Admin (Divisional)', 'deo.galle', '123', 'Galle Divisional Education Administrator', 'deo.galle@galle.div.gov.lk', 'Level 5 Administrator (Divisional)', 'Galle Divisional Education Office (Level 5)', 'Admin Level 5', 'Divisional administration, coordinates local school clusters and divisional field activities (alias: divisional.admin)')
        ]
    },
    {
        'title': '2. Type 3: Special Branches — Dual Roles (Subject-Specific Governance Role + Operational Role)',
        'fill': fill_sec_special,
        'users': [
            (7, 'Policy Planning Division (Lead)', 'planning.officer', '123', 'MOE Planning Division Officer (Special)', 'planning@moe.gov.lk', 'Planning Division Officer', 'MOE Planning & Statistics Division', 'Planning', 'Governance Role: 2-stage budget review, macro ceilings, vote allocation, Vision initiatives, AIP plan approval & dispatch (Dual Role with "planning")'),
            (8, 'Planning Branch (Operational)', 'planning', '123', 'MOE Planning Branch (Operational)', 'planning.branch@moe.gov.lk', 'MOE Officer / Planner', 'MOE Planning Branch', 'Normal', 'Operational Branch Role: Plans Planning Branch workshops, inputs branch budget proposals, submits branch AIP activities (Switch Role supported)'),
            (9, 'Quality Assurance & Monitoring (Lead)', 'monitoring.officer', '123', 'MOE Quality Assurance & Monitoring Officer (Special)', 'monitoring@moe.gov.lk', 'Monitoring & Verification Officer', 'MOE Monitoring & Performance Branch', 'Monitoring', 'Governance Role: Independent progress verifications, M&E portal oversight, field inspections, corrective actions (Dual Role with "monitoring")'),
            (10, 'Monitoring Branch (Operational)', 'monitoring', '123', 'MOE Monitoring Branch (Operational)', 'monitoring.branch@moe.gov.lk', 'MOE Officer / Planner', 'MOE Monitoring Branch', 'Normal', 'Operational Branch Role: Plans Monitoring Branch workshops, inputs branch budget proposals, submits monthly returns (Switch Role supported)'),
            (11, 'Data Management & System Admin (Lead)', 'admin', '123', 'MOE Data Management Administrator (Special)', 'data.management@moe.gov.lk', 'System Administrator', 'MOE Data Management Branch', 'Normal / Admin', 'Governance Role: User credential management, organization hierarchy configuration, system settings, admin console (Dual Role with "data")'),
            (12, 'Data Management Branch (Operational)', 'data', '123', 'MOE Data Management Branch (Operational)', 'data@moe.gov.lk', 'MOE Officer / Planner', 'MOE Data Management Branch', 'Normal', 'Operational Branch Role: Plans Data Branch workshops, inputs branch budget proposals, submits branch AIP activities (alias: data.management)'),
            (13, 'Education Quality Development (Lead)', 'eqd.officer', '123', 'Director (Education Quality Development)', 'eqd@moe.gov.lk', 'EQD Division Director', 'Education Quality Development Branch (EQD)', 'Quality Development', 'Governance Role: Division-wide workshop oversight across subject branches, resource person registration & faculty management (Dual Role with "eqd")'),
            (14, 'Education Quality Development (Operational)', 'eqd', '123', 'EQD Branch Officer', 'eqd.officer@moe.gov.lk', 'MOE Officer / Planner', 'Education Quality Development Branch (EQD)', 'Normal', 'Operational Branch Role: Plans EQD workshops, inputs branch budget proposals, submits branch AIP activities (Switch Role supported)')
        ]
    },
    {
        'title': '3. Type 4: Normal Branch Users (Strictly Restricted: Dashboard, Budget, AIP, Monitoring, Workshops, Resource Persons)',
        'fill': fill_sec_ops,
        'users': [
            (16, 'ICT Education Division', 'ict', '123', 'Information Technology & Digital Education', 'ict@moe.gov.lk', 'MOE Officer / Planner', 'Information Technology & Digital Education Division', 'Normal', 'Schedules national IT workshops, submits branch budget proposals, inputs AIP activities, dispatches trainees (alias: ict.officer)'),
            (17, 'Digital Infrastructure Unit', 'digital.infra', '123', 'Digital Education Infrastructure Development', 'digital.infra@moe.gov.lk', 'MOE Officer / Planner', 'Digital Education Infrastructure Development Unit', 'Normal', 'Plans smart classroom & school connectivity workshops, submits infrastructure budget proposals (alias: digital)'),
            (18, 'Education Reforms Division', 'reforms', '123', 'Education Reforms Division', 'reforms@moe.gov.lk', 'MOE Officer / Planner', 'Education Reforms Division', 'Normal', 'Curriculum transformation workshops, pilot teacher orientation, reform activity budget proposals (alias: reforms.officer)'),
            (19, 'Teacher Education (NCOE)', 'ncoe', '123', 'National College of Education Administration', 'ncoe@moe.gov.lk', 'MOE Officer / Planner', 'Teacher Education Administration Division (NCOE)', 'Normal', 'Pre-service teacher training, NCOE lecturer workshops, capacity development implementation (alias: ncoe.officer)'),
            (20, 'Piriven Education Division', 'piriven', '123', 'Piriven Education Division', 'piriven@moe.gov.lk', 'MOE Officer / Planner', 'Piriven Education Division', 'Normal', 'Monastic education workshops, teacher training in Piriven schools, spiritual and cultural studies (alias: piriven.officer)'),
            (21, 'Agriculture & Environment', 'agri', '123', 'Agriculture and Environmental Studies', 'agri@moe.gov.lk', 'MOE Officer / Planner', 'Agriculture and Environmental Studies Division', 'Normal', 'School greening programs, agricultural science teacher training, environmental education workshops (alias: agri.officer)'),
            (22, 'Mathematics Division', 'maths', '123', 'Mathematics Development Branch', 'maths@moe.gov.lk', 'MOE Officer / Planner', 'Education Quality Development - Mathematics Division', 'Normal', 'National mathematics Olympiad workshops, teacher mastery programs, curriculum support workshops (alias: maths.officer)'),
            (23, 'Health & Nutrition Division', 'health', '123', 'School Health and Nutrition Division', 'health@moe.gov.lk', 'MOE Officer / Planner', 'Co-curricular & Primary - Health & Nutrition Division', 'Normal', 'School meal program coordinators, first aid and sports health training workshops (alias: health.officer)'),
            (24, 'Curriculum Development Branch', 'curriculum', '123', 'MOE Curriculum Development Branch', 'curriculum@moe.gov.lk', 'MOE Officer / Planner', 'MOE Curriculum Development Branch', 'Normal', 'Textbook development workshops, competency curriculum revisions, teacher training toolkits (alias: curriculum.officer)')
        ]
    },
    {
        'title': '4. Provincial & Zonal Field Offices (Regional Implementing Units & Venues)',
        'fill': fill_sec_field,
        'users': [
            (25, 'Southern Province IT Branch', 'southern.it', '123', 'Southern Province IT Branch Coordinator', 'it@southern.prov.gov.lk', 'Place Coordinator / Officer', 'Southern Province IT Branch (Level 3)', 'Normal', 'Provincial host venue coordinator, registers trainees, verifies resource persons, daily attendance'),
            (26, 'Galle Zone IT Branch', 'galle.it', '123', 'Galle Zone IT Branch Coordinator', 'it@galle.zone.gov.lk', 'Place Coordinator / Officer', 'Galle Zone IT Branch (Level 4)', 'Normal', 'Zonal host venue coordinator, conducts assigned workshops, participant attendance marking'),
            (27, 'Galle Zone Planning Branch', 'galle.coordinator', '123', 'Galle Zone Planning Branch Officer', 'planning@galle.zone.gov.lk', 'Place Coordinator / Officer', 'Galle Zone Planning Branch (Level 4)', 'Planning', 'Zonal planning reviews, venue allocation, local resource scheduling and regional monitoring'),
            (28, 'Colombo Zone IT Branch', 'colombo.it', '123', 'Colombo Zone IT Branch Coordinator', 'it@colombo.zone.gov.lk', 'Place Coordinator / Officer', 'Colombo Zone IT Branch (Level 4)', 'Normal', 'Western Province zonal host venue coordinator, trainee enrollment, local attendance verification')
        ]
    },
    {
        'title': '5. National Apex Department — Department of Examinations (DoE) Planning & Operational Branches',
        'fill': PatternFill(start_color='0F766E', end_color='0F766E', fill_type='solid'),
        'users': [
            (29, 'DOE Planning Branch', 'doe.planning', '123', 'K.L. Jayawardena (Director Planning & Research)', 'doe.planning@doe.gov.lk', 'Planning Division Officer', 'Department of Examinations Planning & Research Branch', 'Planning', 'Reviews and sanctions Annual Implementation Plans (AIP) for all DoE operational branches, assigns DoE Treasury votes, dispatches approved plans'),
            (30, 'DOE Evaluation Branch', 'doe.officer', '123', 'S.M. Wickramasinghe (Assistant Commissioner)', 'doe.officer@doe.gov.lk', 'MOE Officer / Planner', 'DOE School Examinations & Assessment Evaluation Branch', 'Normal', 'Formulates GCE examination evaluation AIP, schedules chief examiner workshops, submits plan to DOE Planning Branch for review & approval'),
            (31, 'DOE Technology Branch', 'doe.tech', '123', 'N. Perera (Senior Systems Engineer)', 'doe.tech@doe.gov.lk', 'MOE Officer / Planner', 'DOE Technology & Examination Systems Branch', 'Normal', 'Plans computerized marking portal and scanner infrastructure, submits AIP to DOE Planning Branch')
        ]
    }
]

cur_row = 6
for sec in sections:
    ws1.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=10)
    c = ws1.cell(cur_row, 1, sec['title'])
    c.font = font_sec
    c.fill = sec['fill']
    c.alignment = Alignment(horizontal='left', vertical='center', indent=1)
    ws1.row_dimensions[cur_row].height = 24
    cur_row += 1
    
    for u in sec['users']:
        sn, scope, uname, pwd, fname, email, role, inst, cat, notes = u
        ws1.cell(cur_row, 1, sn).alignment = Alignment(horizontal='center', vertical='center')
        ws1.cell(cur_row, 2, scope).alignment = Alignment(horizontal='left', vertical='center')
        
        c_u = ws1.cell(cur_row, 3, uname)
        c_u.font = font_code
        c_u.alignment = Alignment(horizontal='center', vertical='center')
        
        c_p = ws1.cell(cur_row, 4, pwd)
        c_p.font = font_pwd
        c_p.alignment = Alignment(horizontal='center', vertical='center')
        
        ws1.cell(cur_row, 5, fname).alignment = Alignment(horizontal='left', vertical='center')
        ws1.cell(cur_row, 6, email).alignment = Alignment(horizontal='left', vertical='center')
        ws1.cell(cur_row, 7, role).alignment = Alignment(horizontal='left', vertical='center')
        ws1.cell(cur_row, 8, inst).alignment = Alignment(horizontal='left', vertical='center')
        
        c_cat = ws1.cell(cur_row, 9, cat)
        c_cat.alignment = Alignment(horizontal='center', vertical='center')
        if cat == 'Planning':
            c_cat.fill = PatternFill(start_color='EFF6FF', end_color='EFF6FF', fill_type='solid')
            c_cat.font = Font(name='Segoe UI', size=9.5, bold=True, color='1E40AF')
        elif cat == 'Monitoring':
            c_cat.fill = PatternFill(start_color='ECFDF5', end_color='ECFDF5', fill_type='solid')
            c_cat.font = Font(name='Segoe UI', size=9.5, bold=True, color='065F46')
        elif cat == 'Special Apex':
            c_cat.fill = PatternFill(start_color='FEF2F2', end_color='FEF2F2', fill_type='solid')
            c_cat.font = Font(name='Segoe UI', size=9.5, bold=True, color='991B1B')
            
        ws1.cell(cur_row, 10, notes).alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        
        for c_idx in range(1, 11):
            cell = ws1.cell(cur_row, c_idx)
            cell.border = border_thin
            if not cell.font or cell.font == font_td:
                cell.font = font_td
            if sn % 2 == 0 and c_idx not in [3, 4, 9]:
                cell.fill = fill_zebra
                
        ws1.row_dimensions[cur_row].height = 24
        cur_row += 1
        
    cur_row += 1 # Empty spacing row

# Auto-adjust column widths
col_widths = {1: 6, 2: 32, 3: 20, 4: 12, 5: 38, 6: 28, 7: 32, 8: 38, 9: 18, 10: 52}
for col_idx, width in col_widths.items():
    ws1.column_dimensions[get_column_letter(col_idx)].width = width

# Sheet 2: Hierarchy & Roles
ws2 = wb.create_sheet('Hierarchy & Roles')
ws2.views.sheetView[0].showGridLines = True

ws2.merge_cells('A1:F1')
ws2['A1'] = '6-LEVEL ADMINISTRATIVE HIERARCHY & TWO-ACCOUNT ROLE DELEGATION MATRIX'
ws2['A1'].font = font_title
ws2['A1'].fill = fill_title
ws2['A1'].alignment = Alignment(horizontal='center', vertical='center')
ws2.row_dimensions[1].height = 28

h2 = ['Tier / Level', 'Institutional Scope', 'Lead Administrator Account', 'Special vs. Normal Branch Accounts', 'Key Administrative Powers & Functional Rules', 'Child Units Controlled']
for i, val in enumerate(h2, 1):
    c = ws2.cell(3, i, val)
    c.font = font_th
    c.fill = fill_th
    c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    c.border = border_thin
ws2.row_dimensions[3].height = 28

h2_data = [
    ('Level 0', 'Master Apex Ministry of Education', 'superadmin', 'Type 1: Super Admin (Unrestricted)', 'Unrestricted administrative authority across all 704 institutions, master admin console, level creation with access level chooser, budget approvals, and audit overrides.', 'All 6 Levels (Level 1 National down to Level 6 Schools)'),
    ('Level 1', 'Ministry of Education (National HQ)', 'moe (moe.admin)', 'Type 2: Level 1 Admin & Dual Roles (Planning, Monitoring, Data, EQD)', 'Can manage all MoE national branches, national workshops, annual plan formulation, macro ceilings, and national quality audits.', 'Level 2 Apex institutions, Level 3 Provincial Departments, and all 88 Line Ministry Branches.'),
    ('Level 2', 'National Apex Bodies (NIE, EPD, DoE)', 'nie.admin (nie)', 'Type 2: Level 2 Admin (Apex Body)', 'Autonomous apex institutional control. Can manage curriculum departments, exam units, and apex faculty (no provincial cascade).', 'Apex branches, subject units, research panels, and designated apex training centers.'),
    ('Level 3', 'Provincial Education Departments (9 Provinces)', 'ped.sp (provincial.admin)', 'Type 2: Level 3 Admin (Provincial)', 'Provincial administration. Can manage provincial IT, planning, administration, and oversee zonal education offices in province (horizontal isolation).', 'Zonal Education Offices (Level 4), Provincial Divisions (Level 5), and Provincial Schools (Level 6).'),
    ('Level 4', 'Zonal Education Offices (100+ Zones)', 'zeo.galle (zonal.admin)', 'Type 2: Level 4 Admin (Zonal)', 'Zonal administration. Can manage zonal planning, resource centers (IT/CRC), and zonal workshops.', 'Divisional Education Offices (Level 5) and Zonal Schools (Level 6).'),
    ('Level 5', 'Divisional Education Offices (300+ Divisions)', 'deo.galle (divisional.admin)', 'Type 2: Level 5 Admin (Divisional)', 'Divisional administration. Coordinates local school clusters and divisional activity implementation.', 'Primary, Junior, and Secondary implementing Schools (Level 6).'),
    ('Level 6', 'Schools & Operational Branch Officers', 'Normal Users (e.g. ict, reforms)', 'Type 4: Normal Users (Strictly Restricted)', 'Restricted ONLY to: Dashboard, Budget Planning, Annual Plan (AIP), Monitoring & Verification, Schedule Workshop, and Register Person. Admin Console, Audit Logs, Hierarchy, and Reports are strictly blocked.', 'Branch and school operational activities.')
]

for r_idx, row in enumerate(h2_data, 4):
    for c_idx, val in enumerate(row, 1):
        c = ws2.cell(r_idx, c_idx, val)
        c.font = font_td
        c.border = border_thin
        c.alignment = Alignment(horizontal='left' if c_idx > 3 else 'center', vertical='center', wrap_text=True)
        if r_idx % 2 == 0:
            c.fill = fill_zebra
    ws2.row_dimensions[r_idx].height = 42

w2_widths = {1: 12, 2: 32, 3: 25, 4: 35, 5: 45, 6: 35}
for col_idx, width in w2_widths.items():
    ws2.column_dimensions[get_column_letter(col_idx)].width = width

# Sheet 3: Quick Guide & Notes
ws3 = wb.create_sheet('Quick Guide & Notes')
ws3.views.sheetView[0].showGridLines = True

ws3.merge_cells('A1:C1')
ws3['A1'] = 'SYSTEM LOGIN & TWO-ACCOUNT TESTING QUICK REFERENCE GUIDE'
ws3['A1'].font = font_title
ws3['A1'].fill = fill_title
ws3['A1'].alignment = Alignment(horizontal='center', vertical='center')
ws3.row_dimensions[1].height = 28

h3 = ['Topic / Functional Domain', 'Operational Instructions & Workflow Notes', 'Recommended Test Accounts']
for i, val in enumerate(h3, 1):
    c = ws3.cell(3, i, val)
    c.font = font_th
    c.fill = fill_th
    c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    c.border = border_thin
ws3.row_dimensions[3].height = 26

h3_data = [
    ('How to Log In', 'Navigate to http://localhost:3000/login, enter any username from the "User Credentials" sheet, enter password "123", and click "Log In to Portal". Clean login form with seamless redirect.', 'Any account (password: 123)'),
    ('Type 1: Super Admin', 'Log in as "superadmin" (password: 123). Full sovereign access across all 6 levels. Full access to Admin Console (/admin), System Audit Logs (/admin/audit-logs), and can create Level 1-5 Administrators using the "Create Level Admin / User" button.', 'superadmin'),
    ('Type 2: Level Administrators (Levels 1-5)', 'Level 1: moe (MoE National HQ)\nLevel 2: nie.admin (NIE Apex)\nLevel 3: ped.sp (Southern Province)\nLevel 4: zeo.galle (Galle Zone)\nLevel 5: deo.galle (Galle Division)\nEach level admin has full administrative access strictly scoped to their jurisdictional level.', 'moe, nie.admin, ped.sp, zeo.galle, deo.galle'),
    ('Type 3: Special Branches Dual Roles', 'Dual roles available with instant Switch Role:\n- Planning: planning.officer (Review/Approval) & planning (Branch ops)\n- Monitoring: monitoring.officer (Verification) & monitoring (Branch ops)\n- Data Management: admin (System Admin) & data (Branch ops)\n- EQD: eqd.officer (Quality framework) & eqd (Branch ops)', 'planning.officer, monitoring.officer, admin, eqd.officer'),
    ('Type 4: Normal Users (Strictly Restricted)', 'Normal branch accounts (e.g. ict, reforms, ncoe, piriven, agri, digital.infra, maths, health, curriculum) ONLY have access to 6 modules:\n1. Dashboard\n2. Budget Planning\n3. Annual Plan (AIP)\n4. Monitoring & Verification\n5. Schedule Workshop\n6. Register Person\nAdmin Console, Audit Logs, Hierarchy, and Reports are strictly hidden from nav and blocked with 403.', 'ict, reforms, ncoe, agri, maths, health'),
    ('Horizontal & Sibling Isolation', 'Provincial Admin (ped.sp) has full access to Southern Province and child Galle Zone, but is blocked from Western Province or Colombo. Zonal Admin (zeo.galle) cannot access sibling Matara Zone.', 'ped.sp, zeo.galle')
]

for r_idx, row in enumerate(h3_data, 4):
    for c_idx, val in enumerate(row, 1):
        c = ws3.cell(r_idx, c_idx, val)
        c.font = font_td
        c.border = border_thin
        c.alignment = Alignment(horizontal='left' if c_idx == 2 else 'center', vertical='center', wrap_text=True)
        if r_idx % 2 == 0:
            c.fill = fill_zebra
    ws3.row_dimensions[r_idx].height = 50

w3_widths = {1: 28, 2: 70, 3: 30}
for col_idx, width in w3_widths.items():
    ws3.column_dimensions[get_column_letter(col_idx)].width = width

# Save to artifact directory
path2 = 'C:/Users/User/.gemini/antigravity/brain/5143a486-4a4d-40b1-b2a7-b01988030de8/System_User_Credentials.xlsx'
wb.save(path2)
print(f'Successfully saved updated credentials artifact to: {path2}')

# Save to workspace
path1 = 'D:/Data/Tests/plan/Workshop-MS-TEST/System_User_Credentials.xlsx'
path1_updated = 'D:/Data/Tests/plan/Workshop-MS-TEST/System_User_Credentials_Updated.xlsx'
path1_v3 = 'D:/Data/Tests/plan/Workshop-MS-TEST/System_User_Credentials_EQD.xlsx'

try:
    wb.save(path1_v3)
    print(f'Successfully saved EQD credentials to: {path1_v3}')
except Exception as e:
    print(f'Could not write {path1_v3}: {e}')

try:
    wb.save(path1_updated)
    print(f'Successfully saved updated credentials copy to: {path1_updated}')
except Exception as e:
    print(f'Note: {path1_updated} is open in Excel.')

try:
    wb.save(path1)
    print(f'Successfully updated original file: {path1}')
except Exception as e:
    print(f'Note: {path1} is currently open in Microsoft Excel.')

