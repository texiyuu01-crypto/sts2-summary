import json
import os
import glob
from itertools import islice

# 設定：データディレクトリ
DATA_DIR = os.path.join(os.path.dirname(__file__), '../src/data')

def debug_top_level():
    # runs_*.json を取得（最新順にソート）
    json_files = sorted(glob.glob(os.path.join(DATA_DIR, 'runs_*.json')), reverse=True)
    
    if not json_files:
        print(f"Error: No JSON files found in {DATA_DIR}")
        return

    print(f"Found {len(json_files)} files. Examining latest entries...")

    # サンプルとして最新のファイルからいくつか抽出
    sample_count = 0
    max_samples = 12

    for file_path in json_files:
        if sample_count >= max_samples:
            break
            
        print(f"\n[File: {os.path.basename(file_path)}]")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                if not isinstance(data, list):
                    continue
                
                # このファイル内のランを表示
                for i, run in enumerate(data):
                    if sample_count >= max_samples:
                        break
                        
                    print(f'\n--- sample {sample_count} (index {i} in file) ---')
                    keys = list(run.keys())
                    print('keys:', keys)
                    
                    for k in keys:
                        v = run[k]
                        t = type(v).__name__
                        
                        if isinstance(v, (str, int, bool, float)) or v is None:
                            sample = v
                        elif isinstance(v, list):
                            sample = f'list(len={len(v)})'
                        elif isinstance(v, dict):
                            # キーが多い場合は最初の8個だけ表示
                            sample = f'dict(keys={list(v.keys())[:8]})'
                        else:
                            sample = str(v)[:100]
                            
                        print(f'  {k:<18} : {t:<10} -> {sample}')
                    
                    sample_count += 1
                    
            except Exception as e:
                print(f"  Error loading {file_path}: {e}")

if __name__ == "__main__":
    debug_top_level()