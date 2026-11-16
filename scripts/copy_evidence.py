import shutil
import os

src = r'C:\Users\User\.gemini\antigravity\brain\76a3ae4a-5198-43b1-a797-17b5d20485b6\browser_sandbox\screenshots'
dst = r'C:\Users\User\.gemini\antigravity\brain\5143a486-4a4d-40b1-b2a7-b01988030de8'

files = [
    ('step_16_shot_1_eqd_special_dashboard.png', 'eqd_special_dashboard_verified.png'),
    ('step_18_shot_1_eqd_special_workshops.png', 'eqd_special_workshops_division_verified.png'),
    ('step_20_shot_1_eqd_resource_person_reg.png', 'eqd_special_resource_person_registration_verified.png'),
    ('step_24_shot_1_eqd_normal_dashboard.png', 'eqd_normal_dashboard_verified.png'),
    ('step_26_shot_1_eqd_normal_workshops.png', 'eqd_normal_workshops_branch_verified.png'),
    ('step_28_shot_1_eqd_normal_budget_planning.png', 'eqd_normal_budget_planning_verified.png')
]

for s, d in files:
    src_path = os.path.join(src, s)
    dst_path = os.path.join(dst, d)
    if os.path.exists(src_path):
        shutil.copyfile(src_path, dst_path)
        print(f"Copied {s} -> {d}")
    else:
        print(f"Missing {s}")
