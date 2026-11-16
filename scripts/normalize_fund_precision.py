import json
import os
import shutil

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'database.json')
BACKUP_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'database.backup_before_cent_precision.json')

def round_mn_to_cent(val):
    if val is None:
        return 0
    return round(float(val) * 100_000_000) / 100_000_000

def main():
    if not os.path.exists(BACKUP_PATH):
        shutil.copyfile(DB_PATH, BACKUP_PATH)
        print(f"Created backup at {BACKUP_PATH}")
    else:
        print(f"Backup already exists at {BACKUP_PATH}")

    with open(DB_PATH, 'r', encoding='utf-8') as f:
        db = json.load(f)

    # 1. Normalize aipActivities
    acts = db.get('aipActivities', [])
    normalized_acts_count = 0
    for act in acts:
        cost = float(act.get('estimatedCost') or 0)
        if cost >= 1000:
            act['estimatedCost'] = round_mn_to_cent(cost / 1_000_000)
            if 'approvedAllocation' in act and float(act.get('approvedAllocation') or 0) >= 1000:
                act['approvedAllocation'] = round_mn_to_cent(float(act['approvedAllocation']) / 1_000_000)
            if 'financialProgress' in act and float(act.get('financialProgress') or 0) >= 1000:
                act['financialProgress'] = round_mn_to_cent(float(act['financialProgress']) / 1_000_000)
            if 'financialQ1' in act and float(act.get('financialQ1') or 0) >= 1000:
                act['financialQ1'] = round_mn_to_cent(float(act['financialQ1']) / 1_000_000)
            if 'financialQ2' in act and float(act.get('financialQ2') or 0) >= 1000:
                act['financialQ2'] = round_mn_to_cent(float(act['financialQ2']) / 1_000_000)
            if 'financialQ3' in act and float(act.get('financialQ3') or 0) >= 1000:
                act['financialQ3'] = round_mn_to_cent(float(act['financialQ3']) / 1_000_000)
            if 'financialQ4' in act and float(act.get('financialQ4') or 0) >= 1000:
                act['financialQ4'] = round_mn_to_cent(float(act['financialQ4']) / 1_000_000)
            
            f_months = act.get('financialMonths')
            if isinstance(f_months, list):
                act['financialMonths'] = [
                    round_mn_to_cent(float(m) / 1_000_000) if float(m or 0) >= 1000 else round_mn_to_cent(float(m or 0))
                    for m in f_months
                ]
            normalized_acts_count += 1

    # 2. Normalize verificationRecords
    vers = db.get('verificationRecords', [])
    normalized_vers_count = 0
    for v in vers:
        rep_cost = float(v.get('reportedFinancialCost') or 0)
        ver_cost = float(v.get('verifiedFinancialCost') or 0)
        ver_disb = float(v.get('verifiedFinancialDisbursement') or 0)

        updated = False
        if rep_cost >= 1000:
            v['reportedFinancialCost'] = round_mn_to_cent(rep_cost / 1_000_000)
            updated = True
        if ver_cost >= 1000:
            v['verifiedFinancialCost'] = round_mn_to_cent(ver_cost / 1_000_000)
            updated = True
        if ver_disb >= 1000:
            v['verifiedFinancialDisbursement'] = round_mn_to_cent(ver_disb / 1_000_000)
            updated = True
        if updated:
            normalized_vers_count += 1

    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

    print(f"Success: Normalized {normalized_acts_count} AIP activities and {normalized_vers_count} verification records to accurate Million declarations down to the last cent.")

if __name__ == '__main__':
    main()
