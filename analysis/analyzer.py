import json
import os
from collections import defaultdict
from datetime import datetime

# 設定：入力と出力のパス
INPUT_FILE = os.path.join(os.path.dirname(__file__), '../src/data/full_run_details.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '../src/data/tier_stats.json')

def analyze():
    if not os.path.exists(INPUT_FILE):
        print("Error: Input file not found.")
        return

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        all_runs = json.load(f)

    # 統計用辞書： stats[キャラ名][カードID] = {picked, appeared, wins, picked_single, picked_multi, ...}
    stats = defaultdict(lambda: defaultdict(lambda: {
        "picked": 0, "appeared": 0, "wins": 0,
        "picked_single": 0, "picked_multi": 0,
        "appeared_single": 0, "appeared_multi": 0,
        "wins_single": 0, "wins_multi": 0
    }))
    # バージョン別・アセンション別の集計
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
    # version x ascension combined
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
            s = val.strip()
            s = s.replace('CHARACTER.', '').replace('Character.', '')
            s = s.lower()
            # common replacements
            s = s.replace('the ', '')
            return s
        return None

    def detect_character(run_obj):
        # try common top-level keys
        for k in ('character', 'character_id', 'player_character', 'player_char', 'player_class'):
            v = run_obj.get(k)
            c = normalize_char(v)
            if c: return c
        # nested player object (players may be a list)
        player = run_obj.get('player') or run_obj.get('players')
        if isinstance(player, dict):
            for k in ('character', 'id', 'class', 'name', 'character_id'):
                v = player.get(k)
                c = normalize_char(v)
                if c: return c
        if isinstance(player, list) and len(player) > 0:
            # prefer single-player runs: take first player's character
            for pl in player:
                if not isinstance(pl, dict):
                    continue
                for k in ('character', 'id', 'class', 'name', 'character_id'):
                    v = pl.get(k)
                    c = normalize_char(v)
                    if c: return c
        # metadata
        meta = run_obj.get('metadata') or run_obj.get('meta')
        if isinstance(meta, dict):
            for k in ('character', 'character_id'):
                v = meta.get(k)
                c = normalize_char(v)
                if c: return c
        return 'UNKNOWN'

    def detect_version(run_obj):
        # Prefer explicit build_id (contains vX.Y.Z), then known keys, then metadata
        bid = run_obj.get('build_id') or run_obj.get('buildVersion')
        if bid:
            s = str(bid).strip()
            return s if s else 'vUNKNOWN'
        # schema_version can be useful fallback
        sv = run_obj.get('schema_version')
        if sv is not None:
            try:
                return f'v{int(sv)}'
            except:
                return str(sv)
        # try other common keys
        for k in ('version', 'game_version', 'spire_version', 'version_tag'):
            v = run_obj.get(k)
            if v:
                s = str(v).strip()
                if s and not s.lower().startswith('v'):
                    s = 'v' + s
                return s
        meta = run_obj.get('metadata') or run_obj.get('meta') or {}
        v = meta.get('version') if isinstance(meta, dict) else None
        if v:
            s = str(v).strip()
            if not s.lower().startswith('v'):
                s = 'v' + s
            return s
        return 'vUNKNOWN'

    def detect_ascension(run_obj):
        for k in ('ascension', 'ascension_level', 'ascensionLevel'):
            v = run_obj.get(k)
            if v is not None:
                try:
                    n = int(v)
                    return f'A{n}'
                except:
                    pass
        meta = run_obj.get('metadata') or run_obj.get('meta') or {}
        if isinstance(meta, dict):
            v = meta.get('ascension') or meta.get('ascension_level')
            try:
                n = int(v)
                return f'A{n}'
            except:
                pass
        # default ascension A10 if not present
        return 'A10'

    unknown_examples = []
    for run in all_runs:
        char = detect_character(run)
        version = detect_version(run)
        asc = detect_ascension(run)
        is_win = run.get('win') == 1
        # determine single/multi
        players = run.get('players') or []
        run_type = 'single' if (not isinstance(players, list) or len(players) <= 1) else 'multi'

        # overall totals
        char_totals[char]["total_runs"] += 1
        if is_win:
            char_totals[char]["total_wins"] += 1
        if run_type == 'single':
            char_totals[char]["total_runs_single"] += 1
            if is_win:
                char_totals[char]["total_wins_single"] += 1
        else:
            char_totals[char]["total_runs_multi"] += 1
            if is_win:
                char_totals[char]["total_wins_multi"] += 1

        # version / ascension totals
        char_totals_by_version[version][char]["total_runs"] += 1
        if is_win:
            char_totals_by_version[version][char]["total_wins"] += 1
        if run_type == 'single':
            char_totals_by_version[version][char]["total_runs_single"] += 1
            if is_win:
                char_totals_by_version[version][char]["total_wins_single"] += 1
        else:
            char_totals_by_version[version][char]["total_runs_multi"] += 1
            if is_win:
                char_totals_by_version[version][char]["total_wins_multi"] += 1

        char_totals_by_ascension[asc][char]["total_runs"] += 1
        if is_win:
            char_totals_by_ascension[asc][char]["total_wins"] += 1
        if run_type == 'single':
            char_totals_by_ascension[asc][char]["total_runs_single"] += 1
            if is_win:
                char_totals_by_ascension[asc][char]["total_wins_single"] += 1
        else:
            char_totals_by_ascension[asc][char]["total_runs_multi"] += 1
            if is_win:
                char_totals_by_ascension[asc][char]["total_wins_multi"] += 1
        # combined version x ascension totals
        char_totals_by_version_ascension[version][asc][char]["total_runs"] += 1
        if is_win:
            char_totals_by_version_ascension[version][asc][char]["total_wins"] += 1
        if run_type == 'single':
            char_totals_by_version_ascension[version][asc][char]["total_runs_single"] += 1
            if is_win:
                char_totals_by_version_ascension[version][asc][char]["total_wins_single"] += 1
        else:
            char_totals_by_version_ascension[version][asc][char]["total_runs_multi"] += 1
            if is_win:
                char_totals_by_version_ascension[version][asc][char]["total_wins_multi"] += 1

        # 各フロアの選択履歴を解析
        for act in run.get('map_point_history', []):
            for floor in act:
                player_stats_list = floor.get('player_stats', [])
                for p_stat in player_stats_list:
                    # カード選択の集計
                    for choice in p_stat.get('card_choices', []):
                        card = choice.get('card', {})
                        card_id = card.get('id')
                        if not card_id: continue

                        stats[char][card_id]["appeared"] += 1
                        stats_by_version[version][char][card_id]["appeared"] += 1
                        stats_by_ascension[asc][char][card_id]["appeared"] += 1
                        stats_by_version_ascension[version][asc][char][card_id]["appeared"] += 1
                        if run_type == 'single':
                            stats[char][card_id]["appeared_single"] += 1
                        else:
                            stats[char][card_id]["appeared_multi"] += 1
                        if choice.get('was_picked'):
                            stats[char][card_id]["picked"] += 1
                            stats_by_version[version][char][card_id]["picked"] += 1
                            stats_by_ascension[asc][char][card_id]["picked"] += 1
                            stats_by_version_ascension[version][asc][char][card_id]["picked"] += 1
                            if run_type == 'single':
                                stats[char][card_id]["picked_single"] += 1
                                stats_by_version[version][char][card_id]["picked_single"] += 1
                                stats_by_ascension[asc][char][card_id]["picked_single"] += 1
                                stats_by_version_ascension[version][asc][char][card_id]["picked_single"] += 1
                            else:
                                stats[char][card_id]["picked_multi"] += 1
                                stats_by_version[version][char][card_id]["picked_multi"] += 1
                                stats_by_ascension[asc][char][card_id]["picked_multi"] += 1
                                stats_by_version_ascension[version][asc][char][card_id]["picked_multi"] += 1
                            if is_win:
                                stats[char][card_id]["wins"] += 1
                                stats_by_version[version][char][card_id]["wins"] += 1
                                stats_by_ascension[asc][char][card_id]["wins"] += 1
                                stats_by_version_ascension[version][asc][char][card_id]["wins"] += 1
                                if run_type == 'single':
                                    stats[char][card_id]["wins_single"] += 1
                                    stats_by_version[version][char][card_id]["wins_single"] += 1
                                    stats_by_ascension[asc][char][card_id]["wins_single"] += 1
                                    stats_by_version_ascension[version][asc][char][card_id]["wins_single"] += 1
                                else:
                                    stats[char][card_id]["wins_multi"] += 1
                                    stats_by_version[version][char][card_id]["wins_multi"] += 1
                                    stats_by_ascension[asc][char][card_id]["wins_multi"] += 1
                                    stats_by_version_ascension[version][asc][char][card_id]["wins_multi"] += 1
        if char == 'UNKNOWN' and len(unknown_examples) < 5:
            # store small sample for debugging
            unknown_examples.append({k: run.get(k) for k in ('id', 'timestamp') if k in run})

    # Next.jsで扱いやすい形に整形
    def dictify(d):
        # recursively convert defaultdicts to dicts
        if isinstance(d, defaultdict):
            d = {k: dictify(v) for k, v in d.items()}
        elif isinstance(d, dict):
            d = {k: dictify(v) for k, v in d.items()}
        return d

    result = {
        "summary": dictify(char_totals),
        "cards": dictify(stats),
        "by_version": {
            "summary": dictify(char_totals_by_version),
            "cards": dictify(stats_by_version)
        },
        "by_ascension": {
            "summary": dictify(char_totals_by_ascension),
            "cards": dictify(stats_by_ascension)
        },
        "by_version_ascension": {
            "summary": dictify(char_totals_by_version_ascension),
            "cards": dictify(stats_by_version_ascension)
        },
        "updated_at": datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    }

    if unknown_examples:
        print('Note: some runs were classified as UNKNOWN. Example runs (up to 5):')
        print(json.dumps(unknown_examples, ensure_ascii=False, indent=2))

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"Analysis complete! Summary saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    analyze()