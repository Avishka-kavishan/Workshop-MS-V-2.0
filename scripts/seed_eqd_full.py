import json
import uuid
from datetime import datetime, timezone

def seed_eqd():
    with open('data/database.json', 'r', encoding='utf-8') as f:
        db = json.load(f)

    now_iso = datetime.now(timezone.utc).isoformat()
    pwd_hash = "$2b$10$./4O5YT/QD9uTYcc46P4ceeeEY7RSq165PIVDe9XgsKcuDE.Xxm/i" # 123

    # 1. Organization: org-moe-eqd
    eqd_org = next((o for o in db['organizations'] if o['id'] == 'org-moe-eqd'), None)
    if not eqd_org:
        eqd_org = {
            "id": "org-moe-eqd",
            "name": "Education Quality Development Branch",
            "code": "EQD",
            "typeId": "ot-moe",
            "parentId": "org-moe-div-eqd",
            "unitType": "branch",
            "functionalCategory": "Normal",
            "isActive": True,
            "createdAt": now_iso,
            "abbreviation": "EQD"
        }
        db['organizations'].append(eqd_org)
        print("Added organization: org-moe-eqd")
    else:
        eqd_org['name'] = "Education Quality Development Branch"
        eqd_org['code'] = "EQD"
        eqd_org['abbreviation'] = "EQD"
        eqd_org['parentId'] = "org-moe-div-eqd"
        print("Updated organization: org-moe-eqd")

    # 2. Users: eqd.officer (Special) and eqd (Normal)
    users = db['users']
    
    # eqd.officer (Special Division Oversight)
    eqd_officer = next((u for u in users if u['username'] == 'eqd.officer'), None)
    if not eqd_officer:
        eqd_officer = {
            "id": "user-eqd-officer",
            "username": "eqd.officer",
            "passwordHash": pwd_hash,
            "fullName": "Director (Education Quality Development)",
            "email": "eqd@moe.gov.lk",
            "designation": "Director of Education (EQD)",
            "organizationId": "org-moe-eqd",
            "roleId": "role-moe-officer",
            "functionalCategory": "QualityDevelopment",
            "isActive": True,
            "createdAt": now_iso
        }
        users.append(eqd_officer)
        print("Added user: eqd.officer (Special Login)")
    else:
        eqd_officer['passwordHash'] = pwd_hash
        eqd_officer['organizationId'] = "org-moe-eqd"
        eqd_officer['functionalCategory'] = "QualityDevelopment"
        print("Updated user: eqd.officer")

    # eqd (Normal Branch Operations)
    eqd_normal = next((u for u in users if u['username'] == 'eqd'), None)
    if not eqd_normal:
        eqd_normal = {
            "id": "user-eqd-normal",
            "username": "eqd",
            "passwordHash": pwd_hash,
            "fullName": "EQD Branch Officer",
            "email": "eqd.officer@moe.gov.lk",
            "designation": "Senior Education Officer (EQD)",
            "organizationId": "org-moe-eqd",
            "roleId": "role-moe-officer",
            "functionalCategory": "Normal",
            "isActive": True,
            "createdAt": now_iso
        }
        users.append(eqd_normal)
        print("Added user: eqd (Normal Login)")
    else:
        eqd_normal['passwordHash'] = pwd_hash
        eqd_normal['organizationId'] = "org-moe-eqd"
        eqd_normal['functionalCategory'] = "Normal"
        print("Updated user: eqd")

    # 3. Workplaces / Venues & Existing Resource Persons
    rps = db.get('resourcePersons', [])
    lead_rp = rps[0] if rps else None
    lead_rp_id = lead_rp['id'] if lead_rp else "rp-quality-director"

    # Add dedicated EQD resource person if not present
    eqd_rp = next((r for r in rps if r.get('name') == 'Prof. H.M. Wickramasinghe'), None)
    if not eqd_rp:
        max_serial = max([r.get('serialNumber', 0) for r in rps] or [0])
        eqd_rp = {
            "id": f"rp-{uuid.uuid4().hex[:8]}",
            "workshopId": "",
            "serialNumber": max_serial + 1,
            "nic": "196818204918",
            "name": "Prof. H.M. Wickramasinghe",
            "position": "Senior Quality Assurance Consultant",
            "service": "Sri Lanka Education Administrative Service (Special Grade)",
            "grade": "Grade I",
            "workplace": "Ministry of Education - Education Quality Development",
            "personalAddress": "No. 45/2, Stanmore Crescent, Colombo 07",
            "educationalQualifications": "Ph.D. in Educational Measurement & Evaluation (Univ. of London), M.Ed. (Colombo)",
            "subjectQualifications": "National Quality Assurance Standards, School Self-Evaluation (SSE), Formative Assessment Rubrics",
            "phone": "0771984250",
            "specialNotes": "Accredited National Trainer for School Quality Assurance and Institutional Evaluation",
            "organization": "Ministry of Education - Education Quality Development",
            "designation": "Senior Quality Assurance Consultant",
            "expertiseArea": "Total Quality Management (TQM), School Review Frameworks",
            "roleInWorkshop": "Lead Facilitator",
            "email": "wickramasinghe.eqd@moe.gov.lk",
            "remarks": "Accredited National Trainer for School Quality Assurance and Institutional Evaluation",
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
        rps.append(eqd_rp)
        print("Added National Resource Person: Prof. H.M. Wickramasinghe")

    # 4. EQD Workshops
    workshops = db.get('workshops', [])
    eqd_ws_titles = [w['title'] for w in workshops if w.get('organizingOrgId') == 'org-moe-eqd']

    sample_workshops = [
        {
            "id": str(uuid.uuid4()),
            "workshopNumber": "MOE/EQD/20260320/0001",
            "title": "National Education Quality Framework (NEQF) & Total Quality Management Rollout",
            "subject": "Education Quality Development",
            "branch": "Education Quality Development",
            "organizingOrgId": "org-moe-eqd",
            "targetLevel": "national",
            "targetOrgId": "org-moe-eqd",
            "targetPath": ["org-moe-eqd"],
            "placeId": "org-nie",
            "placeName": "National Institute of Education (NIE) Auditorium",
            "venue": "National Institute of Education (NIE) Auditorium",
            "startDate": "2026-03-20",
            "endDate": "2026-03-22",
            "daysHeld": 3,
            "status": "Completed",
            "statusId": "status-completed",
            "statusName": "Completed",
            "confirmationStatus": "Confirmed",
            "expectedTrainees": 75,
            "actualTrainees": 75,
            "aim": "Institutionalize standardized quality indicators and benchmarks across General Education schools.",
            "expectedOutput": "75 certified Quality Development master practitioners deployed to provinces.",
            "fundingSource": "Government of Sri Lanka Consolidated Fund (Treasury)",
            "objectCode": "1402",
            "voteNumber": "126-02-05-1402",
            "budgetBreakdown": {"venue": 95000, "meals": 180000, "transport": 75000, "materials": 60000, "rpFees": 50000, "contingencies": 40000, "total": 500000},
            "expenditureBreakdown": {"venue": 95000, "meals": 175000, "transport": 72000, "materials": 58000, "rpFees": 50000, "contingencies": 35000, "total": 485000},
            "actualPaid": 485000,
            "commitments": 0,
            "isSelfOrganized": False,
            "rescheduleCount": 0,
            "assignedResourcePersonId": eqd_rp['id'],
            "year": "2026",
            "createdBy": "user-eqd-officer",
            "creatorName": "Education Quality Development",
            "createdAt": "2026-02-10T08:30:00.000Z",
            "updatedAt": now_iso
        },
        {
            "id": str(uuid.uuid4()),
            "workshopNumber": "MOE/EQD/20260415/0002",
            "title": "School Self-Evaluation (SSE) Protocols & Quality Indicator Benchmarking Practicum",
            "subject": "Education Quality Development",
            "branch": "Education Quality Development",
            "organizingOrgId": "org-moe-eqd",
            "targetLevel": "national",
            "targetOrgId": "org-moe-eqd",
            "targetPath": ["org-moe-eqd"],
            "placeId": "org-zone-galle",
            "placeName": "Galle Zonal Education Office Auditorium",
            "venue": "Galle Zonal Education Office Auditorium",
            "startDate": "2026-04-15",
            "endDate": "2026-04-17",
            "daysHeld": 3,
            "status": "Completed",
            "statusId": "status-completed",
            "statusName": "Completed",
            "confirmationStatus": "Confirmed",
            "expectedTrainees": 60,
            "actualTrainees": 60,
            "aim": "Train provincial school inspectors and principals on multi-dimensional quality rubrics.",
            "expectedOutput": "Comprehensive school self-evaluation dossiers finalized for 60 lead pilot schools.",
            "fundingSource": "Government of Sri Lanka Consolidated Fund (Treasury)",
            "objectCode": "1402",
            "voteNumber": "126-02-05-1402",
            "budgetBreakdown": {"venue": 75000, "meals": 145000, "transport": 60000, "materials": 50000, "rpFees": 45000, "contingencies": 35000, "total": 410000},
            "expenditureBreakdown": {"venue": 75000, "meals": 140000, "transport": 58000, "materials": 48000, "rpFees": 45000, "contingencies": 32000, "total": 398000},
            "actualPaid": 398000,
            "commitments": 0,
            "isSelfOrganized": False,
            "rescheduleCount": 0,
            "assignedResourcePersonId": eqd_rp['id'],
            "year": "2026",
            "createdBy": "user-eqd-normal",
            "creatorName": "Education Quality Development",
            "createdAt": "2026-03-01T09:00:00.000Z",
            "updatedAt": now_iso
        },
        {
            "id": str(uuid.uuid4()),
            "workshopNumber": "MOE/EQD/20260710/0003",
            "title": "Classroom Formative Assessment & Pedagogical Quality Observation Standards",
            "subject": "Education Quality Development",
            "branch": "Education Quality Development",
            "organizingOrgId": "org-moe-eqd",
            "targetLevel": "national",
            "targetOrgId": "org-moe-eqd",
            "targetPath": ["org-moe-eqd"],
            "placeId": "org-prov-southern",
            "placeName": "Southern Provincial Education Department Conference Hall",
            "venue": "Southern Provincial Education Department Conference Hall",
            "startDate": "2026-07-10",
            "endDate": "2026-07-12",
            "daysHeld": 3,
            "status": "Ongoing",
            "statusId": "status-ongoing",
            "statusName": "Ongoing",
            "confirmationStatus": "Confirmed",
            "expectedTrainees": 50,
            "actualTrainees": 50,
            "aim": "Standardize lesson observation tools and formative feedback mechanisms for Sectional Heads.",
            "expectedOutput": "Standardized observation instruments field-validated across 30 junior secondary classes.",
            "fundingSource": "General Education Modernization Project (GEMP)",
            "objectCode": "2401",
            "voteNumber": "126-02-05-2401",
            "budgetBreakdown": {"venue": 60000, "meals": 120000, "transport": 50000, "materials": 40000, "rpFees": 35000, "contingencies": 25000, "total": 330000},
            "expenditureBreakdown": {"venue": 30000, "meals": 60000, "transport": 25000, "materials": 40000, "rpFees": 17500, "contingencies": 10000, "total": 182500},
            "actualPaid": 182500,
            "commitments": 147500,
            "isSelfOrganized": False,
            "rescheduleCount": 0,
            "assignedResourcePersonId": eqd_rp['id'],
            "year": "2026",
            "createdBy": "user-eqd-normal",
            "creatorName": "Education Quality Development",
            "createdAt": "2026-05-15T10:00:00.000Z",
            "updatedAt": now_iso
        },
        {
            "id": str(uuid.uuid4()),
            "workshopNumber": "MOE/EQD/20260918/0004",
            "title": "Provincial Quality Development Officers (PQDO) Strategic Supervision Practicum",
            "subject": "Education Quality Development",
            "branch": "Education Quality Development",
            "organizingOrgId": "org-moe-eqd",
            "targetLevel": "national",
            "targetOrgId": "org-moe-eqd",
            "targetPath": ["org-moe-eqd"],
            "placeId": "org-nie",
            "placeName": "NIE Main Auditorium - Maharagama",
            "venue": "NIE Main Auditorium - Maharagama",
            "startDate": "2026-09-18",
            "endDate": "2026-09-20",
            "daysHeld": 3,
            "status": "Scheduled",
            "statusId": "status-scheduled",
            "statusName": "Scheduled",
            "confirmationStatus": "Confirmed",
            "expectedTrainees": 80,
            "actualTrainees": 0,
            "aim": "Equip all 9 Provincial Quality Development Directors with digital quality telemetry tools.",
            "expectedOutput": "Operational national dashboard for monthly provincial quality submissions.",
            "fundingSource": "Government of Sri Lanka Consolidated Fund (Treasury)",
            "objectCode": "1402",
            "voteNumber": "126-02-05-1402",
            "budgetBreakdown": {"venue": 110000, "meals": 200000, "transport": 90000, "materials": 70000, "rpFees": 55000, "contingencies": 45000, "total": 570000},
            "expenditureBreakdown": {"venue": 0, "meals": 0, "transport": 0, "materials": 0, "rpFees": 0, "contingencies": 0, "total": 0},
            "actualPaid": 0,
            "commitments": 0,
            "isSelfOrganized": False,
            "rescheduleCount": 0,
            "assignedResourcePersonId": eqd_rp['id'],
            "year": "2026",
            "createdBy": "user-eqd-officer",
            "creatorName": "Education Quality Development",
            "createdAt": "2026-06-20T11:00:00.000Z",
            "updatedAt": now_iso
        },
        {
            "id": str(uuid.uuid4()),
            "workshopNumber": "MOE/EQD/20261125/0005",
            "title": "National School Quality Rating & External Reviewers Certification",
            "subject": "Education Quality Development",
            "branch": "Education Quality Development",
            "organizingOrgId": "org-moe-eqd",
            "targetLevel": "national",
            "targetOrgId": "org-moe-eqd",
            "targetPath": ["org-moe-eqd"],
            "placeId": "org-zone-colombo",
            "placeName": "Colombo Zonal IT Resource Center",
            "venue": "Colombo Zonal IT Resource Center",
            "startDate": "2026-11-25",
            "endDate": "2026-11-27",
            "daysHeld": 3,
            "status": "Scheduled",
            "statusId": "status-scheduled",
            "statusName": "Scheduled",
            "confirmationStatus": "Confirmed",
            "expectedTrainees": 65,
            "actualTrainees": 0,
            "aim": "Certify 65 independent external peer evaluators for annual school quality accreditation.",
            "expectedOutput": "Cadre of certified national peer reviewers ready for 2027 school cycles.",
            "fundingSource": "General Education Modernization Project (GEMP)",
            "objectCode": "2401",
            "voteNumber": "126-02-05-2401",
            "budgetBreakdown": {"venue": 85000, "meals": 160000, "transport": 70000, "materials": 55000, "rpFees": 45000, "contingencies": 35000, "total": 450000},
            "expenditureBreakdown": {"venue": 0, "meals": 0, "transport": 0, "materials": 0, "rpFees": 0, "contingencies": 0, "total": 0},
            "actualPaid": 0,
            "commitments": 0,
            "isSelfOrganized": False,
            "rescheduleCount": 0,
            "assignedResourcePersonId": eqd_rp['id'],
            "year": "2026",
            "createdBy": "user-eqd-normal",
            "creatorName": "Education Quality Development",
            "createdAt": "2026-08-01T14:00:00.000Z",
            "updatedAt": now_iso
        },
        {
            "id": str(uuid.uuid4()),
            "workshopNumber": "MOE/EQD/20270215/0006",
            "title": "Curriculum Delivery Quality Benchmarking & Remedial Learning Audits",
            "subject": "Education Quality Development",
            "branch": "Education Quality Development",
            "organizingOrgId": "org-moe-eqd",
            "targetLevel": "national",
            "targetOrgId": "org-moe-eqd",
            "targetPath": ["org-moe-eqd"],
            "placeId": "org-nie",
            "placeName": "NIE Main Auditorium - Maharagama",
            "venue": "NIE Main Auditorium - Maharagama",
            "startDate": "2027-02-15",
            "endDate": "2027-02-17",
            "daysHeld": 3,
            "status": "Scheduled",
            "statusId": "status-scheduled",
            "statusName": "Scheduled",
            "confirmationStatus": "Confirmed",
            "expectedTrainees": 90,
            "actualTrainees": 0,
            "aim": "Review national learner achievement disparities and formulate classroom quality intervention protocols.",
            "expectedOutput": "Actionable remedial learning and pedagogical enhancement plans for 9 provincial clusters.",
            "fundingSource": "Government of Sri Lanka Consolidated Fund (Treasury)",
            "objectCode": "1402",
            "voteNumber": "126-02-05-1402",
            "budgetBreakdown": {"venue": 120000, "meals": 225000, "transport": 95000, "materials": 75000, "rpFees": 60000, "contingencies": 45000, "total": 620000},
            "expenditureBreakdown": {"venue": 0, "meals": 0, "transport": 0, "materials": 0, "rpFees": 0, "contingencies": 0, "total": 0},
            "actualPaid": 0,
            "commitments": 0,
            "isSelfOrganized": False,
            "rescheduleCount": 0,
            "assignedResourcePersonId": eqd_rp['id'],
            "year": "2027",
            "createdBy": "user-eqd-officer",
            "creatorName": "Education Quality Development",
            "createdAt": "2026-10-15T09:00:00.000Z",
            "updatedAt": now_iso
        }
    ]

    added_ws_count = 0
    for sw in sample_workshops:
        if sw['title'] not in eqd_ws_titles:
            workshops.append(sw)
            added_ws_count += 1
    print(f"Added {added_ws_count} EQD workshops.")

    # 5. Budget Proposals for FY 2027
    bp_list = db.get('budgetProposalActivities', [])
    eqd_bp_titles = [bp.get('activityTitle') for bp in bp_list if bp.get('divisionId') == 'org-moe-eqd']

    sample_proposals = [
        {
            "id": f"prop-2027-{uuid.uuid4().hex[:8]}",
            "financialYear": "2027",
            "implementationYear": "2027",
            "institutionId": "org-moe",
            "institutionName": "Ministry of Education",
            "divisionId": "org-moe-eqd",
            "divisionName": "Education Quality Development Branch",
            "activityTitle": "National School Self-Evaluation (SSE) Toolkits & Digital Quality Rubrics Rollout",
            "category": "Workshops & Training",
            "categoryDetail": "School Inspection & Quality Audits",
            "expenditureNature": "Recurrent",
            "proposedExecutingAgencyType": "Self (Branch)",
            "executingAgencyName": "Education Quality Development Branch",
            "isExtensionOfPreviousAip": True,
            "linkedPreviousAipActivityCode": "EQD-2026-01",
            "linkedPreviousAipActivityTitle": "School Self-Evaluation Framework Rollout",
            "linkedOtherActivityTitle": "NEQF Pilot 2026",
            "description": "Production and nationwide dissemination of revised School Self-Evaluation (SSE) toolkits and training of 3,000 School Quality Committees.",
            "purpose": "Empower schools to undertake structured annual self-audits across teaching quality, student welfare, and resource optimization.",
            "justification": "Required under National Education Policy framework 2025-2030 to establish transparent, data-driven school accountability.",
            "expectedOutputs": "3,000 schools complete digital self-evaluations on IPMIS quality portal.",
            "keyDeliverables": "National SSE Guidelines (Sinhala & Tamil), Online Rubrics Module, 9 Provincial Verification Reports.",
            "implementationPeriod": "Q1-Q2",
            "targetBeneficiaries": "School Principals, Sectional Heads, School Development Societies",
            "beneficiaryCount": 6500,
            "estimatedCostMn": 8.50,
            "noBudgetRequired": False,
            "status": "Accepted",
            "submittedBy": "eqd",
            "isStrategicVisionAddition": False,
            "governmentPriorityTheme": "Education Quality Enhancement & Modernization",
            "updatedAt": now_iso,
            "submittedAt": "2026-11-01T10:00:00.000Z",
            "reviewedAt": "2026-11-08T15:00:00.000Z",
            "reviewedBy": "planning.officer",
            "reviewRemarks": "Accepted for inclusion into FY 2027 Annual Implementation Plan under Vote 126-02-05-1402."
        },
        {
            "id": f"prop-2027-{uuid.uuid4().hex[:8]}",
            "financialYear": "2027",
            "implementationYear": "2027",
            "institutionId": "org-moe",
            "institutionName": "Ministry of Education",
            "divisionId": "org-moe-eqd",
            "divisionName": "Education Quality Development Branch",
            "activityTitle": "Provincial Quality Development Officers (PQDO) Supervisory Cadre Capacity Practicum",
            "category": "Workshops & Training",
            "categoryDetail": "Provincial Cadre Professional Development",
            "expenditureNature": "Recurrent",
            "proposedExecutingAgencyType": "Self (Branch)",
            "executingAgencyName": "Education Quality Development Branch",
            "isExtensionOfPreviousAip": False,
            "linkedOtherActivityTitle": "Provincial Quality Enhancement",
            "description": "Intensive residential practicum for 180 Provincial and Zonal Quality Development Officers in advanced clinical supervision and lesson observation.",
            "purpose": "Standardize lesson observation scoring reliability across all 9 provinces to ensure zero inter-rater variance.",
            "justification": "Field audits identified inconsistency in provincial rating rubrics; standardization will restore national parity.",
            "expectedOutputs": "180 PQDOs certified in standardized clinical classroom observation.",
            "keyDeliverables": "Certified Evaluator Cadre, Clinical Observation Manual, Provincial Progress Dashboards.",
            "implementationPeriod": "Q2",
            "targetBeneficiaries": "Provincial & Zonal Quality Development Officers, In-Service Advisors",
            "beneficiaryCount": 180,
            "estimatedCostMn": 5.20,
            "noBudgetRequired": False,
            "status": "Accepted",
            "submittedBy": "eqd",
            "isStrategicVisionAddition": False,
            "governmentPriorityTheme": "Teacher Professional Development & Pedagogy",
            "updatedAt": now_iso,
            "submittedAt": "2026-11-02T11:30:00.000Z",
            "reviewedAt": "2026-11-09T14:20:00.000Z",
            "reviewedBy": "planning.officer",
            "reviewRemarks": "Accepted. Funding allocated under Object Code 2401 (Foreign/Treasury joint financing)."
        },
        {
            "id": f"prop-2027-{uuid.uuid4().hex[:8]}",
            "financialYear": "2027",
            "implementationYear": "2027",
            "institutionId": "org-moe",
            "institutionName": "Ministry of Education",
            "divisionId": "org-moe-eqd",
            "divisionName": "Education Quality Development Branch",
            "activityTitle": "National Classroom Pedagogical Observation Protocol Training for 1,200 Principals",
            "category": "Workshops & Training",
            "categoryDetail": "School Leadership for Quality",
            "expenditureNature": "Recurrent",
            "proposedExecutingAgencyType": "Level 4 – Zonal Education Office",
            "executingAgencyName": "9 Provincial Departments & 100 Zonal Offices",
            "isExtensionOfPreviousAip": False,
            "linkedOtherActivityTitle": "School Leadership Quality",
            "description": "Cascaded training across 100 Zonal Resource Centers training 1,200 secondary school principals on instructional leadership.",
            "purpose": "Transform principals from administrative managers to instructional quality leaders.",
            "justification": "Direct recommendation of the National Education Commission 2025 reforms report.",
            "expectedOutputs": "1,200 principals actively conducting weekly formative lesson debriefs.",
            "keyDeliverables": "Instructional Leadership Toolkit, Formative Feedback Logbooks.",
            "implementationPeriod": "Q1-Q3",
            "targetBeneficiaries": "Secondary School Principals and Deputy Principals (Academics)",
            "beneficiaryCount": 1200,
            "estimatedCostMn": 12.00,
            "noBudgetRequired": False,
            "status": "Submitted",
            "submittedBy": "eqd",
            "isStrategicVisionAddition": False,
            "governmentPriorityTheme": "Education Quality Enhancement & Modernization",
            "updatedAt": now_iso,
            "submittedAt": "2026-11-12T14:00:00.000Z"
        },
        {
            "id": f"prop-2027-{uuid.uuid4().hex[:8]}",
            "financialYear": "2027",
            "implementationYear": "2027",
            "institutionId": "org-moe",
            "institutionName": "Ministry of Education",
            "divisionId": "org-moe-eqd",
            "divisionName": "Education Quality Development Branch",
            "activityTitle": "Primary & Junior Secondary Quality Benchmark Standardization Panels",
            "category": "Other",
            "categoryDetail": "Expert Panel Deliberations & Standards Setting",
            "expenditureNature": "Recurrent",
            "proposedExecutingAgencyType": "Self (Branch)",
            "executingAgencyName": "Education Quality Development Branch",
            "isExtensionOfPreviousAip": False,
            "linkedOtherActivityTitle": "National Quality Standards",
            "description": "Convening 6 subject expert panels to refine minimum learning competency benchmarks for Grades 3, 5, and 8.",
            "purpose": "Establish objective national thresholds for foundational literacy and numeracy quality.",
            "justification": "Ensures curriculum delivery standards keep pace with revised competency-based learning syllabi.",
            "expectedOutputs": "Validated national quality benchmark indicators for primary and junior secondary grades.",
            "keyDeliverables": "National Benchmark Compendium (Grades 1-9), Competency Assessment Matrix.",
            "implementationPeriod": "Q2-Q3",
            "targetBeneficiaries": "Curriculum Developers, Subject Directors, Evaluators",
            "beneficiaryCount": 90,
            "estimatedCostMn": 3.80,
            "noBudgetRequired": False,
            "status": "Submitted",
            "submittedBy": "eqd",
            "isStrategicVisionAddition": False,
            "governmentPriorityTheme": "Curriculum, Assessment & Learning Outcomes",
            "updatedAt": now_iso,
            "submittedAt": "2026-11-13T09:15:00.000Z"
        },
        {
            "id": f"prop-2027-{uuid.uuid4().hex[:8]}",
            "financialYear": "2027",
            "implementationYear": "2027",
            "institutionId": "org-moe",
            "institutionName": "Ministry of Education",
            "divisionId": "org-moe-eqd",
            "divisionName": "Education Quality Development Branch",
            "activityTitle": "Provincial Education Quality Advisory & Inspection Digital Dashboard Upgrade",
            "category": "Capital / Infrastructure",
            "categoryDetail": "Digital Telemetry Software Modernization",
            "expenditureNature": "Capital",
            "proposedExecutingAgencyType": "Self (Branch)",
            "executingAgencyName": "Education Quality Development Branch & MOE ICT Branch",
            "isExtensionOfPreviousAip": False,
            "linkedOtherActivityTitle": "Quality MIS Telemetry",
            "description": "Integration of real-time mobile school inspection data feeds with the IPMIS central data warehouse.",
            "purpose": "Provide executive leadership with live heatmaps of school quality indicators and critical remedial alerts.",
            "justification": "Eliminate delayed paper inspection returns by modernizing to mobile telemetry.",
            "expectedOutputs": "Real-time automated school quality index generated for all 10,155 schools.",
            "keyDeliverables": "IPMIS Quality Module Extension, Mobile Inspector Applet, API Gateway.",
            "implementationPeriod": "Q3-Q4",
            "targetBeneficiaries": "Ministry Directors, Provincial Directors, Quality Inspectors",
            "beneficiaryCount": 350,
            "estimatedCostMn": 2.50,
            "noBudgetRequired": False,
            "status": "Draft",
            "submittedBy": "eqd",
            "isStrategicVisionAddition": False,
            "governmentPriorityTheme": "Digital Transformation & Data Systems",
            "updatedAt": now_iso
        }
    ]

    added_bp_count = 0
    for s_prop in sample_proposals:
        if s_prop['activityTitle'] not in eqd_bp_titles:
            bp_list.append(s_prop)
            added_bp_count += 1
    print(f"Added {added_bp_count} EQD budget proposals.")

    # 6. AIP Activities for 2027
    aip_activities = db.get('aipActivities', [])
    eqd_aip_titles = [a.get('activity') for a in aip_activities if a.get('branchId') == 'org-moe-eqd']

    sample_aip = [
        {
            "id": f"act-eqd-{uuid.uuid4().hex[:8]}",
            "planId": "plan-org-moe-eqd-2027",
            "branchId": "org-moe-eqd",
            "branchName": "Education Quality Development",
            "year": "2027",
            "outputNo": "1",
            "activityCode": "EQD-01",
            "activity": "National Education Quality Assurance Framework (NEQF) Systemwide Implementation",
            "responsibleOfficer": "Director of Education (EQD)",
            "voteNumber": "126-02-05-1402",
            "estimatedCost": 8.50,
            "targetQ1": "25%",
            "targetQ2": "50%",
            "targetQ3": "75%",
            "targetQ4": "100%",
            "financialQ1": 2.125,
            "financialQ2": 2.125,
            "financialQ3": 2.125,
            "financialQ4": 2.125,
            "physicalMonths": ["8", "8", "9", "8", "8", "9", "8", "8", "9", "8", "8", "9"],
            "financialMonths": [0.708, 0.708, 0.709, 0.708, 0.708, 0.709, 0.708, 0.708, 0.709, 0.708, 0.708, 0.709],
            "physicalProgress": "0%",
            "physicalProgressPct": "0%",
            "financialProgress": 0,
            "financialProgressPct": "0%",
            "remarks": "Formally accepted into FY 2027 Annual Implementation Plan.",
            "createdBy": "user-eqd-officer",
            "creatorName": "Education Quality Development",
            "createdAt": "2026-11-09T14:30:00.000Z",
            "updatedAt": now_iso
        },
        {
            "id": f"act-eqd-{uuid.uuid4().hex[:8]}",
            "planId": "plan-org-moe-eqd-2027",
            "branchId": "org-moe-eqd",
            "branchName": "Education Quality Development",
            "year": "2027",
            "outputNo": "2",
            "activityCode": "EQD-02",
            "activity": "School Self-Evaluation (SSE) & Quality Rating Deployment across 1,000 Secondary Schools",
            "responsibleOfficer": "Senior Education Officer (EQD)",
            "voteNumber": "126-02-05-2401",
            "estimatedCost": 5.20,
            "targetQ1": "20%",
            "targetQ2": "50%",
            "targetQ3": "80%",
            "targetQ4": "100%",
            "financialQ1": 1.04,
            "financialQ2": 1.56,
            "financialQ3": 1.56,
            "financialQ4": 1.04,
            "physicalMonths": ["7", "7", "6", "10", "10", "10", "10", "10", "10", "7", "7", "6"],
            "financialMonths": [0.347, 0.347, 0.346, 0.520, 0.520, 0.520, 0.520, 0.520, 0.520, 0.347, 0.347, 0.346],
            "physicalProgress": "0%",
            "physicalProgressPct": "0%",
            "financialProgress": 0,
            "financialProgressPct": "0%",
            "remarks": "Approved by Policy & Planning Division for FY 2027 national execution.",
            "createdBy": "user-eqd-normal",
            "creatorName": "Education Quality Development",
            "createdAt": "2026-11-10T09:00:00.000Z",
            "updatedAt": now_iso
        }
    ]

    added_aip_count = 0
    for sa in sample_aip:
        if sa['activity'] not in eqd_aip_titles:
            aip_activities.append(sa)
            added_aip_count += 1
    print(f"Added {added_aip_count} EQD AIP activities.")

    with open('data/database.json', 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)

    print("Successfully committed EQD organization, users, workshops, budget proposals, and AIP activities to database.json.")

if __name__ == '__main__':
    seed_eqd()
