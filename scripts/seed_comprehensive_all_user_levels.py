"""
Comprehensive Seeder Script for IPMIS (Ministry of Education Sri Lanka)
Populates realistic, coherent, and verified test data across ALL user logon levels,
branches, provincial departments, zonal offices, and divisional offices.
"""

import json
import os
import uuid
import random
from datetime import datetime, date, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'database.json')

def load_db():
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_db(data):
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Realistic Resource Persons Catalog
ENRICHED_RESOURCE_PERSONS = [
    {
        "id": "rp-ajith-madurapperuma",
        "name": "Prof. Ajith Madurapperuma",
        "designation": "Senior Professor of Computing & Digital Pedagogy",
        "field": "Information & Communication Technology",
        "organization": "University of Colombo / MoE Advisory Council",
        "email": "ajith.madurapperuma@moe.gov.lk",
        "phone": "+94 77 123 4501",
        "rating": 4.9,
        "hourlyRate": 4500,
        "expertise": ["Cloud LMS Architecture", "AI in Pedagogy", "Computer Science Curriculum"]
    },
    {
        "id": "rp-buddhini-samarasinghe",
        "name": "Dr. Buddhini Samarasinghe",
        "designation": "Chief Curriculum Specialist (Science & STEM)",
        "field": "STEM & Science",
        "organization": "National Institute of Education (NIE)",
        "email": "buddhini.s@nie.ac.lk",
        "phone": "+94 71 892 3412",
        "rating": 4.8,
        "hourlyRate": 4000,
        "expertise": ["Micro-scale Chemistry", "Secondary Science Syllabi", "Inquiry-Based Learning"]
    },
    {
        "id": "rp-kumara-senanayake",
        "name": "Dr. K.M. Senanayake",
        "designation": "Consultant Director of Educational Planning",
        "field": "Educational Management",
        "organization": "Ministry of Education - Policy Planning Division",
        "email": "km.senanayake@moe.gov.lk",
        "phone": "+94 77 345 6789",
        "rating": 4.95,
        "hourlyRate": 4500,
        "expertise": ["AIP Formulation", "Public Financial Management (PFM)", "Sector Modeling"]
    },
    {
        "id": "rp-lahiru-gunasekara",
        "name": "Eng. Lahiru Gunasekara",
        "designation": "Senior Technical Infrastructure Consultant",
        "field": "Information & Communication Technology",
        "organization": "Information and Communication Technology Agency (ICTA)",
        "email": "lahiru.g@icta.gov.lk",
        "phone": "+94 76 543 2109",
        "rating": 4.75,
        "hourlyRate": 3800,
        "expertise": ["Fiber Backbone Networks", "Smart Board Hardware", "Server Virtualization"]
    },
    {
        "id": "rp-champa-gunawardena",
        "name": "Mrs. Champa Gunawardena",
        "designation": "Senior Lecturer in Mathematics Pedagogy",
        "field": "Mathematics",
        "organization": "National College of Education (NCOE) Maharagama",
        "email": "champa.g@ncoe.edu.lk",
        "phone": "+94 71 456 7890",
        "rating": 4.85,
        "hourlyRate": 3500,
        "expertise": ["Primary Mathematics", "Olympiad Mathematical Thinking", "Formative Diagnostic Tools"]
    },
    {
        "id": "rp-ranjith-dissanayake",
        "name": "Dr. Ranjith Dissanayake",
        "designation": "Director of School Health & Adolescent Nutrition",
        "field": "School Health & Nutrition",
        "organization": "Ministry of Health / MoE Joint Directorate",
        "email": "ranjith.d@health.gov.lk",
        "phone": "+94 77 654 3210",
        "rating": 4.8,
        "hourlyRate": 4000,
        "expertise": ["School Meal Programme Protocols", "Adolescent Nutrition", "School First Aid Protocols"]
    },
    {
        "id": "rp-anoma-wickramasinghe",
        "name": "Prof. Anoma Wickramasinghe",
        "designation": "Chair Professor of Agricultural Science & Food Security",
        "field": "Agriculture & Environment",
        "organization": "Faculty of Agriculture, University of Peradeniya",
        "email": "anoma.w@agri.pdn.ac.lk",
        "phone": "+94 77 876 5432",
        "rating": 4.9,
        "hourlyRate": 4200,
        "expertise": ["School Agri-Gardens", "Hydroponics in Schools", "Climate Smart Agriculture"]
    },
    {
        "id": "rp-sarath-thevarajah",
        "name": "Mr. S. Thevarajah",
        "designation": "Senior Master Trainer in English & Trilingual Pedagogy",
        "field": "English & Languages",
        "organization": "Provincial Department of Education - Northern Province",
        "email": "s.thevarajah@np.edu.lk",
        "phone": "+94 77 987 6543",
        "rating": 4.75,
        "hourlyRate": 3500,
        "expertise": ["Communicative Language Teaching", "Trilingual Vocabulary Packs", "Oral Immersion"]
    },
    {
        "id": "rp-ven-rahula-thero",
        "name": "Ven. Dr. Medagoda Rahula Thero",
        "designation": "Chief Advisory Consultant for Monastic Education",
        "field": "Educational Management",
        "organization": "Piriven Education Directorate, Ministry of Education",
        "email": "rahula.thero@moe.gov.lk",
        "phone": "+94 71 234 5678",
        "rating": 4.9,
        "hourlyRate": 3500,
        "expertise": ["Pali & Sanskrit Pedagogy", "Piriven Quality Standards", "Hermeneutic Curriculum"]
    },
    {
        "id": "rp-chandana-abeyratne",
        "name": "Mr. Chandana Abeyratne",
        "designation": "Senior Financial Governance & Audit Specialist",
        "field": "Educational Management",
        "organization": "Auditor General's Department (Education Sector Audit)",
        "email": "chandana.a@auditorgeneral.gov.lk",
        "phone": "+94 77 222 3344",
        "rating": 4.9,
        "hourlyRate": 4500,
        "expertise": ["Government Financial Regulations (FR)", "Treasury Circular Compliance", "Procurement Audits"]
    }
]

# Branch Profiles for All 26 Users and Key Organizations
BRANCH_PROFILES = [
    # 1. MOE ICT Branch (user: ict.officer)
    {
        "orgId": "org-moe-ict",
        "orgName": "MOE ICT Branch",
        "code": "ICT",
        "username": "ict.officer",
        "officerName": "P.W. Ranasinghe (Assistant Director IT)",
        "vote": "126-02-03-2502",
        "category": "Information & Communication Technology",
        "workshops": [
            ("Master Trainer Certification on AI & Digital Pedagogy", "Information & Communication Technology", "Completed", "2026-02-10", "2026-02-14", 45, 45, 420000, 395000, "Southern Province IT Branch", "org-prov-southern-it"),
            ("National LMS (e-Thaksalawa) Content Authoring Workshop", "Information & Communication Technology", "Completed", "2026-05-18", "2026-05-20", 60, 58, 380000, 362000, "Western Province ICT Resource Center", "org-prov-western-ed"),
            ("Smart Interactive Flat Panel (IFP) Deployment & Maintenance Clinic", "Information & Communication Technology", "In Progress", "2026-11-12", "2026-11-15", 40, 38, 290000, 145000, "Galle Zone IT Center", "org-zone-galle-it"),
            ("Cloud School Network Security & Cyber-Safety Protocol Workshop", "Information & Communication Technology", "Scheduled", "2026-12-05", "2026-12-07", 55, 0, 340000, 0, "Central Province Education Hall", "org-prov-central-ed"),
            ("Secondary School Robotics & IoT Micro-Controller Practical Bootcamp", "Information & Communication Technology", "Scheduled", "2027-01-18", "2027-01-21", 50, 0, 480000, 0, "Colombo Zone IT Resource Center", "org-zone-colombo-it"),
            ("Educational Data Telemetry & IPMIS Branch Dashboard Operations", "Information & Communication Technology", "Rescheduled", "2026-10-22", "2026-10-24", 35, 0, 250000, 0, "Isurupaya Computer Lab", "org-moe"),
        ],
        "proposals": [
            ("High-Speed Fiber Backbone & Wi-Fi Expansion for 250 Collegiate Schools", "Infrastructure & ICT", "Capital", "Q1", 85.0, "Accepted", "ACT-01", 1, 85.0, "126-02-03-2502", "Treasury"),
            ("Cloud LMS Microservices Architecture & Offline Mobile Cache Upgrade", "Infrastructure & ICT", "Capital", "Q2", 42.0, "Accepted", "ACT-02", 2, 38.5, "126-02-03-2502", "Treasury"),
            ("Residential Hands-on IFP Teacher Training for Science & Maths Cadre", "Workshop & Training", "Recurrent", "Q3", 28.0, "Accepted", "ACT-03", 3, 28.0, "126-02-03-2104", "Treasury"),
            ("Robotics & IoT Prototyping Hardware Kits for 100 Provincial Schools", "Infrastructure & ICT", "Capital", "Q3", 65.5, "Submitted", None, None, None, None, None),
            ("Digital Accessibility Screen-Reader Software for Vision-Impaired Students", "Infrastructure & ICT", "Recurrent", "Q2", 12.0, "Submitted", None, None, None, None, None),
            ("Provincial ICT Lab Preventive Maintenance & Surge Protection Pilot", "Infrastructure & ICT", "Recurrent", "Q4", 15.5, "Draft", None, None, None, None, None),
            ("Commercial Cloud Gaming Hardware Feasibility Study", "Other", "Recurrent", "Q1", 8.0, "Rejected", None, None, None, None, None, "Does not align with National Curriculum competencies under Circular 04/2026"),
        ]
    },

    # 2. MOE Planning Branch (user: planning.officer / planning)
    {
        "orgId": "org-moe-planning",
        "orgName": "MOE Planning Branch",
        "code": "PLN",
        "username": "planning.officer",
        "officerName": "Dr. K.M. Senanayake (Director Planning)",
        "vote": "126-01-01-2104",
        "category": "Educational Management",
        "workshops": [
            ("MTESDP 2026-2030 Medium-Term Strategic Plan Alignment Seminar", "Educational Management", "Completed", "2026-03-04", "2026-03-06", 50, 50, 410000, 398000, "MoE Auditorium, Isurupaya", "org-moe"),
            ("AIP 2027 Bottom-Up Budget Formulation & Ceilings Workshop", "Educational Management", "Completed", "2026-07-14", "2026-07-16", 75, 74, 520000, 510000, "Southern Province Education Auditorium", "org-prov-southern"),
            ("Provincial & Zonal Planning Directors National Governance Forum", "Educational Management", "In Progress", "2026-11-13", "2026-11-16", 65, 62, 460000, 230000, "Kandy Queen's Hall (Central Province)", "org-prov-central-ed"),
            ("School Resource Equity Index & Demographic Mapping Clinic", "Educational Management", "Scheduled", "2026-12-10", "2026-12-12", 40, 0, 310000, 0, "Colombo Zonal Office", "org-zone-colombo-it"),
            ("Capital Works Prioritization & Treasury Project Submission Masterclass", "Educational Management", "Scheduled", "2027-02-08", "2027-02-10", 55, 0, 390000, 0, "NIE Training Hall, Maharagama", "org-nie"),
        ],
        "proposals": [
            ("GIS School Demographic Disparity & Rationalization Modeling", "Monitoring & Evaluation", "Recurrent", "Q1", 24.0, "Accepted", "ACT-01", 1, 24.0, "126-01-01-2104", "Treasury"),
            ("National Provincial Planning Director FRS Standards & AIP Training", "Workshop & Training", "Recurrent", "Q2", 18.5, "Accepted", "ACT-02", 2, 18.5, "126-01-01-2104", "Treasury"),
            ("Capital Investment Feasibility Reviews for Under-resourced Rural Clusters", "Other", "Capital", "Q3", 14.2, "Submitted", None, None, None, None, None),
            ("Public Expenditure Tracking Survey (PETS) for General Education", "Monitoring & Evaluation", "Recurrent", "Q4", 21.0, "Submitted", None, None, None, None, None),
            ("Comprehensive Digital Archive of National Education Strategic Policies", "Other", "Recurrent", "Q2", 6.5, "Draft", None, None, None, None, None),
        ]
    },

    # 3. MOE Monitoring & Performance Branch (user: monitoring.officer / monitoring)
    {
        "orgId": "org-moe-monitoring",
        "orgName": "MOE Monitoring & Performance Branch",
        "code": "MON",
        "username": "monitoring.officer",
        "officerName": "H.M. Bandara (Chief Monitoring Officer)",
        "vote": "126-01-02-1501",
        "category": "Educational Management",
        "workshops": [
            ("National Educational Telemetry Verification & FRS Standards Seminar", "Educational Management", "Completed", "2026-04-08", "2026-04-10", 45, 45, 360000, 345000, "MoE Monitoring Center", "org-moe"),
            ("Provincial Quality Assurance Field Verification Officer Practicum", "Educational Management", "Completed", "2026-08-22", "2026-08-24", 50, 48, 390000, 375000, "Southern Province Education Hall", "org-prov-southern"),
            ("Automated Physical & Financial Milestone Verification Training", "Educational Management", "In Progress", "2026-11-12", "2026-11-15", 40, 39, 310000, 155000, "Galle Education Office", "org-zone-galle"),
            ("School Quality Index (SQI) Audit Training for Zonal In-Service Advisors", "Educational Management", "Scheduled", "2027-01-14", "2027-01-16", 60, 0, 440000, 0, "Central Province Hall", "org-prov-central-ed"),
        ],
        "proposals": [
            ("Integrated Field Monitoring Mobile App & Evidence Geo-Tagging System", "Infrastructure & ICT", "Capital", "Q1", 32.0, "Accepted", "ACT-01", 1, 30.0, "126-01-02-1501", "Treasury"),
            ("Whole-School Internal Evaluation (WSIE) Independent Verification Audit", "Monitoring & Evaluation", "Recurrent", "Q2", 18.5, "Accepted", "ACT-02", 2, 18.5, "126-01-02-1501", "Treasury"),
            ("Quarterly Joint Provincial Performance Reviews with Line Ministries", "Monitoring & Evaluation", "Recurrent", "Q3", 14.0, "Submitted", None, None, None, None, None),
            ("National Education Performance Metric Analytics Platform", "Infrastructure & ICT", "Capital", "Q4", 26.5, "Draft", None, None, None, None, None),
        ]
    },

    # 4. MOE Mathematics Branch (user: maths.officer)
    {
        "orgId": "org-moe-maths",
        "orgName": "Mathematics",
        "code": "MTH",
        "username": "maths.officer",
        "officerName": "K.T. Jayawardena (Senior Director Mathematics)",
        "vote": "126-02-02-1402",
        "category": "Mathematics",
        "workshops": [
            ("Primary Grade 1-5 Mental Arithmetic & Foundational Numeracy Practicum", "Mathematics", "Completed", "2026-03-16", "2026-03-18", 65, 65, 430000, 415000, "NCOE Maharagama", "org-nie"),
            ("G.C.E. O/L Mathematics Critical Competencies & Remedial Teaching Workshop", "Mathematics", "Completed", "2026-06-22", "2026-06-25", 80, 78, 540000, 528000, "Southern Province Science Center", "org-prov-southern-ed"),
            ("National Mathematics Olympiad Problem-Solving Bootcamp for Educators", "Mathematics", "In Progress", "2026-11-13", "2026-11-16", 50, 49, 390000, 195000, "Galle Zonal Education Office", "org-zone-galle"),
            ("GeoGebra & Dynamic Interactive Mathematics Software Certification", "Mathematics", "Scheduled", "2026-12-14", "2026-12-16", 55, 0, 360000, 0, "Colombo Zone IT Resource Center", "org-zone-colombo-it"),
            ("Secondary Geometry & Calculus Hands-On Conceptual Laboratory Toolkit", "Mathematics", "Scheduled", "2027-02-15", "2027-02-18", 60, 0, 420000, 0, "Central Province Education Hall", "org-prov-central-ed"),
        ],
        "proposals": [
            ("National Foundational Numeracy Activity Toolkits for 1,500 Primary Schools", "Curriculum & Materials", "Recurrent", "Q1", 28.5, "Accepted", "ACT-01", 1, 28.5, "126-02-02-1402", "Treasury"),
            ("G.C.E. O/L Mathematics Targeted Pass Rate Improvement Intensive Clinics", "Workshop & Training", "Recurrent", "Q2", 19.0, "Accepted", "ACT-02", 2, 19.0, "126-02-02-1402", "Treasury"),
            ("Interactive Mathematics Digital Labs (GeoGebra/Desmos) Software Licenses", "Infrastructure & ICT", "Capital", "Q3", 16.5, "Submitted", None, None, None, None, None),
            ("National Junior Mathematical Olympiad Regional Competitions & Awards", "Student Programme", "Recurrent", "Q4", 12.0, "Submitted", None, None, None, None, None),
            ("Mathematics Remedial Workbooks for Underperforming Rural Zones", "Curriculum & Materials", "Recurrent", "Q1", 9.5, "Draft", None, None, None, None, None),
        ]
    },

    # 5. MOE School Health & Nutrition (user: health.officer)
    {
        "orgId": "org-moe-health",
        "orgName": "School Health and Nutrition",
        "code": "HLT",
        "username": "health.officer",
        "officerName": "T. Dharshani (Director Health & Nutrition)",
        "vote": "126-02-01-1204",
        "category": "School Health & Nutrition",
        "workshops": [
            ("National School Mid-Day Meal Quality Assurance & Hygiene Standards", "Educational Management", "Completed", "2026-02-24", "2026-02-26", 70, 70, 460000, 448000, "MoE Auditorium, Isurupaya", "org-moe"),
            ("School Adolescent Health, Mental Wellbeing & First Aid Instructor Training", "Educational Management", "Completed", "2026-06-10", "2026-06-12", 60, 58, 380000, 370000, "Southern Province Hall, Galle", "org-prov-southern"),
            ("Water, Sanitation & Hygiene (WASH) Protocols for Estate & Rural Schools", "Educational Management", "In Progress", "2026-11-12", "2026-11-15", 50, 47, 340000, 170000, "Central Province Education Hall", "org-prov-central-ed"),
            ("School Health Promotion Club Coordinators Annual Capacity Forum", "Educational Management", "Scheduled", "2027-01-20", "2027-01-22", 65, 0, 410000, 0, "Western Province Hall", "org-prov-western-ed"),
        ],
        "proposals": [
            ("School Health Room First-Aid Medical Kits Distribution (3,000 Schools)", "Infrastructure & ICT", "Capital", "Q1", 45.0, "Accepted", "ACT-01", 1, 45.0, "126-02-01-1204", "Treasury"),
            ("Hygiene & Nutrition Peer Educator Training for Junior Secondary Students", "Student Programme", "Recurrent", "Q2", 16.0, "Accepted", "ACT-02", 2, 15.0, "126-02-01-1204", "Treasury"),
            ("School Canteen Food Safety Surveillance & Color-Coding Enforcement Audit", "Monitoring & Evaluation", "Recurrent", "Q3", 11.5, "Submitted", None, None, None, None, None),
            ("Digital Health Card & BMI Tracking Portal Integration for Primary Schools", "Infrastructure & ICT", "Capital", "Q4", 22.0, "Draft", None, None, None, None, None),
        ]
    },

    # 6. MOE Agriculture & Environmental (user: agri.officer)
    {
        "orgId": "org-moe-agri",
        "orgName": "Agriculture and Environmental",
        "code": "AGR",
        "username": "agri.officer",
        "officerName": "M.I. Farook (Director Agriculture & Food Security)",
        "vote": "126-02-02-1405",
        "category": "Agriculture & Environment",
        "workshops": [
            ("School Agri-Gardens & Modern Hydroponics Practical Demonstration", "STEM & Science", "Completed", "2026-03-25", "2026-03-27", 55, 55, 380000, 365000, "Peradeniya Agri Center", "org-prov-central-ed"),
            ("Climate-Smart Agriculture & Organic Waste Composting Teacher Training", "STEM & Science", "Completed", "2026-07-28", "2026-07-30", 60, 59, 410000, 395000, "Southern Province Agri Institute", "org-prov-southern-ed"),
            ("School Biodiversity Conservation & Rainwater Harvesting Workshop", "STEM & Science", "Scheduled", "2026-12-16", "2026-12-18", 45, 0, 320000, 0, "Galle Zonal Education Office", "org-zone-galle"),
            ("Secondary Agriculture Science Practical Skills & Soil Testing Clinic", "STEM & Science", "Scheduled", "2027-02-22", "2027-02-24", 50, 0, 360000, 0, "Uva Province Education Hall", "org-prov-uva-ed"),
        ],
        "proposals": [
            ("School Greenhouse & Micro-Irrigation Model Units for 200 Secondary Schools", "Infrastructure & ICT", "Capital", "Q1", 52.0, "Accepted", "ACT-01", 1, 48.0, "126-02-02-1405", "Treasury"),
            ("National School Young Farmers Club Regional Agricultural Exhibitions", "Student Programme", "Recurrent", "Q2", 14.5, "Accepted", "ACT-02", 2, 14.5, "126-02-02-1405", "Treasury"),
            ("Agricultural Science Practical Field Examination Standardized Toolkits", "Curriculum & Materials", "Recurrent", "Q3", 18.0, "Submitted", None, None, None, None, None),
            ("School Tree Canopy & Carbon Neutral Schools Accreditation Program", "Other", "Recurrent", "Q4", 9.0, "Draft", None, None, None, None, None),
        ]
    },

    # 7. Digital Education Infrastructure (user: digital.infra)
    {
        "orgId": "org-moe-digital-infra",
        "orgName": "Digital Education Infrastructure Development",
        "code": "INF",
        "username": "digital.infra",
        "officerName": "A.D. Samarakoon (Chief Infrastructure Engineer)",
        "vote": "126-02-03-2503",
        "category": "Information & Communication Technology",
        "workshops": [
            ("Provincial Computer Center Gigabit LAN & Structured Cabling Standards", "Information & Communication Technology", "Completed", "2026-04-14", "2026-04-16", 40, 40, 350000, 340000, "Colombo Telecom Training Hall", "org-zone-colombo-it"),
            ("Solar Photovoltaic Inverter & Battery Maintenance for Island Schools", "Information & Communication Technology", "Completed", "2026-08-18", "2026-08-20", 35, 34, 380000, 368000, "Jaffna Zonal Computer Center", "org-prov-northern-ed"),
            ("Interactive Smart Classroom Audio-Visual Integration Masterclass", "Information & Communication Technology", "In Progress", "2026-11-11", "2026-11-14", 45, 42, 390000, 195000, "Southern Province IT Branch", "org-prov-southern-it"),
            ("School Computer Laboratory Power Surge & Lightning Protection Clinic", "Information & Communication Technology", "Scheduled", "2027-01-26", "2027-01-28", 50, 0, 330000, 0, "Galle Zonal IT Center", "org-zone-galle-it"),
        ],
        "proposals": [
            ("Off-Grid Solar Power & Battery Storage for 60 Remote Deep-Rural Schools", "Infrastructure & ICT", "Capital", "Q1", 68.0, "Accepted", "ACT-01", 1, 65.0, "126-02-03-2503", "Treasury"),
            ("Provincial High-Performance Server Cluster Virtualization Refresh", "Infrastructure & ICT", "Capital", "Q2", 34.0, "Accepted", "ACT-02", 2, 34.0, "126-02-03-2503", "Treasury"),
            ("High-Speed Structured LAN Cabling Reticulation for 150 School Computer Labs", "Infrastructure & ICT", "Capital", "Q3", 42.5, "Submitted", None, None, None, None, None),
            ("Universal Cloud Video Conferencing Terminals for Zonal Education Offices", "Infrastructure & ICT", "Capital", "Q4", 18.0, "Draft", None, None, None, None, None),
        ]
    },

    # 8. Education Reforms (user: reforms.officer)
    {
        "orgId": "org-moe-reforms",
        "orgName": "Education Reforms",
        "code": "REF",
        "username": "reforms.officer",
        "officerName": "Prof. Lalitha Mendis (Head of Reform Taskforce)",
        "vote": "126-01-01-2105",
        "category": "Educational Management",
        "workshops": [
            ("Modular Competency-Based Assessment System (CBA) National Briefing", "Educational Management", "Completed", "2026-05-04", "2026-05-06", 65, 65, 450000, 438000, "MoE Auditorium, Isurupaya", "org-moe"),
            ("Senior Secondary Vocational Pathways & Dual-Certification Workshops", "Educational Management", "Completed", "2026-09-15", "2026-09-17", 55, 54, 390000, 380000, "NIE Auditorium, Maharagama", "org-nie"),
            ("Continuous Formative Evaluation & Classroom Portfolio Assessment Clinic", "Educational Management", "Scheduled", "2026-12-18", "2026-12-20", 60, 0, 420000, 0, "Southern Province Education Hall", "org-prov-southern"),
            ("School Clustering & Educational Administrative Streamlining Seminar", "Educational Management", "Scheduled", "2027-02-18", "2027-02-20", 50, 0, 370000, 0, "Central Province Hall", "org-prov-central-ed"),
        ],
        "proposals": [
            ("Modular Formative Assessment Framework Teacher Guides (Tri-lingual)", "Curriculum & Materials", "Recurrent", "Q1", 22.0, "Accepted", "ACT-01", 1, 22.0, "126-01-01-2105", "Treasury"),
            ("Vocational Stream Technical Equipment Modernization for 80 Lead Schools", "Infrastructure & ICT", "Capital", "Q2", 56.0, "Accepted", "ACT-02", 2, 52.0, "126-01-01-2105", "Treasury"),
            ("National Public Awareness & Parental Engagement Campaign on Curricular Reforms", "Other", "Recurrent", "Q3", 14.0, "Submitted", None, None, None, None, None),
            ("Standardized Digital Question Bank for Formative Classroom Testing", "Infrastructure & ICT", "Capital", "Q4", 28.0, "Draft", None, None, None, None, None),
        ]
    },

    # 9. National College of Education (user: ncoe.officer)
    {
        "orgId": "org-moe-ncoe",
        "orgName": "National College of Education",
        "code": "NCO",
        "username": "ncoe.officer",
        "officerName": "G.H. Premaratne (Chief Commissioner NCOE)",
        "vote": "126-02-04-2401",
        "category": "Educational Management",
        "workshops": [
            ("Pre-Service Teacher Internship Supervision & Clinical Mentoring", "Educational Management", "Completed", "2026-03-10", "2026-03-12", 75, 75, 510000, 495000, "Maharagama NCOE", "org-nie"),
            ("Modern Educational Psychology & Inclusive Classroom Strategies", "Educational Management", "Completed", "2026-07-16", "2026-07-18", 80, 78, 540000, 525000, "Nilwala NCOE, Akuressa (Southern)", "org-prov-southern"),
            ("NCOE Academic Cadre Digital Pedagogy & Micro-Teaching Practicum", "Educational Management", "In Progress", "2026-11-12", "2026-11-15", 55, 53, 410000, 205000, "Siyane NCOE, Veyangoda", "org-prov-western-ed"),
            ("Pre-Service Science Teacher Laboratory Practicum & Safety Certification", "STEM & Science", "Scheduled", "2027-01-18", "2027-01-20", 60, 0, 430000, 0, "Peradeniya NCOE", "org-prov-central-ed"),
        ],
        "proposals": [
            ("Modern Micro-Teaching Video Observation Labs in 19 NCOE Campuses", "Infrastructure & ICT", "Capital", "Q1", 48.0, "Accepted", "ACT-01", 1, 45.0, "126-02-04-2401", "Treasury"),
            ("Digital Smart Board Classrooms and High-Speed Wi-Fi for NCOE Trainees", "Infrastructure & ICT", "Capital", "Q2", 36.0, "Accepted", "ACT-02", 2, 36.0, "126-02-04-2401", "Treasury"),
            ("Pre-Service Teacher Residential Leadership & Outward Bound Camp", "Student Programme", "Recurrent", "Q3", 18.5, "Submitted", None, None, None, None, None),
            ("NCOE Curriculum Restructuring Alignment with 4-Year B.Ed Degree Framework", "Curriculum & Materials", "Recurrent", "Q4", 15.0, "Draft", None, None, None, None, None),
        ]
    },

    # 10. Piriven Division (user: piriven.officer)
    {
        "orgId": "org-moe-piriven",
        "orgName": "Piriven division",
        "code": "PRV",
        "username": "piriven.officer",
        "officerName": "Ven. W. Dhammarathana Thero (Director Piriven)",
        "vote": "126-02-05-1502",
        "category": "Educational Management",
        "workshops": [
            ("Piriven In-Service Teacher Training on Modern Trilingual Teaching", "English & Languages", "Completed", "2026-04-20", "2026-04-22", 60, 60, 420000, 405000, "Sri Lanka Buddhist & Pali University Hall", "org-moe"),
            ("Piriven Computer Laboratory Resource Person Pedagogy Clinic", "Information & Communication Technology", "Completed", "2026-08-12", "2026-08-14", 50, 49, 360000, 350000, "Southern Province Piriven Center", "org-prov-southern-ed"),
            ("Pali, Sanskrit & Sinhala Classical Literature Digital Manuscripts Workshop", "Educational Management", "Scheduled", "2026-12-22", "2026-12-24", 45, 0, 310000, 0, "Kandy Asgiriya Piriven Hall", "org-prov-central-ed"),
            ("Piriven Health, Nutrition & Sanitation Enhancement Masterclass", "School Health & Nutrition", "Scheduled", "2027-02-10", "2027-02-12", 55, 0, 380000, 0, "Galle Vidyaloka Piriven Hall", "org-zone-galle"),
        ],
        "proposals": [
            ("Piriven Computer Learning Centers Hardware Modernization (120 Pirivenas)", "Infrastructure & ICT", "Capital", "Q1", 42.0, "Accepted", "ACT-01", 1, 40.0, "126-02-05-1502", "Treasury"),
            ("Tri-Lingual Dictionary & Buddhist Classical Studies e-Library Digitization", "Curriculum & Materials", "Recurrent", "Q2", 15.0, "Accepted", "ACT-02", 2, 15.0, "126-02-05-1502", "Treasury"),
            ("Piriven Student Annual Skill Competitions & Dhamma Academic Festival", "Student Programme", "Recurrent", "Q3", 12.5, "Submitted", None, None, None, None, None),
            ("Clean Water & Solar Hot Water Sanitation Facilities for Resident Pirivenas", "Infrastructure & ICT", "Capital", "Q4", 26.0, "Draft", None, None, None, None, None),
        ]
    },

    # 11. National Institute of Education (user: nie.admin)
    {
        "orgId": "org-nie",
        "orgName": "National Institute of Education",
        "code": "NIE",
        "username": "nie.admin",
        "officerName": "Prof. G. Kulatunga (Director General NIE)",
        "vote": "126-02-04-2501",
        "category": "Educational Management",
        "workshops": [
            ("Postgraduate Diploma in Education (PGDE) In-Service Teacher Seminar", "Educational Management", "Completed", "2026-02-18", "2026-02-20", 90, 90, 580000, 565000, "NIE Main Auditorium, Maharagama", "org-nie"),
            ("STEM Master Teacher Practical Facilitation Bootcamp", "STEM & Science", "Completed", "2026-06-16", "2026-06-19", 70, 68, 490000, 478000, "NIE Science Laboratories", "org-nie"),
            ("Universal Design for Learning (UDL) & Inclusive Education Practicum", "Educational Management", "In Progress", "2026-11-13", "2026-11-16", 60, 58, 430000, 215000, "Southern Province Hall, Galle", "org-prov-southern"),
            ("Action Research in Classroom Pedagogy National Research Symposium", "Educational Management", "Scheduled", "2027-01-25", "2027-01-27", 100, 0, 650000, 0, "BMICH Colombo", "org-moe"),
        ],
        "proposals": [
            ("Master Trainer In-Service Certification for 2,400 Secondary Teachers", "Workshop & Training", "Recurrent", "Q1", 58.0, "Accepted", "ACT-01", 1, 58.0, "126-02-04-2501", "Treasury"),
            ("Online Teacher Education Portal (NIE MOOCs) High-Capacity Cloud Infrastructure", "Infrastructure & ICT", "Capital", "Q2", 35.0, "Accepted", "ACT-02", 2, 32.5, "126-02-04-2501", "Treasury"),
            ("National Educational Research Grants for Classroom Innovation", "Research & Innovation", "Recurrent", "Q3", 18.0, "Submitted", None, None, None, None, None),
            ("Digital Multimedia Studio Upgrades for Educational Broadcasting", "Infrastructure & ICT", "Capital", "Q4", 29.0, "Draft", None, None, None, None, None),
        ]
    },

    # 12. Southern Province Education Department (user: provincial.admin)
    {
        "orgId": "org-prov-southern",
        "orgName": "Southern Province Education Department",
        "code": "SP",
        "username": "provincial.admin",
        "officerName": "K.G. Jinadasa (Provincial Director of Education - SP)",
        "vote": "126-03-03-2502",
        "category": "Educational Management",
        "workshops": [
            ("Southern Province Zonal Education Directors Annual Review & Planning Conference", "Educational Management", "Completed", "2026-03-20", "2026-03-22", 65, 65, 460000, 445000, "Dakshinapaya, Labuduwa, Galle", "org-prov-southern"),
            ("Southern Coastal Schools Marine Environmental Science Teacher Training", "STEM & Science", "Completed", "2026-07-22", "2026-07-24", 55, 54, 380000, 370000, "Matara Zonal Education Hall", "org-prov-southern"),
            ("Galle, Matara & Hambantota Secondary Schools IT Resource Person Practicum", "Information & Communication Technology", "In Progress", "2026-11-12", "2026-11-15", 70, 68, 490000, 245000, "Southern Province IT Branch", "org-prov-southern-it"),
            ("Provincial School Leadership & Institutional Governance Workshop", "Educational Management", "Scheduled", "2026-12-15", "2026-12-17", 80, 0, 520000, 0, "Galle Town Hall Auditorium", "org-zone-galle"),
            ("Southern Province Aesthetic Music & Dance Teachers Practical Assessment", "English & Languages", "Scheduled", "2027-02-12", "2027-02-14", 60, 0, 390000, 0, "Hambantota Cultural Center", "org-prov-southern"),
        ],
        "proposals": [
            ("Southern Province 50 Secondary School Science Lab Modernization", "Infrastructure & ICT", "Capital", "Q1", 48.0, "Accepted", "ACT-01", 1, 45.0, "126-03-03-2502", "Treasury"),
            ("Provincial In-Service Teacher ICT Capacity & Smart Board Masterclass", "Workshop & Training", "Recurrent", "Q2", 21.0, "Accepted", "ACT-02", 2, 21.0, "126-03-03-2502", "Treasury"),
            ("Southern Schools Tsunami & Natural Disaster Evacuation Drills", "Student Programme", "Recurrent", "Q3", 14.5, "Submitted", None, None, None, None, None),
            ("Vocational Skills Equipment Upgrades for Under-Privileged Rural Colleges", "Infrastructure & ICT", "Capital", "Q4", 32.0, "Draft", None, None, None, None, None),
        ]
    },

    # 13. Southern Province IT Branch (user: southern.it)
    {
        "orgId": "org-prov-southern-it",
        "orgName": "Southern Province IT Branch",
        "code": "SP-IT",
        "username": "southern.it",
        "officerName": "D.M. Chandrasena (Provincial IT Coordinator)",
        "vote": "126-03-03-2502",
        "category": "Information & Communication Technology",
        "workshops": [
            ("Southern Province Computer Center Network Security & Firewall Training", "Information & Communication Technology", "Completed", "2026-04-16", "2026-04-18", 45, 45, 330000, 320000, "Southern Province IT Branch Lab", "org-prov-southern-it"),
            ("Zonal Computer Resource Center (ZCRC) Instructors Troubleshooting Clinic", "Information & Communication Technology", "Completed", "2026-08-25", "2026-08-27", 40, 39, 310000, 300000, "Galle Zonal IT Center", "org-zone-galle-it"),
            ("Provincial Smart Classroom IFP Firmware & Software Deployment", "Information & Communication Technology", "In Progress", "2026-11-13", "2026-11-16", 50, 48, 370000, 185000, "Labuduwa ICT Center", "org-prov-southern-it"),
            ("Secondary School Python & Web Development Coaching for Teachers", "Information & Communication Technology", "Scheduled", "2027-01-19", "2027-01-21", 55, 0, 380000, 0, "Matara IT Resource Center", "org-prov-southern-it"),
        ],
        "proposals": [
            ("Provincial Education Data Center High-Availability Storage Upgrade", "Infrastructure & ICT", "Capital", "Q1", 28.0, "Accepted", "ACT-01", 1, 28.0, "126-03-03-2502", "Treasury"),
            ("Broadband Internet Bandwidth Expansion for 45 Coastal Secondary Schools", "Infrastructure & ICT", "Recurrent", "Q2", 18.0, "Accepted", "ACT-02", 2, 16.5, "126-03-03-2502", "Treasury"),
            ("Robotics & Automation Kits for 15 Zonal Lead Schools in Southern Province", "Infrastructure & ICT", "Capital", "Q3", 22.0, "Submitted", None, None, None, None, None),
            ("Provincial Computer Recycling & Hardware Repair Mobile Workshop", "Other", "Recurrent", "Q4", 7.5, "Draft", None, None, None, None, None),
        ]
    },

    # 14. Galle Zonal Education Office (user: zonal.admin)
    {
        "orgId": "org-zone-galle",
        "orgName": "Galle Zonal Education Office",
        "code": "GAL",
        "username": "zonal.admin",
        "officerName": "S.K. Senaratne (Zonal Director of Education - Galle)",
        "vote": "126-03-03-2502",
        "category": "Educational Management",
        "workshops": [
            ("Galle Zonal School Principals Management Performance Review", "Educational Management", "Completed", "2026-02-20", "2026-02-22", 60, 60, 390000, 378000, "Galle Zonal Hall, Fort", "org-zone-galle"),
            ("G.C.E. O/L Academic Performance Remedial Strategies Seminar", "Educational Management", "Completed", "2026-06-25", "2026-06-27", 75, 74, 480000, 465000, "Richmond College Auditorium, Galle", "org-zone-galle"),
            ("Galle Zone Primary Education Teacher In-Service Pedagogy Camp", "Educational Management", "In Progress", "2026-11-12", "2026-11-15", 55, 52, 380000, 190000, "Southlands College Hall", "org-zone-galle"),
            ("Zonal Continuous Assessment & Test Item Construction Workshop", "Educational Management", "Scheduled", "2027-01-15", "2027-01-17", 65, 0, 410000, 0, "Mahinda College Hall", "org-zone-galle"),
        ],
        "proposals": [
            ("Galle Zonal Low-Performing Schools Targeted Subject Academic Coaching", "Workshop & Training", "Recurrent", "Q1", 16.5, "Accepted", "ACT-01", 1, 16.5, "126-03-03-2502", "Treasury"),
            ("Primary English Language Immersion Toolkits for 65 Galle Zonal Schools", "Curriculum & Materials", "Recurrent", "Q2", 12.0, "Accepted", "ACT-02", 2, 11.5, "126-03-03-2502", "Treasury"),
            ("Zonal Science Laboratory Glassware & Reagents Replenishment Pack", "Infrastructure & ICT", "Capital", "Q3", 18.5, "Submitted", None, None, None, None, None),
            ("Galle Zonal Inter-School Aesthetic & Cultural Drama Festival", "Student Programme", "Recurrent", "Q4", 8.0, "Draft", None, None, None, None, None),
        ]
    },

    # 15. Colombo Zone IT Branch (user: colombo.it)
    {
        "orgId": "org-zone-colombo-it",
        "orgName": "Colombo Zone IT Branch",
        "code": "COL-IT",
        "username": "colombo.it",
        "officerName": "A.R. Perera (Zonal IT Officer - Colombo)",
        "vote": "126-03-01-2502",
        "category": "Information & Communication Technology",
        "workshops": [
            ("Colombo Zonal Teachers Python Programming & Software Engineering", "Information & Communication Technology", "Completed", "2026-03-12", "2026-03-14", 50, 50, 360000, 350000, "Colombo IT Resource Center", "org-zone-colombo-it"),
            ("Smart Interactive Classroom Troubleshooting for Colombo City Schools", "Information & Communication Technology", "Completed", "2026-07-15", "2026-07-17", 45, 44, 320000, 310000, "Royal College IT Center", "org-zone-colombo-it"),
            ("AI-Assisted Educational Content Authoring & Canva Design Workshop", "Information & Communication Technology", "In Progress", "2026-11-13", "2026-11-16", 55, 53, 390000, 195000, "Ananda College Computer Lab", "org-zone-colombo-it"),
            ("Cyber Safety, Data Privacy & Child Online Protection in Schools", "Information & Communication Technology", "Scheduled", "2027-01-22", "2027-01-24", 60, 0, 420000, 0, "Visakha Vidyalaya Hall", "org-zone-colombo-it"),
        ],
        "proposals": [
            ("Colombo Zonal IT Resource Center Server Virtualization & Lab Upgrade", "Infrastructure & ICT", "Capital", "Q1", 24.0, "Accepted", "ACT-01", 1, 24.0, "126-03-01-2502", "Treasury"),
            ("Interactive Digital Coding Clubs in 35 Colombo Secondary Schools", "Student Programme", "Recurrent", "Q2", 14.5, "Accepted", "ACT-02", 2, 14.0, "126-03-01-2502", "Treasury"),
            ("Robotics & AI Learning Kits for Advanced Level Computer Science Classes", "Infrastructure & ICT", "Capital", "Q3", 28.0, "Submitted", None, None, None, None, None),
            ("School Website Security Audit & SSL Certificate Standardization", "Other", "Recurrent", "Q4", 6.0, "Draft", None, None, None, None, None),
        ]
    },

    # 16. Galle Zone IT Branch (user: galle.it)
    {
        "orgId": "org-zone-galle-it",
        "orgName": "Galle Zone IT Branch",
        "code": "GAL-IT",
        "username": "galle.it",
        "officerName": "N.W. Alwis (Zonal IT Officer - Galle)",
        "vote": "126-03-03-2502",
        "category": "Information & Communication Technology",
        "workshops": [
            ("Galle Zonal Primary Teachers Basic IT & Word Processing Clinic", "Information & Communication Technology", "Completed", "2026-04-22", "2026-04-24", 45, 45, 310000, 298000, "Galle Zonal IT Lab", "org-zone-galle-it"),
            ("School Computer Network Setup & Wi-Fi Configuration Masterclass", "Information & Communication Technology", "Completed", "2026-08-14", "2026-08-16", 40, 39, 290000, 280000, "Vidyaloka College Computer Lab", "org-zone-galle-it"),
            ("Digital Graphic Design & Presentation Tools for Classroom Teaching", "Information & Communication Technology", "Scheduled", "2026-12-08", "2026-12-10", 50, 0, 340000, 0, "St. Aloysius' College Hall", "org-zone-galle-it"),
            ("Micro-bit Coding & Simple Robotics for Junior Secondary Students", "Information & Communication Technology", "Scheduled", "2027-02-16", "2027-02-18", 45, 0, 320000, 0, "Galle Zonal IT Center", "org-zone-galle-it"),
        ],
        "proposals": [
            ("Galle ZCRC Computer Hardware Refresh & Power Backup Inverters", "Infrastructure & ICT", "Capital", "Q1", 21.0, "Accepted", "ACT-01", 1, 21.0, "126-03-03-2502", "Treasury"),
            ("Junior Secondary Coding Competitions & Zonal Hackathon 2027", "Student Programme", "Recurrent", "Q2", 9.5, "Accepted", "ACT-02", 2, 9.5, "126-03-03-2502", "Treasury"),
            ("Refurbishment of Obsolete School Desktops with Open-Source Linux", "Other", "Recurrent", "Q3", 7.0, "Submitted", None, None, None, None, None),
            ("Zonal Smart Classroom Digital Projection Systems Deployment", "Infrastructure & ICT", "Capital", "Q4", 18.0, "Draft", None, None, None, None, None),
        ]
    },

    # 17. Galle Zone Planning Branch (user: galle.coordinator)
    {
        "orgId": "org-zone-galle-plan",
        "orgName": "Galle Zone Planning Branch",
        "code": "GAL-PLN",
        "username": "galle.coordinator",
        "officerName": "M.K. Wickramatunga (Zonal Planning Coordinator)",
        "vote": "126-03-03-2502",
        "category": "Educational Management",
        "workshops": [
            ("Galle Zone Annual School Development Plan (SDP) Formulation Clinic", "Educational Management", "Completed", "2026-03-18", "2026-03-20", 55, 55, 370000, 360000, "Galle Zonal Hall", "org-zone-galle-plan"),
            ("School Financial Accounting & Petty Cash Regulations Training", "Educational Management", "Completed", "2026-07-20", "2026-07-22", 60, 58, 390000, 380000, "Galle Zonal Hall", "org-zone-galle-plan"),
            ("Zonal School Infrastructure Need Assessment & Survey Mapping", "Educational Management", "Scheduled", "2026-12-14", "2026-12-16", 45, 0, 310000, 0, "Galle Zonal Office", "org-zone-galle-plan"),
            ("School Quality Monitoring Indicators (SQMI) Data Verification Forum", "Educational Management", "Scheduled", "2027-02-24", "2027-02-26", 50, 0, 340000, 0, "Galle Zonal Hall", "org-zone-galle-plan"),
        ],
        "proposals": [
            ("Galle Zonal Integrated School Data Verification & Audit Fieldwork", "Monitoring & Evaluation", "Recurrent", "Q1", 14.0, "Accepted", "ACT-01", 1, 14.0, "126-03-03-2502", "Treasury"),
            ("School Development Society (SDS) Office Bearers Financial Governance Training", "Workshop & Training", "Recurrent", "Q2", 11.0, "Accepted", "ACT-02", 2, 10.5, "126-03-03-2502", "Treasury"),
            ("Galle Zonal School Infrastructure Hazard Vulnerability Mapping", "Research & Innovation", "Recurrent", "Q3", 8.5, "Submitted", None, None, None, None, None),
            ("Digital Archive of School Master Asset Registers in Galle Zone", "Infrastructure & ICT", "Capital", "Q4", 15.0, "Draft", None, None, None, None, None),
        ]
    },

    # 18. Galle Divisional Education Office (user: divisional.admin)
    {
        "orgId": "org-div-galle-galle",
        "orgName": "Galle Divisional Education Office",
        "code": "DIV-GAL",
        "username": "divisional.admin",
        "officerName": "H.L. Somadasa (Divisional Education Officer - Galle)",
        "vote": "126-03-03-2502",
        "category": "Educational Management",
        "workshops": [
            ("Galle Division Primary School Teachers Activity-Based Pedagogy", "Educational Management", "Completed", "2026-04-10", "2026-04-12", 45, 45, 310000, 298000, "Divisional Office Hall, Fort", "org-div-galle-galle"),
            ("Grade 5 Scholarship Examination Remedial Learning & Guidance Camp", "Educational Management", "Completed", "2026-08-18", "2026-08-20", 50, 49, 340000, 330000, "Southlands College Primary Section", "org-div-galle-galle"),
            ("Divisional School Attendance Tracking & Dropout Prevention Forum", "Educational Management", "Scheduled", "2026-12-04", "2026-12-06", 40, 0, 280000, 0, "Galle Divisional Hall", "org-div-galle-galle"),
            ("Early Childhood & Primary Transition Learning Materials Exhibition", "Educational Management", "Scheduled", "2027-01-28", "2027-01-30", 50, 0, 320000, 0, "Vidyaloka College Hall", "org-div-galle-galle"),
        ],
        "proposals": [
            ("Galle Divisional Primary School Phonics & Storybook Mobile Library", "Curriculum & Materials", "Recurrent", "Q1", 9.5, "Accepted", "ACT-01", 1, 9.5, "126-03-03-2502", "Treasury"),
            ("Remedial Sinhala & Tamil Second National Language Teacher Training", "Workshop & Training", "Recurrent", "Q2", 7.5, "Accepted", "ACT-02", 2, 7.5, "126-03-03-2502", "Treasury"),
            ("Primary Classroom Toy Kits & Manipulative Mathematics Toolkits", "Curriculum & Materials", "Recurrent", "Q3", 6.0, "Submitted", None, None, None, None, None),
            ("Divisional School Sports Day Equipment Pack for Rural Primary Units", "Student Programme", "Recurrent", "Q4", 5.0, "Draft", None, None, None, None, None),
        ]
    },

    # 19. MOE Data Management Branch (users: admin, data.management, data, data.officer)
    {
        "orgId": "org-moe-data",
        "orgName": "MOE Data Management Branch",
        "code": "DAT",
        "username": "data.management",
        "officerName": "M.D. Silva (Chief Statistician)",
        "vote": "126-01-01-1403",
        "category": "Educational Management",
        "workshops": [
            ("EMIS 2.0 Real-Time Attendance & Teacher Ledger Provincial Training", "Information & Communication Technology", "Completed", "2026-03-08", "2026-03-10", 65, 65, 430000, 420000, "MoE Data Center", "org-moe-data"),
            ("National School Annual Census Data Validation & Quality Control", "Educational Management", "Completed", "2026-07-12", "2026-07-14", 70, 69, 480000, 468000, "Southern Province Education Hall", "org-prov-southern"),
            ("Integrated Educational Spatial Analytics & GIS School Mapping Seminar", "Information & Communication Technology", "In Progress", "2026-11-13", "2026-11-16", 50, 48, 380000, 190000, "Western Province ICT Center", "org-prov-western-ed"),
            ("Automated Examination Database Integration & Registry Synchronization", "Information & Communication Technology", "Scheduled", "2027-01-12", "2027-01-14", 55, 0, 390000, 0, "Isurupaya Computer Lab", "org-moe"),
        ],
        "proposals": [
            ("National EMIS 2.0 Distributed Cloud Infrastructure & Data Lakehouse", "Infrastructure & ICT", "Capital", "Q1", 48.0, "Accepted", "ACT-01", 1, 48.0, "126-01-01-1403", "Treasury"),
            ("GIS Spatial Analytics & School Infrastructure Disparity Mapping Portal", "Monitoring & Evaluation", "Capital", "Q2", 19.5, "Accepted", "ACT-02", 2, 19.5, "126-01-01-1403", "Treasury"),
            ("Automated Examination Results Telemetry & Verification Interconnect", "Infrastructure & ICT", "Capital", "Q3", 22.0, "Submitted", None, None, None, None, None),
            ("Annual National School Statistics Official Handbook Publication", "Other", "Recurrent", "Q4", 8.5, "Draft", None, None, None, None, None),
        ]
    },

    # 20. Ministry of Education Apex (users: superadmin, moe.admin)
    {
        "orgId": "org-moe",
        "orgName": "Ministry of Education",
        "code": "MOE",
        "username": "superadmin",
        "officerName": "Secretary to the Ministry of Education",
        "vote": "126-01-01-1001",
        "category": "Educational Management",
        "workshops": [
            ("National General Education Sector Multi-Year Strategic Summit", "Educational Management", "Completed", "2026-01-20", "2026-01-22", 120, 120, 850000, 830000, "BMICH Main Convention Center, Colombo", "org-moe"),
            ("Provincial Chief Secretaries & Education Secretaries Governance Review", "Educational Management", "Completed", "2026-05-15", "2026-05-17", 85, 84, 620000, 605000, "MoE Auditorium, Isurupaya", "org-moe"),
            ("National Teacher Cadre Policy & Recruitment Rationalization Forum", "Educational Management", "Scheduled", "2026-12-20", "2026-12-22", 95, 0, 690000, 0, "MoE Auditorium, Isurupaya", "org-moe"),
            ("International Development Partners (World Bank/ADB/UNICEF) Review", "Educational Management", "Scheduled", "2027-02-10", "2027-02-12", 70, 0, 550000, 0, "Hilton Colombo Grand Ballroom", "org-moe"),
        ],
        "proposals": [
            ("Education Sector Contingency & Disaster Emergency Relief Reserve", "Other", "Recurrent", "Q1", 75.0, "Accepted", "ACT-01", 1, 75.0, "126-01-01-1001", "Treasury"),
            ("National Teacher Excellence Awards & Educational Innovation Fellowship", "Student Programme", "Recurrent", "Q2", 25.0, "Accepted", "ACT-02", 2, 25.0, "126-01-01-1001", "Treasury"),
            ("Apex Policy Monitoring & Independent Education Advisory Commission", "Monitoring & Evaluation", "Recurrent", "Q3", 18.0, "Submitted", None, None, None, None, None),
        ]
    }
]

def main():
    print("=== STARTING COMPREHENSIVE SEEDING FOR ALL USER LOGON LEVELS ===")
    db = load_db()

    # 1. Update Resource Persons
    print("1. Updating Resource Persons Catalog...")
    db['resourcePersons'] = ENRICHED_RESOURCE_PERSONS
    print(f"   ✓ Loaded {len(db['resourcePersons'])} realistic national experts and master trainers.")

    # 2. Enrich Workshops
    print("2. Enriching Workshops for All Branches & Levels...")
    existing_ws = db.get('workshops', [])
    existing_ws_titles = {w.get('title') for w in existing_ws}
    
    new_workshops = []
    rp_ids = [rp['id'] for rp in ENRICHED_RESOURCE_PERSONS]
    
    for prof in BRANCH_PROFILES:
        org_id = prof['orgId']
        org_name = prof['orgName']
        code = prof['code']
        uname = prof['username']
        officer = prof['officerName']
        vote = prof['vote']
        
        for w_item in prof['workshops']:
            title, subj, status, start_d, end_d, exp_tr, act_tr, est_cost, act_cost, venue, place_id = w_item
            if title in existing_ws_titles:
                continue
            
            ws_id = str(uuid.uuid4())
            ws_num = f"MOE/{code}/{start_d.replace('-', '')}/{len(existing_ws) + len(new_workshops) + 1:04d}"
            
            # Realistic object code breakdown
            v_amt = int(est_cost * 0.20)
            m_amt = int(est_cost * 0.35)
            t_amt = int(est_cost * 0.15)
            mat_amt = int(est_cost * 0.12)
            rp_amt = int(est_cost * 0.10)
            cont_amt = est_cost - (v_amt + m_amt + t_amt + mat_amt + rp_amt)
            
            b_breakdown = {
                "venue": v_amt,
                "meals": m_amt,
                "transport": t_amt,
                "materials": mat_amt,
                "rpFees": rp_amt,
                "contingencies": cont_amt,
                "total": est_cost
            }
            
            e_breakdown = None
            if status in ['Completed', 'In Progress']:
                paid_total = act_cost
                e_v = int(paid_total * 0.20)
                e_m = int(paid_total * 0.35)
                e_t = int(paid_total * 0.15)
                e_mat = int(paid_total * 0.12)
                e_rp = int(paid_total * 0.10)
                e_cont = paid_total - (e_v + e_m + e_t + e_mat + e_rp)
                e_breakdown = {
                    "venue": e_v,
                    "meals": e_m,
                    "transport": e_t,
                    "materials": e_mat,
                    "rpFees": e_rp,
                    "contingencies": e_cont,
                    "total": paid_total
                }
            
            # Days calculation
            d_start = datetime.strptime(start_d, "%Y-%m-%d").date()
            d_end = datetime.strptime(end_d, "%Y-%m-%d").date()
            days = (d_end - d_start).days + 1
            
            # Selected Resource Person
            assigned_rp = random.choice(rp_ids)
            
            ws_obj = {
                "id": ws_id,
                "workshopNumber": ws_num,
                "title": title,
                "subject": subj,
                "branch": org_name,
                "organizingOrgId": org_id,
                "targetLevel": "province" if "prov" in org_id else "zone" if "zone" in org_id else "national",
                "targetOrgId": org_id,
                "targetPath": [org_id],
                "placeId": place_id,
                "placeName": venue,
                "venue": venue,
                "startDate": start_d,
                "endDate": end_d,
                "daysHeld": days,
                "status": status,
                "statusId": f"status-{status.lower().replace(' ', '-')}",
                "statusName": status,
                "confirmationStatus": "Confirmed",
                "expectedTrainees": exp_tr,
                "actualTrainees": act_tr,
                "aim": f"Deliver structured national pedagogical benchmarks for {subj} adhering to MoE Curriculum circulars.",
                "expectedOutput": f"Certified cadre of {exp_tr} educators ready to implement modular competencies in schools.",
                "fundingSource": "Government of Sri Lanka Consolidated Fund (Treasury)",
                "objectCode": "1101",
                "voteNumber": vote,
                "budgetBreakdown": b_breakdown,
                "expenditureBreakdown": e_breakdown,
                "actualPaid": act_cost if status in ['Completed', 'In Progress'] else 0,
                "commitments": int(est_cost * 0.05) if status == 'Scheduled' else 0,
                "isSelfOrganized": False,
                "rescheduleCount": 1 if status == 'Rescheduled' else 0,
                "lastRescheduledAt": "2026-10-18T10:00:00.000Z" if status == 'Rescheduled' else None,
                "lastRescheduleReason": "Academic calendar term examination date conflict" if status == 'Rescheduled' else None,
                "assignedResourcePersonId": assigned_rp,
                "year": "2026" if start_d.startswith("2026") else "2027",
                "createdBy": f"user-{uname.replace('.', '-')}",
                "creatorName": org_name,
                "createdAt": "2026-09-15T08:00:00.000Z",
                "updatedAt": datetime.utcnow().isoformat() + "Z"
            }
            new_workshops.append(ws_obj)

    db['workshops'] = existing_ws + new_workshops
    print(f"   ✓ Added {len(new_workshops)} new multi-level workshops (Total workshops: {len(db['workshops'])})")

    # 3. Enrich Budget Proposals (FY 2027)
    print("3. Enriching Budget Proposals (FY 2027) for All Branches & Levels...")
    existing_props = db.get('budgetProposalActivities', [])
    existing_prop_titles = {p.get('activityTitle') for p in existing_props}
    
    new_proposals = []
    
    for prof in BRANCH_PROFILES:
        org_id = prof['orgId']
        org_name = prof['orgName']
        uname = prof['username']
        
        for p_item in prof['proposals']:
            title = p_item[0]
            cat = p_item[1]
            nature = p_item[2]
            qtr = p_item[3]
            est_mn = p_item[4]
            status = p_item[5]
            
            act_code = p_item[6] if len(p_item) > 6 else None
            act_num = p_item[7] if len(p_item) > 7 else None
            alloc_mn = p_item[8] if len(p_item) > 8 else None
            vote = p_item[9] if len(p_item) > 9 else None
            funding = p_item[10] if len(p_item) > 10 else None
            remarks = p_item[11] if len(p_item) > 11 else None
            
            if title in existing_prop_titles:
                continue
            
            prop_id = f"prop-2027-{uuid.uuid4().hex[:8]}"
            prop_obj = {
                "id": prop_id,
                "financialYear": "2027",
                "implementationYear": "2027",
                "divisionId": org_id,
                "divisionName": org_name,
                "institutionId": "org-moe",
                "institutionName": "Ministry of Education",
                "activityTitle": title,
                "category": cat,
                "expenditureNature": nature,
                "implementationPeriod": qtr,
                "purpose": f"Fulfill MoE 2026-2030 MTESDP Pillar commitments for {cat} and school equity.",
                "expectedOutputs": f"Targeted delivery of {cat} resources across provincial collegiate and primary schools.",
                "keyDeliverables": f"Audited implementation reports, teacher guides, and monitored asset delivery registers.",
                "estimatedCostMn": est_mn,
                "status": status,
                "submittedBy": uname,
                "submittedAt": "2026-10-25T14:30:00.000Z",
                "activityNumber": act_num,
                "assignedActivityCode": act_code,
                "allocatedAmountMn": alloc_mn,
                "adjustedCostMn": alloc_mn if status == 'Accepted' else (est_mn * 0.9 if status == 'Adjusted' else None),
                "assignedVoteNumber": vote,
                "assignedFundingSource": funding or "Treasury Consolidated Fund",
                "assignedObjectCode": "2502" if nature == 'Capital' else "1402",
                "reviewRemarks": remarks,
                "includedInBudgetSpeech": True if status == 'Accepted' and est_mn >= 35.0 else False,
                "isExtensionOfPreviousAip": False,
                "isStrategicVisionAddition": False,
                "beneficiaryCount": random.randint(120, 2500),
                "targetBeneficiaries": "Educators, In-Service Advisors, and Secondary Collegiate Students",
                "proposedExecutingAgencyType": "Self (Branch)",
                "updatedAt": datetime.utcnow().isoformat() + "Z"
            }
            new_proposals.append(prop_obj)
            
    db['budgetProposalActivities'] = existing_props + new_proposals
    print(f"   ✓ Added {len(new_proposals)} new budget proposals (Total proposals: {len(db['budgetProposalActivities'])})")

    # 4. Enrich AIP Activities (FY 2026 and FY 2027)
    print("4. Enriching AIP Activities for All Branches & Levels...")
    existing_aip = db.get('aipActivities', [])
    existing_aip_acts = {a.get('activity') for a in existing_aip}
    
    new_aip = []
    
    for prof in BRANCH_PROFILES:
        org_id = prof['orgId']
        org_name = prof['orgName']
        uname = prof['username']
        officer = prof['officerName']
        vote = prof['vote']
        
        # Link accepted proposals to AIP activities for 2027, and create historical 2026 AIP activities
        for p_item in prof['proposals']:
            title = p_item[0]
            est_mn = p_item[4]
            status = p_item[5]
            
            if status != 'Accepted':
                continue
            if title in existing_aip_acts:
                continue
                
            act_id = f"act-{uuid.uuid4()}"
            q1_mn = round(est_mn * 0.25, 2)
            q2_mn = round(est_mn * 0.30, 2)
            q3_mn = round(est_mn * 0.25, 2)
            q4_mn = round(est_mn - (q1_mn + q2_mn + q3_mn), 2)
            
            # Monthly distribution
            m_fin = [round(est_mn / 12, 2) for _ in range(12)]
            m_phys = ["8", "8", "9", "8", "8", "9", "8", "8", "9", "8", "8", "9"]
            
            aip_obj = {
                "id": act_id,
                "planId": f"plan-{org_id}-2027",
                "branchId": org_id,
                "branchName": org_name,
                "year": "2027",
                "outputNo": "1",
                "activityCode": str(len(new_aip) + 1),
                "activity": title,
                "responsibleOfficer": officer,
                "voteNumber": vote,
                "estimatedCost": est_mn,
                "targetQ1": "25%",
                "targetQ2": "55%",
                "targetQ3": "80%",
                "targetQ4": "100%",
                "financialQ1": q1_mn,
                "financialQ2": q2_mn,
                "financialQ3": q3_mn,
                "financialQ4": q4_mn,
                "physicalMonths": m_phys,
                "financialMonths": m_fin,
                "physicalProgress": "0%",
                "physicalProgressPct": "0%",
                "financialProgress": 0,
                "financialProgressPct": "0%",
                "remarks": "Formally accepted into FY 2027 Annual Implementation Plan.",
                "createdBy": f"user-{uname.replace('.', '-')}",
                "creatorName": org_name,
                "createdAt": "2026-10-30T09:00:00.000Z",
                "updatedAt": datetime.utcnow().isoformat() + "Z"
            }
            new_aip.append(aip_obj)

    db['aipActivities'] = existing_aip + new_aip
    print(f"   ✓ Added {len(new_aip)} new AIP activities (Total AIP activities: {len(db['aipActivities'])})")

    # 5. Ensure All Users Have Proper Designations and Emails
    print("5. Normalizing User Directory...")
    for u in db.get('users', []):
        for prof in BRANCH_PROFILES:
            if u['username'] == prof['username']:
                u['organizationId'] = prof['orgId']
                u['designation'] = prof['officerName']
                if 'email' not in u or not u['email']:
                    u['email'] = f"{prof['username']}@moe.gov.lk"
                u['isActive'] = True
    print("   ✓ User profiles updated and normalized.")

    # Save to disk
    save_db(db)
    print("=== SEEDING COMPLETED SUCCESSFULLY! ===")

if __name__ == '__main__':
    main()
