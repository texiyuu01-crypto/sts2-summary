import json
import os
import glob
from itertools import islice

# 設定：データディレクトリ
DATA_DIR = os.path.join(os.path.dirname(__file__), '../src/data')

def check_specific_keys():
    # runs_*.json を取得（最新順）
    json_files = sorted(glob.glob(os.path.join(DATA_DIR, 'runs_*.json')), reverse=True)
    
    if not json_files:
        print(f"Error: No JSON files found in {DATA_DIR}")
        return

    # 調査対象のキー
    check_keys = [
        'version', 'game_version', 'spire_version', 'version_tag', 
        'metadata', 'meta', 'ascension', 'ascension_level', 'ascensionLevel', 
        'players', 'player', 'character', 'character_id'
    ]

    print(f"Checking specific keys across {len(json_files)} files...")

    sample_count = 0
    max_samples = 10  # 合計10件程度チェック

    for file_path in json_files:
        if sample_count >= max_samples:
            break
            
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                if not isinstance(data, list):
                    continue

                for i, run in enumerate(data):
                    if sample_count >= max_samples:
                        break

                    run_id = run.get('id') or run.get('run_id') or run.get('run_hash') or run.get('uuid')
                    print(f'\n--- run {sample_count} (File: {os.path.basename(file_path)}, ID: {run_id})')
                    
                    # 1. トップレベルのキー確認
                    top_keys = list(run.keys())
                    print(f"top_keys count: {len(top_keys)}")
                    for k in check_keys:
                        if k in run:
                            print(f"  [Top] {k}: {run.get(k)}")

                    # 2. metadata / meta 内部の確認
                    meta = run.get('metadata') or run.get('meta')
                    if isinstance(meta, dict):
                        print(f"  metadata keys: {list(meta.keys())}")
                        for mk in ['version', 'game_version', 'ascension', 'ascension_level']:
                            if mk in meta:
                                print(f"    meta.{mk}: {meta.get(mk)}")

                    # 3. players / player 内部の確認
                    players = run.get('players') or run.get('player')
                    if isinstance(players, list):
                        for pi, p in enumerate(players[:2]): # 最初の2人分
                            print(f"  player[{pi}] keys: {list(p.keys())}")
                            for pk in ['character', 'id', 'class', 'character_id', 'ascension']:
                                if pk in p:
                                    print(f"    player[{pi}].{pk}: {p.get(pk)}")
                    elif isinstance(players, dict):
                        print(f"  player (dict) keys: {list(players.keys())}")

                    sample_count += 1

            except Exception as e:
                print(f"  Error loading {file_path}: {e}")

    print('\nDone.')

if __name__ == "__main__":
    check_specific_keys()