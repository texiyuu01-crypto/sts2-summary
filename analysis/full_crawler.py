import requests
import json
import os
import time

BASE_URL = "https://spire-codex.com/api/runs"

def fetch_all_runs():
    all_details = []
    page = 1
    
    # 1. まずはリストを全ページ取得してハッシュを集める
    print("Listing all runs...")
    while True:
        print(f"Fetching list page {page}...")
        res = requests.get(f"{BASE_URL}/list?page={page}")
        if res.status_code != 200:
            break
            
        data = res.json()
        runs = data.get('runs', [])
        if not runs:
            break
            
        for run in runs:
            run_hash = run.get('run_hash')
            # 2. 各Runの詳細を取得
            detail = fetch_run_detail(run_hash)
            if detail:
                all_details.append(detail)
                # サーバー負荷軽減のため0.5秒待機
                time.sleep(0.5) 
                
            if len(all_details) % 10 == 0:
                print(f"Progress: {len(all_details)} runs fetched...")

        page += 1
        # テスト用に、まずは1ページ(50件)で止めたい場合は以下を有効にしてください
        # if page > 1: break 

    return all_details

def fetch_run_detail(run_hash):
    try:
        res = requests.get(f"{BASE_URL}/shared/{run_hash}")
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"Error fetching {run_hash}: {e}")
    return None

def save_to_json(data, filename):
    output_dir = os.path.join(os.path.dirname(__file__), '../src/data')
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, filename)
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved all data to {path}")

if __name__ == "__main__":
    start_time = time.time()
    
    all_data = fetch_all_runs()
    save_to_json(all_data, 'full_run_details.json')
    
    end_time = time.time()
    print(f"Total time: {(end_time - start_time) / 60:.2f} minutes")