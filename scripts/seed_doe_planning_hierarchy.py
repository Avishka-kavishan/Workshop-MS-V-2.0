import json
import os
import bcrypt
from datetime import datetime

DB_PATH = r"D:\Data\Tests\plan\Workshop-MS-TEST\data\database.json"

def get_hash(pwd="123"):
    return bcrypt.hashpw(pwd.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def main():
    with open(DB_PATH, "r", encoding="utf-8") as f:
        db = json.load(f)

    now = datetime.utcnow().isoformat() + "Z"
    pwd_hash = get_hash("123")

    # 1. Ensure DOE parent organization exists
    doe_parent = next((o for o in db["organizations"] if o["id"] == "org-doe"), None)
    if not doe_parent:
        doe_parent = {
            "id": "org-doe",
            "name": "Department of Examinations (DoE)",
            "code": "DOE",
            "parentId": "org-moe",
            "typeId": "ot-doe",
            "level": 2,
            "isActive": True,
            "createdAt": now
        }
        db["organizations"].append(doe_parent)
    else:
        doe_parent["typeId"] = "ot-doe"
        doe_parent["level"] = 2
        doe_parent["isActive"] = True

    # 2. Add DOE branches
    doe_branches = [
        {
            "id": "org-doe-planning",
            "name": "Department of Examinations Planning & Research Branch",
            "code": "DOE-PLAN",
            "parentId": "org-doe",
            "typeId": "ot-branch",
            "functionalCategory": "Planning",
            "level": 2,
            "isActive": True,
            "description": "Formulation, monitoring and evaluation of National Examination Implementation Plans (AIP) for DoE branches.",
            "createdAt": now
        },
        {
            "id": "org-doe-eval",
            "name": "DOE School Examinations & Assessment Evaluation Branch",
            "code": "DOE-EVAL",
            "parentId": "org-doe",
            "typeId": "ot-branch",
            "functionalCategory": "Normal",
            "level": 2,
            "isActive": True,
            "description": "Administration, chief examiner coordination, evaluation panels and score standardizations for GCE O/L & A/L examinations.",
            "createdAt": now
        },
        {
            "id": "org-doe-confidential",
            "name": "DOE Confidential, Testing & Question Bank Branch",
            "code": "DOE-CONF",
            "parentId": "org-doe",
            "typeId": "ot-branch",
            "functionalCategory": "Normal",
            "level": 2,
            "isActive": True,
            "description": "Secure question bank formulation, confidential printing oversight and psychometric moderation.",
            "createdAt": now
        },
        {
            "id": "org-doe-tech",
            "name": "DOE Technology & Examination Systems Branch",
            "code": "DOE-TECH",
            "parentId": "org-doe",
            "typeId": "ot-branch",
            "functionalCategory": "Normal",
            "level": 2,
            "isActive": True,
            "description": "Computerized marking portal, candidate registration platform and optical mark recognition systems.",
            "createdAt": now
        },
        {
            "id": "org-doe-admin",
            "name": "DOE Logistics & Marking Operations Branch",
            "code": "DOE-OPS",
            "parentId": "org-doe",
            "typeId": "ot-branch",
            "functionalCategory": "Normal",
            "level": 2,
            "isActive": True,
            "description": "Logistics, transport of confidential materials, regional evaluation center facilities and supervisor coordination.",
            "createdAt": now
        }
    ]

    for b in doe_branches:
        existing = next((o for o in db["organizations"] if o["id"] == b["id"]), None)
        if not existing:
            db["organizations"].append(b)
            print(f"Added organization: {b['name']} ({b['id']})")
        else:
            existing.update(b)
            print(f"Updated organization: {b['name']} ({b['id']})")

    # 3. Add DOE users
    new_users = [
        {
            "id": "user-doe-planning",
            "username": "doe.planning",
            "email": "doe.planning@doe.gov.lk",
            "passwordHash": pwd_hash,
            "fullName": "K.L. Jayawardena",
            "designation": "Director (Planning & Research) - Department of Examinations",
            "organizationId": "org-doe-planning",
            "roleId": "role-planning-officer",
            "functionalCategory": "Planning",
            "adminLevel": 2,
            "isActive": True,
            "createdAt": now
        },
        {
            "id": "user-doe-eval",
            "username": "doe.officer",
            "email": "doe.officer@doe.gov.lk",
            "passwordHash": pwd_hash,
            "fullName": "S.M. Wickramasinghe",
            "designation": "Assistant Commissioner (Evaluation)",
            "organizationId": "org-doe-eval",
            "roleId": "role-moe-officer",
            "functionalCategory": "Normal",
            "adminLevel": 2,
            "isActive": True,
            "createdAt": now
        },
        {
            "id": "user-doe-tech",
            "username": "doe.tech",
            "email": "doe.tech@doe.gov.lk",
            "passwordHash": pwd_hash,
            "fullName": "N. Perera",
            "designation": "Senior Systems Engineer (DOE IT)",
            "organizationId": "org-doe-tech",
            "roleId": "role-moe-officer",
            "functionalCategory": "Normal",
            "adminLevel": 2,
            "isActive": True,
            "createdAt": now
        }
    ]

    for u in new_users:
        existing = next((usr for usr in db["users"] if usr["username"] == u["username"]), None)
        if not existing:
            db["users"].append(u)
            print(f"Added user: {u['username']} ({u['email']})")
        else:
            existing.update(u)
            print(f"Updated user: {u['username']} ({u['email']})")

    # 4. Pre-seed Voted Plans & Activities for DOE Branches (FY 2027)
    # 4a. org-doe-eval Plan
    plan_eval_id = "plan-doe-eval-2027"
    existing_plan_eval = next((p for p in db.get("aipPlans", []) if p["id"] == plan_eval_id or (p["branchId"] == "org-doe-eval" and p["year"] == "2027" and p.get("amendmentNumber", 0) == 0)), None)
    
    if not existing_plan_eval:
        plan_eval = {
            "id": plan_eval_id,
            "branchId": "org-doe-eval",
            "branchName": "DOE School Examinations & Assessment Evaluation Branch",
            "year": "2027",
            "amendmentNumber": 0,
            "phaseTitle": "3. Implementation Phase",
            "targetTitle": "Overall Physical and Financial Targets 2027 - National Evaluation Operations",
            "mainResponsibility": "S.M. Wickramasinghe (Assistant Commissioner)",
            "mainContactNo": "+94 11 2785211",
            "overallResponsibility": "Commissioner General of Examinations",
            "overallContactNo": "+94 11 2785210",
            "isDispatchedToBranch": True,
            "dispatchedAt": now,
            "dispatchedBy": "Department Planning Division",
            "dispatchNotes": "Treasury Approved Head 126 Programme 02 Project 08 Vote allocations dispatched for FY 2027 GCE examination evaluation cycles.",
            "status": "Draft",
            "createdAt": now,
            "updatedAt": now
        }
        if "aipPlans" not in db:
            db["aipPlans"] = []
        db["aipPlans"].append(plan_eval)
        print("Created AIP Plan for org-doe-eval")

    # Activities for org-doe-eval
    eval_acts = [
        {
            "id": "act-doe-eval-01",
            "planId": plan_eval_id,
            "branchId": "org-doe-eval",
            "branchName": "DOE School Examinations & Assessment Evaluation Branch",
            "year": "2027",
            "amendmentNumber": 0,
            "outputNo": "1",
            "activityCode": "1",
            "activity": "National GCE A/L & O/L Chief Examiner Standardization & Moderation Workshops",
            "voteNumber": "126-02-08-2104",
            "estimatedCost": 28.5,
            "financialMonths": [2.5, 2.5, 3.0, 2.0, 2.5, 3.0, 2.5, 3.0, 2.5, 2.0, 1.5, 1.5],
            "physicalMonths": ["10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "95%", "100%", "100%"],
            "financialQ1": 8.0,
            "financialQ2": 15.5,
            "financialQ3": 23.5,
            "financialQ4": 28.5,
            "targetQ1": "30%",
            "targetQ2": "60%",
            "targetQ3": "85%",
            "targetQ4": "100%",
            "responsibleOfficer": "Assistant Commissioner (Evaluation)",
            "remarks": "Treasury Voted recurrent vote 126-02-08-2104 for island-wide panel conventions.",
            "proposalId": "bp-doe-01",
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": "act-doe-eval-02",
            "planId": plan_eval_id,
            "branchId": "org-doe-eval",
            "branchName": "DOE School Examinations & Assessment Evaluation Branch",
            "year": "2027",
            "amendmentNumber": 0,
            "outputNo": "1",
            "activityCode": "2",
            "activity": "Provincial Evaluation & Marking Center Supervisory Logistics & Quality Assurance",
            "voteNumber": "126-02-08-2104",
            "estimatedCost": 34.0,
            "financialMonths": [2.0, 3.0, 4.0, 3.0, 3.0, 3.5, 3.5, 3.5, 3.5, 2.5, 1.5, 1.0],
            "physicalMonths": ["5%", "15%", "30%", "40%", "55%", "65%", "75%", "85%", "90%", "95%", "100%", "100%"],
            "financialQ1": 9.0,
            "financialQ2": 18.5,
            "financialQ3": 29.0,
            "financialQ4": 34.0,
            "targetQ1": "25%",
            "targetQ2": "50%",
            "targetQ3": "75%",
            "targetQ4": "100%",
            "responsibleOfficer": "Superintendent of Examinations",
            "remarks": "Covers 112 regional marking centres across 9 provinces.",
            "proposalId": "bp-doe-02",
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": "act-doe-eval-03",
            "planId": plan_eval_id,
            "branchId": "org-doe-eval",
            "branchName": "DOE School Examinations & Assessment Evaluation Branch",
            "year": "2027",
            "amendmentNumber": 0,
            "outputNo": "2",
            "activityCode": "3",
            "activity": "Top-Down Directive: Psychometric Item Analysis & Digital Diagnostic Score Reporting",
            "voteNumber": "126-02-08-2502",
            "estimatedCost": 18.0,
            "financialMonths": [1.0, 1.0, 1.5, 1.5, 2.0, 2.0, 2.0, 2.0, 2.0, 1.5, 1.0, 0.5],
            "physicalMonths": ["5%", "10%", "20%", "35%", "50%", "65%", "75%", "85%", "90%", "95%", "100%", "100%"],
            "financialQ1": 3.5,
            "financialQ2": 9.0,
            "financialQ3": 15.0,
            "financialQ4": 18.0,
            "targetQ1": "20%",
            "targetQ2": "50%",
            "targetQ3": "80%",
            "targetQ4": "100%",
            "responsibleOfficer": "Research Officer (Testing)",
            "isAddedByPlanning": True,
            "planningNotes": "National assessment quality mandate issued by Department of Examinations Planning Division.",
            "planningOfficerName": "K.L. Jayawardena",
            "remarks": "Top-down policy priority for computerized diagnostic feedback to schools.",
            "createdAt": now,
            "updatedAt": now
        }
    ]

    if "aipActivities" not in db:
        db["aipActivities"] = []

    for a in eval_acts:
        existing = next((act for act in db["aipActivities"] if act["id"] == a["id"]), None)
        if not existing:
            db["aipActivities"].append(a)
            print(f"Added activity: {a['activityCode']} - {a['activity'][:40]}")
        else:
            existing.update(a)

    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)

    print("Successfully seeded DOE organizations, users, and baseline AIP activities!")

if __name__ == "__main__":
    main()
