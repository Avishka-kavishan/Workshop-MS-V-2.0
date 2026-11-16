import urllib.request
import json
import sys

BASE_URL = 'http://localhost:3000'

def test_stage_api():
    print("Testing Stage 1 & 2: Review and Consolidation API (branchId=all)...")
    req = urllib.request.Request(f"{BASE_URL}/api/annual-plan?year=2027&branchId=all")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            assert data.get('success') is True, "Expected success: true"
            assert data.get('isConsolidated') is True, "Expected isConsolidated: true"
            assert data.get('deadline') is not None, "Expected deadline to be present"
            assert data.get('deadline', {}).get('dueDate') == '2026-12-15', "Expected dueDate 2026-12-15"
            assert len(data.get('activities', [])) > 0, "Expected aggregated activities"
            print(f"  [PASS] Consolidated API returned {len(data['activities'])} activities across {len(data.get('moeBranches', []))} branches.")
            print(f"  [PASS] Active AIP deadline: {data['deadline']['dueDate']} ({data['deadline']['title']})")
    except Exception as e:
        print(f"  [FAIL] Failed testing Consolidated API: {e}")
        sys.exit(1)

    print("\nTesting Stage 2 -> 3: PPB Approval for Consolidated Plan...")
    req_approve = urllib.request.Request(
        f"{BASE_URL}/api/annual-plan/approve",
        data=json.dumps({"branchId": "all", "year": "2027", "action": "Approve"}).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req_approve) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            assert data.get('success') is True, "Expected approve success"
            print(f"  [PASS] PPB Approval executed: {data.get('message')}")
    except Exception as e:
        print(f"  [FAIL] Failed testing Approval: {e}")
        sys.exit(1)

    print("\nTesting Stage 4: Allocation and Dispatch to Relevant Branches...")
    req_dispatch = urllib.request.Request(
        f"{BASE_URL}/api/annual-plan/dispatch",
        data=json.dumps({"branchId": "all", "year": "2027"}).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req_dispatch) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            assert data.get('success') is True, "Expected dispatch success"
            print(f"  [PASS] Plan allocated & dispatched: {data.get('message')}")
    except Exception as e:
        print(f"  [FAIL] Failed testing Dispatch: {e}")
        sys.exit(1)

    print("\nTesting Stage 5 & 6: Verification of Dispatched State and Progress Readiness...")
    req_verify = urllib.request.Request(f"{BASE_URL}/api/annual-plan?year=2027&branchId=all")
    try:
        with urllib.request.urlopen(req_verify) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            assert data.get('plan', {}).get('status') == 'Approved', "Expected plan to be Approved"
            assert data.get('plan', {}).get('isDispatchedToBranch') is True, "Expected plan to be Dispatched"
            print(f"  [PASS] Plan status: {data['plan']['status']}, isDispatchedToBranch: {data['plan']['isDispatchedToBranch']}")
    except Exception as e:
        print(f"  [FAIL] Failed testing state verification: {e}")
        sys.exit(1)

    print("\nTesting Stage 6: M&E Directorate Endpoint Verification...")
    req_mne = urllib.request.Request(f"{BASE_URL}/api/monitoring?year=2027")
    try:
        with urllib.request.urlopen(req_mne) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            assert data.get('success') is True, "Expected monitoring success"
            print(f"  [PASS] M&E Directorate reporting active: {len(data.get('progressReturns', []))} progress returns recorded.")
    except Exception as e:
        print(f"  [FAIL] Failed testing M&E endpoint: {e}")
        sys.exit(1)

    print("\nALL 6 STAGES BACKEND WORKFLOW AUDIT PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_stage_api()
