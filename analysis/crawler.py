import requests
import json
import os
import time

DATA_PATH = os.path.join(os.path.dirname(__file__), '../src/data/full_run_details.json')

def load_existing_data():
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def crawl():
    existing_data = load_existing_data()
    # 既知のハッシュをセットにして高速検索できるようにする
    known_hashes = {run.get('run_hash') for run in existing_data}
    
    new_details = []
    page = 1
    stop_crawling = False

    while not stop_crawling:
        print(f"Checking page {page}...")
        res = requests.get(f"https://spire-codex.com/api/runs/list?page={page}")
        if res.status_code != 200: break
        
        runs = res.json().get('runs', [])
        if not runs: break

        for run in runs:
            h = run.get('run_hash')
            if h in known_hashes:
                # すでに持っているハッシュに到達したら、これ以上古いものは取得不要
                print(f"Reached known data at {h}. Stopping.")
                stop_crawling = True
                break
            
            # 新しいRunの詳細を取得
            print(f"Fetching new run: {h}")
            detail = fetch_run_detail(h)
            if detail:
                new_details.append(detail)
                time.sleep(0.5) # マナー

        page += 1
        if page > 10: break # 安全策：念のため10ページ（500件分）まで

    # 新しいデータを先頭に追加して保存
    updated_data = new_details + existing_data
    save_data(updated_data)

def fetch_run_detail(run_hash):
    res = requests.get(f"https://spire-codex.com/api/runs/shared/{run_hash}")
    return res.json() if res.status_code == 200 else None

def save_data(data):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    crawl()