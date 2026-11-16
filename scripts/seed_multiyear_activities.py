import json
import os
import uuid
from datetime import datetime, date, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'database.json')

def load_db():
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_db(data):
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Branch definitions
BRANCHES = [
    {
        'id': 'org-moe-planning',
        'name': 'MOE Planning Branch',
        'code': 'PLN',
        'sector': 'Policy, Planning & Admin',
        'officer': 'Dr. K.M. Senanayake (Director Planning)',
        'vote': '126-01-01-2104',
        'activities': [
            ('Medium-Term Education Sector Development Plan (MTESDP) Formulation', 'Formulation and statutory stakeholder review of the 2026-2030 national education strategic framework.', 'Workshop & Training', 18.5, 'Q1'),
            ('National School Census, Demographics & Resource Disparity Modeling', 'GIS demographic mapping and resource allocation equity formulation across all 9 provinces.', 'Monitoring & Evaluation', 24.0, 'Q2'),
            ('Provincial Planning & AIP Capacity Building Governance Workshops', 'Multi-tier training for Provincial and Zonal planning directors on AIP compliance and FRS standards.', 'Workshop & Training', 14.2, 'Q3'),
            ('Public-Private Partnership (PPP) School Facilities Feasibility Review', 'Framework guidelines and feasibility modeling for smart classroom corporate sponsorships.', 'Other', 6.5, 'Q4'),
        ]
    },
    {
        'id': 'org-moe-ict',
        'name': 'MOE ICT Branch',
        'code': 'ICT',
        'sector': 'Digital Education',
        'officer': 'P.W. Ranasinghe (Assistant Director IT)',
        'vote': '126-02-03-2502',
        'activities': [
            ('High-Speed Fiber Backbone & Campus Wi-Fi Expansion in 1AB Schools', 'Expanding gigabit school network connectivity and managed Wi-Fi for 250 secondary collegiate schools.', 'Infrastructure & ICT', 85.0, 'Q1'),
            ('National Education Cloud LMS (e-Thaksalawa) Enterprise Microservices Upgrade', 'Migrating learning management platform to multi-region cloud containers with mobile offline sync.', 'Infrastructure & ICT', 42.0, 'Q2'),
            ('STEM Robotics, IoT & AI Maker-Space Labs Deployment (Phase II)', 'Supplying modular micro-controller kits, 3D printers, and coding hardware to selected provincial schools.', 'Infrastructure & ICT', 65.5, 'Q3'),
            ('Teacher Digital Pedagogy & Interactive Flat Panel (IFP) Hands-on Certification', 'Residential 3-day practical training for 3,500 secondary science and maths educators.', 'Workshop & Training', 28.0, 'Q4'),
        ]
    },
    {
        'id': 'org-moe-curriculum',
        'name': 'MOE Curriculum Development Branch',
        'code': 'CUR',
        'sector': 'Education & Pedagogy',
        'officer': 'Dr. S. Jayakody (Chief Curriculum Specialist)',
        'vote': '126-02-02-1402',
        'activities': [
            ('Modular Competency-Based Secondary Curriculum & Formative Assessment Revision', 'Restructuring GCE O/L syllabi into modular competency units with integrated continuous assessments.', 'Curriculum Development', 34.0, 'Q1'),
            ('Bilingual Education Textbooks, Interactive e-Books & Digital Open Assets', 'Authoring and digitizing tri-lingual resource packs for science, mathematics, and commerce.', 'Curriculum Development', 28.5, 'Q2'),
            ('Primary Grade 1-5 Foundational Literacy & Numeracy (FLN) Activity Toolkits', 'Designing manipulative mathematical kits and phonics-based storybooks for primary classrooms.', 'Student Programme', 22.0, 'Q3'),
            ('Climate Change, Environmental Sustainability & Green Schools Syllabus Modules', 'Integrating practical environmental conservation and renewable energy awareness into curricula.', 'Curriculum Development', 12.0, 'Q4'),
        ]
    },
    {
        'id': 'org-moe-quality',
        'name': 'MOE Quality Assurance Branch',
        'code': 'QAA',
        'sector': 'Quality Assurance',
        'officer': 'N. Fernando (Senior QA Auditor)',
        'vote': '126-01-02-1501',
        'activities': [
            ('National School Quality Index (SQI) Comprehensive Field Audit in 500 Schools', 'External institutional performance audit evaluating leadership, learning outcomes, and student welfare.', 'Monitoring & Evaluation', 26.0, 'Q1'),
            ('Assessor Accreditation for Whole-School Internal Evaluation (WSIE)', 'Intensive 5-day certification for 450 zonal in-service inspectors and master teachers.', 'Workshop & Training', 16.5, 'Q2'),
            ('Laboratory Safety, Hazardous Chemical Handling & Equipment Certification', 'Provincial audit inspecting secondary school chemical stores and fume hoods for OHS compliance.', 'Monitoring & Evaluation', 14.0, 'Q3'),
            ('National Learning Assessment (NLA) Benchmark Reporting for Grade 4 and 8', 'Standardized psychometric testing to quantify national literacy and numeracy learning gaps.', 'Monitoring & Evaluation', 32.0, 'Q4'),
        ]
    },
    {
        'id': 'org-moe-data',
        'name': 'MOE Data Management Branch',
        'code': 'DAT',
        'sector': 'EMIS & Statistics',
        'officer': 'M.D. Silva (Chief Statistician)',
        'vote': '126-01-01-1403',
        'activities': [
            ('Integrated Education Management Information System (EMIS 2.0) National Rollout', 'Real-time student attendance, teacher cadre distribution, and school asset tracking ledger.', 'Infrastructure & ICT', 48.0, 'Q1'),
            ('GIS Spatial Mapping & School Infrastructure Disparity Analytics Portal', 'Satellite overlay mapping of school accessibility, natural hazard exposure, and transit routes.', 'Monitoring & Evaluation', 19.5, 'Q2'),
            ('Automated Examination Registration & Identity Verification Data Integration', 'Interconnecting DoE examination databases with the central Ministry student register.', 'Infrastructure & ICT', 22.0, 'Q3'),
            ('Annual National School Statistics Bulletin & Open Data Governance Portal', 'Publishing the official national education statistical handbook and public visualization portal.', 'Other', 8.5, 'Q4'),
        ]
    },
    {
        'id': 'org-moe-hr',
        'name': 'MOE Human Resources Branch',
        'code': 'HRD',
        'sector': 'Teacher Cadre & HR',
        'officer': 'A.K. Wickramasinghe (Director HR)',
        'vote': '126-01-01-1001',
        'activities': [
            ('National Teacher Cadre Rebalancing & Algorithmic Transfer Governance Portal', 'Automating transparent national teacher transfers based on subject deficit and service points.', 'Workshop & Training', 15.0, 'Q1'),
            ('National Principal Leadership Academy (NPLA) Executive Masterclasses', 'Leadership, emotional intelligence, and financial administration for 600 newly appointed principals.', 'Workshop & Training', 25.0, 'Q2'),
            ('School Health, Psychosocial Counseling & Pastoral Care Teacher Certification', 'Certifying 1,200 guidance counselors in psychological first aid and child protection protocols.', 'Workshop & Training', 19.0, 'Q3'),
            ('Non-Academic & Administrative Cadre Office Automation Training', 'Workshops on electronic document management (e-DMS) for school clerks and administrative assistants.', 'Workshop & Training', 11.5, 'Q4'),
        ]
    },
    {
        'id': 'org-moe-finance',
        'name': 'MOE Finance Branch',
        'code': 'FIN',
        'sector': 'Financial Governance',
        'officer': 'C.L. Abeyratne (Chief Accountant)',
        'vote': '126-01-01-2101',
        'activities': [
            ('Public Financial Management (PFM), Procurement Guidelines & Audit Compliance', 'Rigorous governance seminars on Government Procurement Guidelines (NPA) and FR compliance.', 'Workshop & Training', 16.0, 'Q1'),
            ('Electronic Treasury Fund Transfer (EFT) Deployment to Provincial Education Offices', 'Connecting 9 provincial finance divisions directly to the national integrated treasury payment system.', 'Infrastructure & ICT', 24.5, 'Q2'),
            ('Capital Works & Construction Contract Management Risk Workshop', 'Training technical officers and quantity surveyors on FIDIC contract dispute resolution.', 'Workshop & Training', 14.0, 'Q3'),
            ('Annual Appropriation Accounts Reconciliation & Treasury Fiscal Review', 'Year-end financial audits and preparation of national ministry performance reports.', 'Monitoring & Evaluation', 10.0, 'Q4'),
        ]
    },
    {
        'id': 'org-nie-training',
        'name': 'NIE Training Branch',
        'code': 'NIE',
        'sector': 'Teacher Education',
        'officer': 'Prof. G. Kulatunga (Head of In-Service Training)',
        'vote': '126-02-04-2501',
        'activities': [
            ('Postgraduate Diploma in Education (PGDE) Hybrid In-Service Teacher Induction', 'Blended weekend lectures and classroom practicum for 2,400 untrained graduate educators.', 'Workshop & Training', 58.0, 'Q1'),
            ('STEM Master Teacher Facilitator Residential Bootcamps', 'Intensive 5-day practical training on experimental physics, organic chemistry, and robotics pedagogy.', 'Workshop & Training', 32.0, 'Q2'),
            ('Inclusive Education & Universal Design for Learning (UDL) Masterclass', 'Equipping mainstream school teachers to accommodate children with diverse physical and cognitive needs.', 'Workshop & Training', 21.0, 'Q3'),
            ('Action Research in Classroom Pedagogy & National Educational Symposium', 'Competitive research presentations and publishing classroom innovation papers in NIE journals.', 'Workshop & Training', 14.5, 'Q4'),
        ]
    },
    # Provincial Branches
    {
        'id': 'org-prov-western-ed',
        'name': 'Western Province Education Branch',
        'code': 'WP',
        'sector': 'Provincial Execution',
        'officer': 'R.M. Perera (Provincial Director)',
        'vote': '126-03-01-2502',
        'activities': [
            ('Western Province Smart Digital Classrooms & AI Lab Integration', 'Equipping 85 urban collegiate schools with interactive flat panels and gigabit connectivity.', 'Infrastructure & ICT', 48.0, 'Q1'),
            ('Colombo & Gampaha Zonal In-Service Science Teachers Practicum', 'Laboratory safety and micro-scale chemistry training for 600 secondary science teachers.', 'Workshop & Training', 18.0, 'Q2'),
            ('Provincial School Sports, Athletic Meet & Physical Education Clinics', 'Upgrading track facilities and training athletic coaches across 4 education zones.', 'Student Programme', 22.5, 'Q3'),
        ]
    },
    {
        'id': 'org-prov-central-ed',
        'name': 'Central Province Education Branch',
        'code': 'CP',
        'sector': 'Provincial Execution',
        'officer': 'T.B. Herath (Provincial Director)',
        'vote': '126-03-02-2502',
        'activities': [
            ('Plantation & Estate Sector School Infrastructure & Sanitation Modernization', 'Constructing clean drinking water supply networks and hygienic toilets in 65 hillside schools.', 'Infrastructure & ICT', 54.0, 'Q1'),
            ('Kandy & Matale Zonal English Immersion & Spoken Language Camps', '3-day residential English immersion camps for rural Grade 9 and 10 students.', 'Student Programme', 16.5, 'Q2'),
            ('Central Province Heritage, Culture & Aesthetic Education Festivals', 'Traditional music, dance, and art workshops for talented secondary school ensembles.', 'Student Programme', 14.0, 'Q3'),
        ]
    },
    {
        'id': 'org-prov-southern-ed',
        'name': 'Southern Province Education Branch',
        'code': 'SP',
        'sector': 'Provincial Execution',
        'officer': 'K.G. Jinadasa (Provincial Director)',
        'vote': '126-03-03-2502',
        'activities': [
            ('Southern Coastal Schools Marine Biology & Environmental Innovation Labs', 'Establishing coastal science learning centers in Galle, Matara, and Hambantota.', 'Infrastructure & ICT', 38.0, 'Q1'),
            ('Southern Provincial Teacher In-Service ICT Capacity Workshop', 'Hands-on smart board and digital LMS content creation for 520 collegiate educators.', 'Workshop & Training', 21.0, 'Q2'),
            ('Technical & Vocational Stream Equipment Upgrades in Hambantota Zone', 'Supplying automobile, electrical, and culinary craft equipment to secondary vocational centers.', 'Infrastructure & ICT', 29.5, 'Q3'),
        ]
    },
    {
        'id': 'org-prov-northern-ed',
        'name': 'Northern Province Education Branch',
        'code': 'NP',
        'sector': 'Provincial Execution',
        'officer': 'S. Thevarajah (Provincial Director)',
        'vote': '126-03-04-2502',
        'activities': [
            ('Northern Province Special Needs Education (SEN) Regional Resource Centers', 'Establishing therapeutic and sensory learning rooms for autistic and impaired learners.', 'Infrastructure & ICT', 36.0, 'Q1'),
            ('Jaffna & Kilinochchi Zonal Mathematics Remedial & Olympiad Training', 'Accelerated mathematics coaching camps for rural secondary students.', 'Student Programme', 15.0, 'Q2'),
            ('Solar Power & Battery Storage Retrofitting for Island Schools (Delft & Kayts)', 'Installing off-grid solar electricity systems in remote island educational centers.', 'Infrastructure & ICT', 28.0, 'Q3'),
        ]
    },
    {
        'id': 'org-prov-eastern-ed',
        'name': 'Eastern Province Education Branch',
        'code': 'EP',
        'sector': 'Provincial Execution',
        'officer': 'M.T. Nizam (Provincial Director)',
        'vote': '126-03-05-2502',
        'activities': [
            ('Trilingual Pedagogy & Inter-Community Student Leadership Camps', 'Fostering social cohesion through bilingual science and sports exchanges among diverse schools.', 'Student Programme', 24.0, 'Q1'),
            ('Batticaloa & Ampara Zonal Teacher IT Literacy & Computer Lab Refresh', 'Replacing obsolete desktop terminals with energy-efficient mini PCs in 45 rural labs.', 'Infrastructure & ICT', 39.0, 'Q2'),
            ('Disaster Preparedness, Flood Resilience & Emergency First Aid Training', 'Training school emergency response teams in coastal flood evacuation and first response.', 'Workshop & Training', 12.5, 'Q3'),
        ]
    },
    {
        'id': 'org-prov-uva-ed',
        'name': 'Uva Province Education Branch',
        'code': 'UVA',
        'sector': 'Provincial Execution',
        'officer': 'E.M. Weerasinghe (Provincial Director)',
        'vote': '126-03-08-2502',
        'activities': [
            ('Rural School Science Laboratory Modernization & Chemical Glassware Supply', 'Refitting 40 junior secondary school science units in Badulla and Monaragala districts.', 'Infrastructure & ICT', 35.0, 'Q1'),
            ('Uva Provincial Teacher In-Service Pedagogy Seminar & Microteaching', 'Practical lesson study workshops for primary grade teachers in remote tea estate schools.', 'Workshop & Training', 17.5, 'Q2'),
            ('School Nutrition, Organic Agriculture & Student Green House Projects', 'Establishing school vegetable gardens and drip irrigation for midday meal supplementation.', 'Student Programme', 18.0, 'Q3'),
        ]
    },
    {
        'id': 'org-prov-sabaragamuwa-ed',
        'name': 'Sabaragamuwa Province Education Branch',
        'code': 'SAB',
        'sector': 'Provincial Execution',
        'officer': 'P.A. Ratnayake (Provincial Director)',
        'vote': '126-03-09-2502',
        'activities': [
            ('Landslide-Safe School Structural Retrofitting & Retaining Wall Construction', 'Geotechnical slope stabilization and structural civil works for hazard-prone schools in Ratnapura.', 'Infrastructure & ICT', 52.0, 'Q1'),
            ('Kegalle Zonal ICT & Robotics Innovation Competition for Secondary Students', 'Provincial hackathon and exhibition for student software and IoT inventions.', 'Student Programme', 14.0, 'Q2'),
            ('Primary School Teacher Creative Arts, Puppetry & Drama Teaching Clinics', 'Creative teaching workshops using local arts and puppetry to boost student engagement.', 'Workshop & Training', 13.5, 'Q3'),
        ]
    },
    {
        'id': 'org-prov-north-central-ed',
        'name': 'North Central Province Education Branch',
        'code': 'NCP',
        'sector': 'Provincial Execution',
        'officer': 'W.M. Bandara (Provincial Director)',
        'vote': '126-03-06-2502',
        'activities': [
            ('Ancient Irrigation & Environmental Science Heritage Learning Fieldwork', 'Experiential ecology and hydraulic heritage curriculum field trips for 1,200 Anuradhapura students.', 'Student Programme', 22.0, 'Q1'),
            ('Polonnaruwa Rural Primary School Digital Literacy & Computer Hubs', 'Solar-powered computer learning stations installed in 35 remote agrarian schools.', 'Infrastructure & ICT', 34.0, 'Q2'),
            ('Teacher Professional Development in STEM Inquiry-Based Pedagogy', 'Interactive science teaching clinics and hands-on laboratory modules for 380 secondary teachers.', 'Workshop & Training', 16.5, 'Q3'),
        ]
    },
    {
        'id': 'org-prov-north-western-ed',
        'name': 'North Western Province Education Branch',
        'code': 'NWP',
        'sector': 'Provincial Execution',
        'officer': 'S.K. Dissanayake (Provincial Director)',
        'vote': '126-03-07-2502',
        'activities': [
            ('Wayamba Provincial Collegiate ICT & Smart Classrooms Deployment', 'Equipping 48 secondary schools in Kurunegala and Chilaw with interactive digital podiums.', 'Infrastructure & ICT', 46.0, 'Q1'),
            ('Kurunegala Zonal Remedial Mathematics & Science Masterclasses', 'Weekend acceleration clinics for G.C.E. O/L candidates from underprivileged rural schools.', 'Student Programme', 18.0, 'Q2'),
            ('Early Childhood & Primary Educator Creative Pedagogy Workshop', 'Early literacy, language games, and active play training for 450 primary teachers.', 'Workshop & Training', 15.0, 'Q3'),
        ]
    },
]

YEARS = ['2026', '2027', '2028']

def run_seed():
    db = load_db()

    existing_proposals = db.get('budgetProposalActivities', [])
    existing_aip = db.get('aipActivities', [])
    existing_workshops = db.get('workshops', [])
    existing_obs = db.get('monitoringObservations', [])
    existing_ver = db.get('verificationRecords', [])

    new_proposals = []
    new_aip = []
    new_workshops = []
    new_obs = []
    new_ver = []

    places = db.get('organizations', [])
    venue_map = {
        'WP': 'org-prov-western-ed',
        'CP': 'org-prov-central-ed',
        'SP': 'org-prov-southern-ed',
        'NP': 'org-prov-northern-ed',
        'EP': 'org-prov-eastern-ed',
        'NWP': 'org-prov-north-western-ed',
        'NCP': 'org-prov-north-central-ed',
        'UVA': 'org-prov-uva-ed',
        'SAB': 'org-prov-sabaragamuwa-ed',
    }

    proposal_counter = len(existing_proposals) + 1
    workshop_counter = len(existing_workshops) + 1

    for year in YEARS:
        for branch in BRANCHES:
            b_id = branch['id']
            b_name = branch['name']
            b_code = branch['code']
            b_vote = branch['vote']
            b_officer = branch['officer']
            
            act_num = 1
            for title, desc, cat, cost_mn, qtr in branch['activities']:
                prop_id = f'prop-{year}-{b_code.lower()}-{act_num:02d}'
                aip_id = f'aip-act-{year}-{b_code.lower()}-{act_num:02d}'
                ws_id = f'ws-{year}-{b_code.lower()}-{act_num:02d}'
                
                # Determine realistic status based on Year
                if year == '2026':
                    prop_status = 'Accepted'
                    physical_pct = 75 + (act_num * 5) % 25
                    fin_pct = int(cost_mn * 1_000_000 * (physical_pct / 100))
                    ws_status = 'Completed' if qtr in ['Q1', 'Q2', 'Q3'] else 'In Progress'
                elif year == '2027':
                    prop_status = 'Accepted' if act_num <= 2 else ('Adjusted' if act_num == 3 else 'Under Review')
                    physical_pct = 25 if act_num == 1 else 0
                    fin_pct = int(cost_mn * 1_000_000 * 0.2) if act_num == 1 else 0
                    ws_status = 'Scheduled'
                else: # 2028
                    prop_status = 'Submitted' if act_num % 2 == 1 else 'Accepted'
                    physical_pct = 0
                    fin_pct = 0
                    ws_status = 'Scheduled'

                # 1. Budget Proposal Activity
                if not any(p.get('id') == prop_id for p in existing_proposals):
                    new_prop = {
                        'id': prop_id,
                        'financialYear': year,
                        'implementationYear': year,
                        'institutionId': 'org-moe',
                        'institutionName': 'Ministry of Education',
                        'divisionId': b_id,
                        'divisionName': b_name,
                        'activityTitle': title,
                        'category': cat,
                        'expenditureNature': 'Capital' if cat in ['Infrastructure & ICT'] else 'Recurrent',
                        'proposedExecutingAgencyType': 'Self (Branch)',
                        'executingAgencyName': b_name,
                        'isExtensionOfPreviousAip': False,
                        'description': desc,
                        'purpose': f'To implement {title} across beneficiary education zones and schools.',
                        'justification': f'Mandated under national education sector key performance indicators (KPIs) for {year}.',
                        'expectedOutputs': f'Successfully deployed targets for {title} according to quality specifications.',
                        'keyDeliverables': f'Operational deliverables, training modules, and completion reports certified by {b_officer}.',
                        'implementationPeriod': qtr,
                        'targetBeneficiaries': 'Teachers, Principals, Curriculum Officers & Students',
                        'beneficiaryCount': 85 + (act_num * 60),
                        'estimatedCostMn': cost_mn,
                        'noBudgetRequired': False,
                        'status': prop_status,
                        'submittedBy': b_officer.split()[0].lower(),
                        'submittedAt': f'{int(year)-1}-10-15T09:30:00Z',
                        'activityNumber': act_num,
                        'assignedActivityCode': f'ACT-{act_num:02d}',
                        'allocatedAmountMn': cost_mn if prop_status in ['Accepted', 'Adjusted'] else None,
                        'assignedVoteNumber': b_vote,
                        'governmentPriorityTheme': branch['sector'],
                        'assignedFundingSource': 'Government of Sri Lanka Consolidated Fund (Treasury)',
                        'createdAt': f'{int(year)-1}-10-15T09:30:00Z',
                        'updatedAt': f'{year}-01-10T10:00:00Z',
                    }
                    new_proposals.append(new_prop)

                # 2. AIP Activity (for 2026, 2027, 2028)
                if not any(a.get('id') == aip_id for a in existing_aip):
                    cost_rupees = int(cost_mn * 1_000_000)
                    q_val = cost_rupees // 4
                    q_targets = {
                        'Q1': ('Preparatory stakeholder workshops, tender documentation & approvals', q_val),
                        'Q2': ('Deployment of equipment/materials & commencement of field training', q_val),
                        'Q3': ('Institutional delivery, school-level rollouts & midterm assessment', q_val),
                        'Q4': ('Final verification, certification & impact evaluation reporting', q_val),
                    }
                    
                    new_act = {
                        'id': aip_id,
                        'planId': f'plan-{year}-{b_code.lower()}',
                        'branchId': b_id,
                        'branchName': b_name,
                        'year': year,
                        'outputNo': f'OP-{act_num:02d}',
                        'activityCode': f'ACT-{act_num:02d}',
                        'activity': title,
                        'strategicObjectiveId': 'so-1',
                        'programmeId': 'prog-1',
                        'projectId': 'proj-1',
                        'objectCode': '2502' if cat in ['Infrastructure & ICT'] else '1402',
                        'fundingSource': 'Government of Sri Lanka Consolidated Fund (Treasury)',
                        'approvedAllocation': cost_rupees,
                        'voteNumber': b_vote,
                        'estimatedCost': cost_rupees,
                        'financialMonths': [q_val // 3] * 12,
                        'physicalMonths': ['Ongoing' if physical_pct > 0 else 'Pending'] * 12,
                        'financialQ1': q_val,
                        'financialQ2': q_val,
                        'financialQ3': q_val,
                        'financialQ4': q_val,
                        'targetQ1': q_targets['Q1'][0],
                        'targetQ2': q_targets['Q2'][0],
                        'targetQ3': q_targets['Q3'][0],
                        'targetQ4': q_targets['Q4'][0],
                        'responsibleOfficer': b_officer,
                        'remarks': f'Annual Plan activity aligned with vote {b_vote}.',
                        'proposalId': prop_id,
                        'proposalActivityNumber': act_num,
                        'physicalProgress': f'{physical_pct}% physical achievement certified',
                        'physicalProgressPct': f'{physical_pct}%',
                        'financialProgress': fin_pct,
                    }
                    new_aip.append(new_act)

                # 3. Workshop Entry
                if not any(w.get('id') == ws_id for w in existing_workshops):
                    # Dates depending on quarter
                    q_months = {'Q1': ('02-15', '02-18'), 'Q2': ('05-10', '05-13'), 'Q3': ('08-20', '08-23'), 'Q4': ('11-12', '11-15')}
                    s_mo, e_mo = q_months.get(qtr, ('03-10', '03-12'))
                    s_date = f'{year}-{s_mo}'
                    e_date = f'{year}-{e_mo}'
                    
                    venue_id = venue_map.get(b_code, 'org-prov-western-ed')
                    venue_name = b_name if 'Province' in b_name else 'National Education Auditorium & Provincial Center'
                    
                    trainee_cnt = 45 + (act_num * 15)
                    
                    new_ws = {
                        'id': ws_id,
                        'workshopNumber': f'WS/{year}/{b_code}/{act_num:02d}',
                        'year': year,
                        'branch': b_name,
                        'subject': branch['sector'],
                        'title': f'{title} – Capacity Workshop',
                        'aim': f'To train provincial master trainers and officers in {title}.',
                        'expectedOutput': f'{trainee_cnt} certified officers and implementation protocols established.',
                        'placeId': venue_id,
                        'placeName': venue_name,
                        'daysHeld': 3,
                        'startDate': s_date,
                        'endDate': e_date,
                        'venue': venue_name,
                        'organizingOrgId': b_id,
                        'targetOrgId': venue_id,
                        'expectedTrainees': trainee_cnt,
                        'actualTrainees': trainee_cnt if ws_status == 'Completed' else int(trainee_cnt * 0.9),
                        'status': ws_status,
                        'traineeCount': trainee_cnt,
                        'resourcePersonCount': 4,
                        'confirmationStatus': 'Confirmed',
                        'aipActivityId': aip_id,
                        'aipActivityCode': f'ACT-{act_num:02d}',
                        'aipActivityTitle': title,
                        'voteNumber': b_vote,
                        'createdAt': f'{year}-01-15T08:00:00Z',
                    }
                    new_workshops.append(new_ws)

                # 4. Monitoring Observation & Verification (for completed/in-progress 2026/2027 activities)
                if year in ['2026', '2027'] and act_num <= 2:
                    obs_id = f'obs-{year}-{b_code.lower()}-{act_num:02d}'
                    ver_id = f'ver-{year}-{b_code.lower()}-{act_num:02d}'
                    
                    if not any(o.get('id') == obs_id for o in existing_obs):
                        new_obs.append({
                            'id': obs_id,
                            'aipActivityId': aip_id,
                            'aipActivityCode': f'ACT-{act_num:02d}',
                            'aipActivityTitle': title,
                            'workshopId': ws_id,
                            'workshopTitle': f'{title} – Capacity Workshop',
                            'institutionId': 'org-moe',
                            'institutionName': 'Ministry of Education',
                            'divisionId': b_id,
                            'divisionName': b_name,
                            'monitoringOfficerId': 'usr-mon-01',
                            'monitoringOfficerName': 'N. Fernando (Senior QA Auditor)',
                            'observationType': 'Field Inspection',
                            'title': f'Field Monitoring Review: {title}',
                            'details': f'Audited deliverable milestones for {title}. Material compliance and attendance verified.',
                            'severity': 'Low' if physical_pct > 50 else 'Medium',
                            'correctiveActionRequired': False,
                            'status': 'Resolved' if physical_pct > 70 else 'Under Review',
                            'createdAt': f'{year}-06-20T11:00:00Z',
                            'updatedAt': f'{year}-07-05T14:30:00Z',
                        })

                    if not any(v.get('id') == ver_id for v in existing_ver):
                        new_ver.append({
                            'id': ver_id,
                            'aipActivityId': aip_id,
                            'aipActivityCode': f'ACT-{act_num:02d}',
                            'aipActivityTitle': title,
                            'institutionName': 'Ministry of Education',
                            'divisionName': b_name,
                            'reportedPhysicalPct': physical_pct,
                            'verifiedPhysicalPct': physical_pct,
                            'reportedFinancialCost': fin_pct,
                            'verifiedFinancialCost': fin_pct,
                            'status': 'Verified',
                            'verificationNotes': f'Audit team verified {physical_pct}% achievement against quarterly milestones.',
                            'evidenceApproved': True,
                            'verifiedByUserId': 'usr-mon-01',
                            'verifiedByName': 'N. Fernando (Senior QA Auditor)',
                            'createdAt': f'{year}-06-22T15:00:00Z',
                        })

                act_num += 1

    # Merge into database
    db['budgetProposalActivities'] = existing_proposals + new_proposals
    db['aipActivities'] = existing_aip + new_aip
    db['workshops'] = existing_workshops + new_workshops
    db['monitoringObservations'] = existing_obs + new_obs
    db['verificationRecords'] = existing_ver + new_ver

    # Ensure lastWorkshopNumber is updated
    if 'meta' not in db:
        db['meta'] = {}
    db['meta']['lastWorkshopNumber'] = len(db['workshops']) + 10

    save_db(db)

    print('='*60)
    print('SEEDING COMPLETE!')
    tot_prop = len(db['budgetProposalActivities'])
    tot_aip = len(db['aipActivities'])
    tot_ws = len(db['workshops'])
    tot_obs = len(db['monitoringObservations'])
    tot_ver = len(db['verificationRecords'])
    print(f'New Budget Proposals added: {len(new_proposals)} (Total now: {tot_prop})')
    print(f'New AIP Activities added: {len(new_aip)} (Total now: {tot_aip})')
    print(f'New Workshops added: {len(new_workshops)} (Total now: {tot_ws})')
    print(f'New Observations added: {len(new_obs)} (Total now: {tot_obs})')
    print(f'New Verifications added: {len(new_ver)} (Total now: {tot_ver})')
    print('Years covered: 2026, 2027, 2028 across all 17 national and provincial branches!')
    print('='*60)

if __name__ == '__main__':
    run_seed()
