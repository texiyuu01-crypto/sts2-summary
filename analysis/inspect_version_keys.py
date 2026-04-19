import json
import os

INPUT_FILE = os.path.join(os.path.dirname(__file__), '../src/data/full_run_details.json')

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

print('Total runs:', len(data))

check_keys = ['version','game_version','spire_version','version_tag','metadata','meta','ascension','ascension_level','ascensionLevel','players','player','character','character_id']

for i, run in enumerate(data[:10]):
    print('\n--- run', i, 'id=', run.get('id') or run.get('run_id') or run.get('uuid'))
    keys = list(run.keys())
    print('top_keys:', keys)
    for k in check_keys:
        if k in run:
            print(f"{k}: {run.get(k)}")
    meta = run.get('metadata') or run.get('meta')
    if isinstance(meta, dict):
        print('metadata keys:', list(meta.keys()))
        for k in ['version','game_version','ascension','ascension_level']:
            if k in meta:
                print(f"meta.{k}: {meta.get(k)}")
    players = run.get('players') or run.get('player')
    if isinstance(players, list):
        for pi, p in enumerate(players[:3]):
            print(f"player[{pi}] keys: {list(p.keys())}")
            for k in ['character','id','class','character_id','ascension']:
                if k in p:
                    print(f" player[{pi}].{k}: {p.get(k)}")
    elif isinstance(players, dict):
        print('player keys:', list(players.keys()))

print('\nDone')
