import requests
import json
import os
import time

# 保存先パス
DATA_PATH = os.path.join(os.path.dirname(__file__), '../src/data/full_run_details.json')

def load_existing_data():
    if os.path.exists(DATA_PATH):
        # ファイルサイズが0（空）の場合のチェックを追加
        if os.path.getsize(DATA_PATH) == 0:
            return []
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                print(f"Warning: {DATA_PATH} is invalid JSON. Starting fresh.")
                return []
    return []

def crawl():
    existing_data = load_existing_data()
    # 既存データのハッシュをセット化
    known_hashes = {run.get('run_hash') for run in existing_data if isinstance(run, dict)}
    
    new_details = []
    page = 1
    stop_crawling = False

    while not stop_crawling:
        print(f"Checking page {page}...")
        try:
            res = requests.get(f"https://spire-codex.com/api/runs/list?page={page}", timeout=10)
            res.raise_for_status() # 200以外なら例外を投げる
            
            data = res.json()
            runs = data.get('runs', [])
            if not runs:
                break

            for run in runs:
                h = run.get('run_hash')
                if not h: continue
                
                if h in known_hashes:
                    print(f"Reached known data at {h}. Stopping.")
                    stop_crawling = True
                    break
                
                print(f"Fetching new run: {h}")
                detail = fetch_run_detail(h)
                if detail:
                    new_details.append(detail)
                    time.sleep(1.0) # 負荷軽減のため少し長めに待機

            page += 1
            if page > 10: break

        except Exception as e:
            print(f"Error during crawl at page {page}: {e}")
            break

    if new_details:
        # 新しいデータを先頭に追加して保存
        updated_data = new_details + existing_data
        save_data(updated_data)
        print(f"Successfully added {len(new_details)} new runs.")
    else:
        print("No new runs found.")

def fetch_run_detail(run_hash):
    try:
        res = requests.get(f"https://spire-codex.com/api/runs/shared/{run_hash}", timeout=10)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"Failed to fetch detail for {run_hash}: {e}")
    return None

def save_data(data):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    crawl()