import os
import shutil

src = r'C:\Users\User\.gemini\antigravity\brain\748f7789-232f-4231-8f0b-fa98dbeafd3f\browser_sandbox\screenshots'
dst = r'C:\Users\User\.gemini\antigravity\brain\5143a486-4a4d-40b1-b2a7-b01988030de8'

files = [
    ('step_51_shot_1_validation_sl_nic_passport.png', 'validation_sl_nic_passport_verified.png'),
    ('step_53_shot_1_exact_duplicate_detection.png', 'exact_duplicate_detection_verified.png'),
    ('step_57_shot_1_foreign_resource_person_verified.png', 'foreign_resource_person_verified.png'),
    ('step_61_shot_1_similar_record_comparison_table.png', 'similar_record_comparison_table_verified.png'),
    ('step_65_shot_1_resource_person_registered_success.png', 'resource_person_registered_success_verified.png'),
    ('step_69_shot_1_resource_persons_directory_with_foreign.png', 'resource_persons_directory_with_foreign_verified.png')
]

for s, d in files:
    sp = os.path.join(src, s)
    dp = os.path.join(dst, d)
    if os.path.exists(sp):
        shutil.copyfile(sp, dp)
        print(f"Copied {s} -> {d}")
    else:
        print(f"Missing {s}")
