import json
import os
import glob
from itertools import islice

# 設定：データディレクトリ
DATA_DIR = os.path.join(os.path.dirname(__file__), '../src/data')

def debug_structure():
    # runs_*.json を取得し、最新のものから順にソート
    json_files = sorted(glob.glob(os.path.join(DATA_DIR, 'runs_*.json')), reverse=True)
    
    if not json_files:
        print("No run data files found.")
        return

    # 最新のファイル、または指定した件数分だけ読み込んで構造を表示
    for file_path in islice(json_files, 0, 1): # とりあえず最新1ファイルを確認
        print(f"\n--- Checking File: {os.path.basename(file_path)} ---")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                if not isinstance(data, list):
                    print("Data is not a list.")
                    continue
                
                for i, run in enumerate(islice(data, 0, 3)): # 各ファイル先頭3件
                    print(f'\n=== run {i} (Hash: {run.get("run_hash", "N/A")}) ===')
                    
                    players = run.get('players')
                    print('players type:', type(players).__name__)
                    
                    if isinstance(players, list) and len(players) > 0:
                        for j, pl in enumerate(players[:2]): # 最初の2名分
                            print(f'\n  player {j} keys:', list(pl.keys()))
                            # 最初の20項目を表示
                            for k, v in list(pl.items())[:20]:
                                t = type(v).__name__
                                # サンプルの整形
                                if isinstance(v, (str, int, bool, float)) or v is None:
                                    sample = v
                                elif isinstance(v, (list, dict)):
                                    sample = f'len={len(v)}'
                                else:
                                    sample = str(type(v))
                                print(f'    {k} : {t} -> {sample}')
                    else:
                        print('  no players or invalid type')
                        
            except Exception as e:
                print(f"Error reading {file_path}: {e}")

if __name__ == "__main__":
    debug_structure()