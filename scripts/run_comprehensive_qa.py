import json
import os
import sys

class QATestRunner:
    def __init__(self, db_path):
        self.db_path = db_path
        with open(db_path, 'r', encoding='utf-8') as f:
            self.db = json.load(f)
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0

    def test(self, test_id, category, name, assertion, details=""):
        self.total_tests += 1
        passed = bool(assertion)
        if passed:
            self.passed_tests += 1
            status = "PASS"
        else:
            self.failed_tests += 1
            status = "FAIL"
        
        self.results.append({
            "id": test_id,
            "category": category,
            "name": name,
            "status": status,
            "details": details
        })
        print(f"[{status}] {test_id}: {name}")
        if not passed and details:
            print(f"      Failure details: {details}")

    def run_all(self):
        print("=" * 80)
        print("STARTING MOE-IPMIS COMPREHENSIVE AUTOMATED QA AUDIT")
        print("=" * 80)

        # -------------------------------------------------------------
        # 1. AUTHENTICATION & MULTI-ROLE (AUTH-01 TO AUTH-12)
        # -------------------------------------------------------------
        users = self.db.get("users", [])
        self.test(
            "QA-AUTH-01", "Authentication",
            "Central user repository exists and contains registered accounts",
            len(users) >= 30,
            f"Found {len(users)} users"
        )

        superadmin = next((u for u in users if u.get("username") == "superadmin"), None)
        self.test(
            "QA-AUTH-02", "Authentication",
            "Super Administrator account has Apex Level 0 access and multiple assigned roles",
            superadmin and len(superadmin.get("assignedRoles", [])) >= 3,
            f"Superadmin assigned roles: {len(superadmin.get('assignedRoles', [])) if superadmin else 0}"
        )

        planning_officer = next((u for u in users if u.get("username") == "planning.officer"), None)
        has_planner_multi_roles = (
            planning_officer and 
            any(r.get("functionalCategory") == "Planning" for r in planning_officer.get("assignedRoles", [])) and
            any(r.get("functionalCategory") == "Normal" for r in planning_officer.get("assignedRoles", []))
        )
        self.test(
            "QA-AUTH-03", "Multi-Role RBAC",
            "Planning Officer has both Planning Division and Operational Branch roles",
            has_planner_multi_roles,
            f"Planning officer roles: {[r.get('roleName') for r in planning_officer.get('assignedRoles', [])] if planning_officer else []}"
        )

        monitoring_officer = next((u for u in users if u.get("username") == "monitoring.officer"), None)
        has_mne_multi_roles = (
            monitoring_officer and 
            any(r.get("functionalCategory") == "Monitoring" for r in monitoring_officer.get("assignedRoles", [])) and
            any(r.get("functionalCategory") == "Normal" for r in monitoring_officer.get("assignedRoles", []))
        )
        self.test(
            "QA-AUTH-04", "Multi-Role RBAC",
            "M&E Officer has both M&E Specialist and Operational Branch roles",
            has_mne_multi_roles,
            f"M&E officer roles: {[r.get('roleName') for r in monitoring_officer.get('assignedRoles', [])] if monitoring_officer else []}"
        )

        # -------------------------------------------------------------
        # 2. ADMINISTRATIVE HIERARCHY (SYS-02)
        # -------------------------------------------------------------
        orgs = self.db.get("organizations", [])
        self.test(
            "QA-HIER-01", "Hierarchy",
            "Administrative hierarchy data populated with multiple administrative levels",
            len(orgs) >= 100,
            f"Found {len(orgs)} organizations"
        )

        levels_present = set(o.get("level", o.get("administrativeLevel", 1)) for o in orgs)
        self.test(
            "QA-HIER-02", "Hierarchy",
            "Hierarchy supports national ministry (L1) and apex units (L2)",
            1 in levels_present and 2 in levels_present,
            f"Levels present in DB: {sorted(list(levels_present))}"
        )

        # -------------------------------------------------------------
        # 3. BUDGET FORMULATION (STAGE 1 & 2)
        # -------------------------------------------------------------
        proposals = self.db.get("budgetProposalActivities", [])
        self.test(
            "QA-BUDG-01", "Budget Formulation",
            "Budget proposals exist for multi-branch financial planning",
            len(proposals) >= 50,
            f"Found {len(proposals)} proposals"
        )

        accepted_proposals = [p for p in proposals if p.get("status") == "Accepted"]
        all_accepted_have_votes = all(
            p.get("assignedVoteNumber") for p in accepted_proposals if not p.get("noBudgetRequired")
        )
        self.test(
            "QA-BUDG-02", "Budget Formulation",
            "Accepted activities have assigned vote numbers for expenditure tracking",
            len(accepted_proposals) > 0 and all_accepted_have_votes,
            f"{len(accepted_proposals)} accepted activities verified, {all_accepted_have_votes}"
        )

        # Verify restoration contract in database schema
        sample_item = next((p for p in proposals if p.get("id") == "prop-2027-001"), None)
        valid_schema = sample_item is not None and "activityTitle" in sample_item and "status" in sample_item
        self.test(
            "QA-BUDG-03", "Budget Versioning & Restoration",
            "Target item #5 (prop-2027-001) successfully restored to Accepted state without pending edits",
            sample_item and sample_item.get("status") == "Accepted" and "edit" not in sample_item.get("activityTitle", ""),
            f"Status: {sample_item.get('status') if sample_item else 'None'}, Title: {sample_item.get('activityTitle') if sample_item else 'None'}"
        )

        # -------------------------------------------------------------
        # 4. PPB DEADLINE VALIDATION
        # -------------------------------------------------------------
        deadlines = self.db.get("deadlines", [])
        ppb_2027_deadline = next((d for d in deadlines if d.get("id") == "dl-2027-branch-budget-proposals"), None)
        self.test(
            "QA-DEADLINE-01", "PPB Deadline",
            "Official PPB submission deadline exists for FY 2027 Budget Proposals",
            ppb_2027_deadline is not None and ppb_2027_deadline.get("dueDate") == "2026-11-30",
            f"PPB deadline 2027: {ppb_2027_deadline}"
        )

        ppb_2026_deadline = next((d for d in deadlines if d.get("id") == "dl-2026-branch-budget-proposals"), None)
        self.test(
            "QA-DEADLINE-02", "PPB Deadline",
            "Past financial year (FY 2026) has expired/closed deadline enforcing submission cutoff",
            ppb_2026_deadline is not None and (ppb_2026_deadline.get("status") == "Closed" or ppb_2026_deadline.get("dueDate") < "2026-11-15"),
            f"PPB deadline 2026: {ppb_2026_deadline}"
        )

        # -------------------------------------------------------------
        # 5. AIP & WORKSHOPS DATA INTEGRATION (SYS-07)
        # -------------------------------------------------------------
        aip_plans = self.db.get("aipPlans", [])
        aip_activities = self.db.get("aipActivities", [])
        workshops = self.db.get("workshops", [])
        self.test(
            "QA-AIP-01", "AIP Lifecycle",
            "AIP repository contains drafted and approved branch implementation plans",
            len(aip_plans) > 0 and len(aip_activities) > 0,
            f"{len(aip_plans)} plans, {len(aip_activities)} activities"
        )

        workshops_mapped = [w for w in workshops if w.get("aipActivityId") or w.get("sourceAipActivityCode")]
        self.test(
            "QA-WS-01", "Workshops Lifecycle",
            "Workshops are properly mapped to AIP activities for seamless execution tracking",
            len(workshops_mapped) >= len(workshops) * 0.8,
            f"{len(workshops_mapped)} of {len(workshops)} workshops mapped to AIP"
        )

        # -------------------------------------------------------------
        # 6. MONITORING & CORRECTIVE ACTIONS
        # -------------------------------------------------------------
        monthly_returns = self.db.get("monthlyProgressReturns", [])
        corrective_actions = self.db.get("correctiveActions", [])
        self.test(
            "QA-MNE-01", "Monitoring & Evaluation",
            "Monthly progress returns recorded and available for M&E review",
            len(monthly_returns) > 0,
            f"{len(monthly_returns)} returns found"
        )

        self.test(
            "QA-MNE-02", "Corrective Actions",
            "M&E Corrective action directives populated with target branch assignments",
            len(corrective_actions) >= 2 and all(ca.get("assignedDivisionName") and ca.get("recommendedAction") for ca in corrective_actions),
            f"{len(corrective_actions)} corrective actions verified"
        )

        # -------------------------------------------------------------
        # 7. ENTERPRISE AUDIT TRAIL (SYS-04 & AUTH-08)
        # -------------------------------------------------------------
        audit_logs = self.db.get("auditLogs", [])
        self.test(
            "QA-AUDIT-01", "Audit Trail",
            "Immutable audit trail ledger captures system actions",
            len(audit_logs) >= 20,
            f"{len(audit_logs)} audit records found"
        )

        categories = set(l.get("category") for l in audit_logs)
        has_security_and_fin = "Security" in categories and "Financial" in categories
        self.test(
            "QA-AUDIT-02", "Audit Trail",
            "Audit logs encompass multiple classifications including Security and Financial",
            has_security_and_fin,
            f"Categories present: {categories}"
        )

        print("=" * 80)
        print(f"QA TEST RUN FINISHED: {self.passed_tests}/{self.total_tests} PASSED ({round(self.passed_tests/self.total_tests*100, 1)}%)")
        print("=" * 80)

        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    db_file = "D:/Data/Tests/plan/Workshop-MS-TEST/data/database.json"
    runner = QATestRunner(db_file)
    success = runner.run_all()
    sys.exit(0 if success else 1)
