import json
import os
import glob
from collections import defaultdict
from datetime import datetime

# 設定：入力と出力のパス
DATA_DIR = os.path.join(os.path.dirname(__file__), '../src/data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'tier_stats.json')

def analyze():
    if not os.path.exists(DATA_DIR):
        print(f"Error: Data directory {DATA_DIR} not found.")
        return

    json_files = glob.glob(os.path.join(DATA_DIR, 'runs_*.json'))
    if not json_files:
        print("No run data files found.")
        return

    all_runs = []
    processed_hashes = set()

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

    # 統計データ構造の初期化（シングル/マルチの項目を明示）
    def factory():
        return {
            "picked_count": 0, "picked_wins": 0,
            "picked_single": 0, "picked_single_wins": 0,
            "picked_multi": 0, "picked_multi_wins": 0,
            "final_count": 0, "final_wins": 0,
            "appeared": 0, "appeared_single": 0, "appeared_multi": 0,
            # 層（act）ごとの統計
            "floor1_picked": 0, "floor1_picked_wins": 0, "floor1_appeared": 0,
            "floor2_picked": 0, "floor2_picked_wins": 0, "floor2_appeared": 0,
            "floor3_picked": 0, "floor3_picked_wins": 0, "floor3_appeared": 0
        }

    # サマリ用（母数計算に必須）
    def summary_factory():
        return {
            "total_runs": 0, "total_wins": 0,
            "total_runs_single": 0, "total_wins_single": 0,
            "total_runs_multi": 0, "total_wins_multi": 0
        }

    stats = defaultdict(lambda: defaultdict(factory))
    stats_by_v = defaultdict(lambda: defaultdict(lambda: defaultdict(factory)))
    stats_by_a = defaultdict(lambda: defaultdict(lambda: defaultdict(factory)))
    stats_by_va = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(factory))))

    summary = defaultdict(summary_factory)
    summary_by_v = defaultdict(lambda: defaultdict(summary_factory))
    summary_by_a = defaultdict(lambda: defaultdict(summary_factory))
    summary_by_va = defaultdict(lambda: defaultdict(lambda: defaultdict(summary_factory)))

    def normalize_char(val):
        if not val: return None
        return str(val).strip().replace('CHARACTER.', '').replace('Character.', '').lower().replace('the ', '')

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

    def get_acts(run_obj):
        return run_obj.get('acts') or []

    unknown_examples = []
    for run in all_runs:
        char = detect_character(run)
        version = detect_version(run)
        asc = detect_ascension(run)
        is_win = run.get('win') is True or run.get('win') == 1
        
        # シングル/マルチ判定
        players = run.get('players') or []
        run_type = 'single' if (not isinstance(players, list) or len(players) <= 1) else 'multi'
        
        # 1. サマリ（分母）の更新
        target_summaries = [
            summary[char],
            summary_by_v[version][char],
            summary_by_a[asc][char],
            summary_by_va[version][asc][char]
        ]
        for s in target_summaries:
            s["total_runs"] += 1
            if is_win: s["total_wins"] += 1
            s[f"total_runs_{run_type}"] += 1
            if is_win: s[f"total_wins_{run_type}"] += 1

        # 2. カードごとの重複排除用セット
        picked_in_run = set()
        appeared_in_run = set()
        final_in_run = set()
        # 層ごとの重複排除用セット
        floor1_picked = set()
        floor1_appeared = set()
        floor2_picked = set()
        floor2_appeared = set()
        floor3_picked = set()
        floor3_appeared = set()

        # 提示とピックの集計（層ごとに追跡）
        acts = get_acts(run)
        map_history = run.get('map_point_history', [])
        for act_idx, act in enumerate(map_history):
            # act_idx 0 = 1層, 1 = 2層, 2 = 3層
            floor_key = f"floor{act_idx + 1}"
            picked_set = None
            appeared_set = None
            
            if act_idx == 0:
                picked_set = floor1_picked
                appeared_set = floor1_appeared
            elif act_idx == 1:
                picked_set = floor2_picked
                appeared_set = floor2_appeared
            elif act_idx == 2:
                picked_set = floor3_picked
                appeared_set = floor3_appeared
            
            if picked_set is None:
                continue
            
            for floor in act:
                for p_stat in floor.get('player_stats', []):
                    for choice in p_stat.get('card_choices', []):
                        cid = choice.get('card', {}).get('id')
                        if not cid: continue
                        
                        appeared_in_run.add(cid) # 重複排除のためセットに入れる
                        appeared_set.add(cid) # 層ごとの重複排除
                        
                        if choice.get('was_picked'):
                            picked_in_run.add(cid) # 重複排除のためセットに入れる
                            picked_set.add(cid) # 層ごとの重複排除

        # デッキ内カードの集計
        for p in players:
            for c in p.get('deck', []):
                cid = c.get('id')
                if cid: final_in_run.add(cid)

        # 3. 統計への反映 (1ランにつき各カード最大1カウント)
        target_scopes = [
            stats[char],
            stats_by_v[version][char],
            stats_by_a[asc][char],
            stats_by_va[version][asc][char]
        ]

        for cid in appeared_in_run:
            for scope in target_scopes:
                node = scope[cid]
                node["appeared"] += 1
                node[f"appeared_{run_type}"] += 1

        for cid in picked_in_run:
            for scope in target_scopes:
                node = scope[cid]
                node["picked_count"] += 1
                if is_win: node["picked_wins"] += 1
                node[f"picked_{run_type}"] += 1
                if is_win: node[f"picked_{run_type}_wins"] += 1

        # 層ごとの統計を反映
        for cid in floor1_appeared:
            for scope in target_scopes:
                node = scope[cid]
                node["floor1_appeared"] += 1
        for cid in floor1_picked:
            for scope in target_scopes:
                node = scope[cid]
                node["floor1_picked"] += 1
                if is_win: node["floor1_picked_wins"] += 1

        for cid in floor2_appeared:
            for scope in target_scopes:
                node = scope[cid]
                node["floor2_appeared"] += 1
        for cid in floor2_picked:
            for scope in target_scopes:
                node = scope[cid]
                node["floor2_picked"] += 1
                if is_win: node["floor2_picked_wins"] += 1

        for cid in floor3_appeared:
            for scope in target_scopes:
                node = scope[cid]
                node["floor3_appeared"] += 1
        for cid in floor3_picked:
            for scope in target_scopes:
                node = scope[cid]
                node["floor3_picked"] += 1
                if is_win: node["floor3_picked_wins"] += 1

        for cid in final_in_run:
            for scope in target_scopes:
                node = scope[cid]
                node["final_count"] += 1
                if is_win: node["final_wins"] += 1

        if char == 'UNKNOWN' and len(unknown_examples) < 5:
            unknown_examples.append({k: run.get(k) for k in ('run_hash', 'start_time') if k in run})

    def dictify(d):
        if isinstance(d, (defaultdict, dict)):
            return {k: dictify(v) for k, v in d.items()}
        return d

    result = {
        "summary": dictify(summary),
        "cards": dictify(stats),
        "by_version": {"summary": dictify(summary_by_v), "cards": dictify(stats_by_v)},
        "by_ascension": {"summary": dictify(summary_by_a), "cards": dictify(stats_by_a)},
        "by_version_ascension": {"summary": dictify(summary_by_va), "cards": dictify(stats_by_va)},
        "updated_at": datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    }

    if unknown_examples:
        print('Note: some runs were classified as UNKNOWN.')

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Analysis complete! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    analyze()