import requests
import json
import os
import time
from datetime import datetime

BASE_URL = "https://spire-codex.com/api/runs"
DATA_DIR = os.path.join(os.path.dirname(__file__), '../src/data')

def get_existing_hashes():
    """全JSONファイルから取得済みハッシュを収集（二重取得防止）"""
    hashes = set()
    if not os.path.exists(DATA_DIR): return hashes
    for f in os.listdir(DATA_DIR):
        if f.endswith('.json'):
            with open(os.path.join(DATA_DIR, f), 'r', encoding='utf-8') as file:
                try:
                    data = json.load(file)
                    # リスト形式を想定
                    for run in data:
                        if isinstance(run, dict):
                            hashes.add(run.get('run_hash'))
                except: continue
    return hashes

def fetch_run_detail(run_hash):
    try:
        res = requests.get(f"{BASE_URL}/shared/{run_hash}", timeout=15)
        return res.json() if res.status_code == 200 else None
    except Exception as e:
        print(f"Error {run_hash}: {e}")
        return None

def save_daily(run_data):
    """データ内のstart_timeに基づいて日別ファイルに保存"""
    # 1. start_timeから日付を特定 (UNIXタイムスタンプ -> YYYY_MM_DD)
    st = run_data.get('start_time')
    if st:
        # 秒単位のスタンプを変換
        date_str = datetime.fromtimestamp(st).strftime("%Y_%m_%d")
    else:
        # 万が一取得できない場合は現在日付
        date_str = datetime.now().strftime("%Y_%m_%d")
    
    path = os.path.join(DATA_DIR, f"runs_{date_str}.json")
    
    # 2. 既存データの読み込み
    existing = []
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            try:
                existing = json.load(f)
                if not isinstance(existing, list): existing = []
            except: pass
    
    # 3. 重複チェック（同一ファイル内）をして保存
    # すでにリスト内に同じハッシュがあればスキップ
    current_hash = run_data.get('run_hash')
    if any(r.get('run_hash') == current_hash for r in existing):
        return

    with open(path, 'w', encoding='utf-8') as f:
        json.dump([run_data] + existing, f, ensure_ascii=False, indent=2)

def full_crawl():
    os.makedirs(DATA_DIR, exist_ok=True)
    known_hashes = get_existing_hashes()
    page = 1
    
    print(f"Starting full crawl. Already have {len(known_hashes)} runs.")

    while True:
        print(f"Fetching list page {page}...")
        try:
            res = requests.get(f"{BASE_URL}/list?page={page}", timeout=10)
            if res.status_code != 200: break
            
            runs = res.json().get('runs', [])
            if not runs: break
        except Exception as e:
            print(f"List fetch error: {e}")
            break

        for run in runs:
            h = run.get('run_hash')
            if h in known_hashes:
                # 既知のハッシュに到達したら終了
                print(f"Reached known hash {h}. Crawl complete.")
                return 

            detail = fetch_run_detail(h)
            if detail:
                # APIのリスト側には無い詳細情報(run_hash)を補完して保存
                if 'run_hash' not in detail:
                    detail['run_hash'] = h
                
                save_daily(detail)
                print(f"Saved: {h} (Date: {datetime.fromtimestamp(detail.get('start_time', 0)).strftime('%Y-%m-%d')})")
                time.sleep(0.5)

        page += 1
        if page > 100: break # ストッパーを少し緩めました

if __name__ == "__main__":
    full_crawl()