import json
import os
import glob
from collections import Counter

# 設定：クローラーが保存しているディレクトリを対象にする
DATA_DIR = os.path.join(os.path.dirname(__file__), '../src/data')

def analyze_versions():
    if not os.path.exists(DATA_DIR):
        print(f"Error: Directory {DATA_DIR} not found.")
        return

    # runs_*.json をすべて取得
    json_files = glob.glob(os.path.join(DATA_DIR, 'runs_*.json'))
    
    builds = Counter()
    schemas = Counter()
    total_runs = 0

    print(f"Scanning {len(json_files)} files...")

    for file_path in json_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                if not isinstance(data, list):
                    continue
                
                for run in data:
                    total_runs += 1
                    # build_id の集計
                    bid = run.get('build_id') or run.get('buildVersion')
                    if bid:
                        builds[bid] += 1
                    
                    # schema_version の集計
                    sv = run.get('schema_version')
                    if sv is not None:
                        schemas[sv] += 1
            except Exception as e:
                print(f"Error reading {file_path}: {e}")

    print(f"\nTotal runs analyzed: {total_runs}")
    
    print('\n--- Top build_id ---')
    if not builds:
        print("No build_id found.")
    for b, c in builds.most_common(10):
        print(f"{str(b):<20} : {c} runs")

    print('\n--- Top schema_version ---')
    if not schemas:
        print("No schema_version found.")
    for s, c in schemas.most_common(10):
        print(f"Version {str(s):<12} : {c} runs")

if __name__ == "__main__":
    analyze_versions()