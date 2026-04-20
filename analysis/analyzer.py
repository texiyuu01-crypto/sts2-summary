import json
import os
import glob
from collections import defaultdict
from datetime import datetime

# 設定：入力と出力のパス
# クローラーが保存しているディレクトリを対象にする
DATA_DIR = os.path.join(os.path.dirname(__file__), '../src/data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'tier_stats.json')

def analyze():
    if not os.path.exists(DATA_DIR):
        print(f"Error: Data directory {DATA_DIR} not found.")
        return

    # 1. 全ての日別JSONファイルをリストアップ
    json_files = glob.glob(os.path.join(DATA_DIR, 'runs_*.json'))
    if not json_files:
        print("No run data files found.")
        return

    all_runs = []
    processed_hashes = set()

    # 2. 各ファイルを読み込み（重複排除しつつ結合）
    for file_path in json_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                runs = json.load(f)
                for run in runs:
                    h = run.get('run_hash')
                    if h and h not in processed_hashes:
                        all_runs.append(run)
                        processed_hashes.add(h)
            except Exception as e:
                print(f"Error loading {file_path}: {e}")
                continue

    print(f"Analyzing {len(all_runs)} unique runs...")

    # --- 以下、統計ロジック ---

    stats = defaultdict(lambda: defaultdict(lambda: {
        "picked": 0, "appeared": 0, "wins": 0,
        "picked_single": 0, "picked_multi": 0,
        "appeared_single": 0, "appeared_multi": 0,
        "wins_single": 0, "wins_multi": 0
    }))
    
    stats_by_version = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {
        "picked": 0, "appeared": 0, "wins": 0,
        "picked_single": 0, "picked_multi": 0,
        "appeared_single": 0, "appeared_multi": 0,
        "wins_single": 0, "wins_multi": 0
    })))
    
    stats_by_ascension = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {
        "picked": 0, "appeared": 0, "wins": 0,
        "picked_single": 0, "picked_multi": 0,
        "appeared_single": 0, "appeared_multi": 0,
        "wins_single": 0, "wins_multi": 0
    })))
    
    stats_by_version_ascension = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {
        "picked": 0, "appeared": 0, "wins": 0,
        "picked_single": 0, "picked_multi": 0,
        "appeared_single": 0, "appeared_multi": 0,
        "wins_single": 0, "wins_multi": 0
    }))))

    char_totals = defaultdict(lambda: {"total_runs": 0, "total_wins": 0, "total_runs_single": 0, "total_runs_multi": 0, "total_wins_single": 0, "total_wins_multi": 0})
    char_totals_by_version = defaultdict(lambda: defaultdict(lambda: {"total_runs": 0, "total_wins": 0, "total_runs_single": 0, "total_runs_multi": 0, "total_wins_single": 0, "total_wins_multi": 0}))
    char_totals_by_ascension = defaultdict(lambda: defaultdict(lambda: {"total_runs": 0, "total_wins": 0, "total_runs_single": 0, "total_runs_multi": 0, "total_wins_single": 0, "total_wins_multi": 0}))
    char_totals_by_version_ascension = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"total_runs": 0, "total_wins": 0, "total_runs_single": 0, "total_runs_multi": 0, "total_wins_single": 0, "total_wins_multi": 0})))

    def normalize_char(val):
        if not val: return None
        if isinstance(val, str):
            s = val.strip().replace('CHARACTER.', '').replace('Character.', '').lower().replace('the ', '')
            return s
        return None

    def detect_character(run_obj):
        for k in ('character', 'character_id', 'player_character', 'player_char', 'player_class'):
            c = normalize_char(run_obj.get(k))
            if c: return c
        player = run_obj.get('player') or run_obj.get('players')
        if isinstance(player, dict):
            for k in ('character', 'id', 'class', 'name', 'character_id'):
                c = normalize_char(player.get(k))
                if c: return c
        elif isinstance(player, list) and len(player) > 0:
            for pl in player:
                if isinstance(pl, dict):
                    for k in ('character', 'id', 'class', 'name', 'character_id'):
                        c = normalize_char(pl.get(k))
                        if c: return c
        return 'UNKNOWN'

    def detect_version(run_obj):
        bid = run_obj.get('build_id') or run_obj.get('buildVersion')
        if bid: return str(bid).strip()
        sv = run_obj.get('schema_version')
        if sv is not None: return f'v{sv}'
        return 'vUNKNOWN'

    def detect_ascension(run_obj):
        for k in ('ascension', 'ascension_level', 'ascensionLevel'):
            v = run_obj.get(k)
            if v is not None:
                try: return f'A{int(v)}'
                except: pass
        return 'A10'

    unknown_examples = []
    for run in all_runs:
        char = detect_character(run)
        version = detect_version(run)
        asc = detect_ascension(run)
        is_win = run.get('win') is True or run.get('win') == 1
        players = run.get('players') or []
        run_type = 'single' if (not isinstance(players, list) or len(players) <= 1) else 'multi'

        # サマリ更新
        for d in [char_totals[char], 
                  char_totals_by_version[version][char], 
                  char_totals_by_ascension[asc][char],
                  char_totals_by_version_ascension[version][asc][char]]:
            d["total_runs"] += 1
            if is_win: d["total_wins"] += 1
            if run_type == 'single':
                d["total_runs_single"] += 1
                if is_win: d["total_wins_single"] += 1
            else:
                d["total_runs_multi"] += 1
                if is_win: d["total_wins_multi"] += 1

        # 各フロアの選択履歴を解析
        for act in run.get('map_point_history', []):
            for floor in act:
                for p_stat in floor.get('player_stats', []):
                    for choice in p_stat.get('card_choices', []):
                        card_id = choice.get('card', {}).get('id')
                        if not card_id: continue

                        was_picked = choice.get('was_picked')
                        
                        # 統計対象リスト
                        target_stats = [
                            stats[char][card_id],
                            stats_by_version[version][char][card_id],
                            stats_by_ascension[asc][char][card_id],
                            stats_by_version_ascension[version][asc][char][card_id]
                        ]

                        for s in target_stats:
                            s["appeared"] += 1
                            if run_type == 'single': s["appeared_single"] += 1
                            else: s["appeared_multi"] += 1
                            
                            if was_picked:
                                s["picked"] += 1
                                if run_type == 'single': s["picked_single"] += 1
                                else: s["picked_multi"] += 1
                                if is_win:
                                    s["wins"] += 1
                                    if run_type == 'single': s["wins_single"] += 1
                                    else: s["wins_multi"] += 1

        if char == 'UNKNOWN' and len(unknown_examples) < 5:
            unknown_examples.append({k: run.get(k) for k in ('run_hash', 'start_time') if k in run})

    def dictify(d):
        if isinstance(d, (defaultdict, dict)):
            return {k: dictify(v) for k, v in d.items()}
        return d

    result = {
        "summary": dictify(char_totals),
        "cards": dictify(stats),
        "by_version": {"summary": dictify(char_totals_by_version), "cards": dictify(stats_by_version)},
        "by_ascension": {"summary": dictify(char_totals_by_ascension), "cards": dictify(stats_by_ascension)},
        "by_version_ascension": {"summary": dictify(char_totals_by_version_ascension), "cards": dictify(stats_by_version_ascension)},
        "updated_at": datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    }

    if unknown_examples:
        print('Note: some runs were classified as UNKNOWN.')

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"Analysis complete! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    analyze()