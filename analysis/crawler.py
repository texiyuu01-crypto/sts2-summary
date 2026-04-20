import requests
import json
import os
import time
from datetime import datetime

BASE_URL = "https://spire-codex.com/api/runs"
DATA_DIR = os.path.join(os.path.dirname(__file__), '../src/data')

def get_known_hashes():
    """全JSONファイルから取得済みハッシュを収集（二重取得防止）"""
    hashes = set()
    if not os.path.exists(DATA_DIR): return hashes
    for f in os.listdir(DATA_DIR):
        if f.endswith('.json'):
            with open(os.path.join(DATA_DIR, f), 'r', encoding='utf-8') as file:
                try:
                    data = json.load(file)
                    for run in data:
                        if isinstance(run, dict):
                            hashes.add(run.get('run_hash'))
                except: continue
    return hashes

def save_run_to_date_file(run_data):
    """start_timeに基づいて、該当する日付のファイルに保存する"""
    # 1. start_timeから日付文字列を作成
    st = run_data.get('start_time')
    if st:
        date_str = datetime.fromtimestamp(st).strftime("%Y_%m_%d")
    else:
        date_str = datetime.now().strftime("%Y_%m_%d")
    
    path = os.path.join(DATA_DIR, f"runs_{date_str}.json")
    
    # 2. 既存データの読み出し
    existing = []
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            try:
                existing = json.load(f)
                if not isinstance(existing, list): existing = []
            except: pass
            
    # 3. 同一ファイル内の重複チェック（念のため）
    current_hash = run_data.get('run_hash')
    if any(r.get('run_hash') == current_hash for r in existing):
        return
        
    # 4. 保存（新しい順にしたい場合は [run_data] + existing）
    with open(path, 'w', encoding='utf-8') as f:
        json.dump([run_data] + existing, f, ensure_ascii=False, indent=2)

def crawl_daily():
    os.makedirs(DATA_DIR, exist_ok=True)
    known = get_known_hashes()
    
    page = 1
    max_pages = 3 # 日次運用なら3ページ分チェックすれば十分
    new_count = 0
    
    print(f"Starting daily crawl. Checking up to {max_pages} pages.")
    
    for p in range(1, max_pages + 1):
        print(f"Checking page {p}...")
        try:
            res = requests.get(f"{BASE_URL}/list?page={p}", timeout=10)
            if res.status_code != 200: break
            
            runs = res.json().get('runs', [])
            if not runs: break
            
            for run in runs:
                h = run.get('run_hash')
                
                # 既に持っているハッシュにぶつかったら、それ以降は取得済みと判断して終了
                if h in known:
                    print(f"Found existing run {h}. Stopping crawl.")
                    print(f"Added {new_count} new runs in total.")
                    return
                
                # 詳細取得
                detail_res = requests.get(f"{BASE_URL}/shared/{h}", timeout=10)
                if detail_res.status_code == 200:
                    detail = detail_res.json()
                    
                    # run_hashを詳細データ側に補完
                    if 'run_hash' not in detail:
                        detail['run_hash'] = h
                    
                    # 適切な日付ファイルへ保存
                    save_run_to_date_file(detail)
                    
                    new_count += 1
                    print(f"New run saved: {h}")
                    time.sleep(1.0) # サーバー負荷軽減
                    
        except Exception as e:
            print(f"Error on page {p}: {e}")
            break
    
    print(f"Finished. Added {new_count} new runs.")

if __name__ == "__main__":
    crawl_daily()