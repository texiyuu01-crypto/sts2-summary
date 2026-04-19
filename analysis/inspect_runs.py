import json
from itertools import islice
p='src/data/full_run_details.json'
print('Loading (may take a moment)...',p)
with open(p,'r',encoding='utf-8') as f:
    data = json.load(f)
print('Total runs:', len(data))
for i, run in enumerate(islice(data,0,12)):
    print('\n--- run', i)
    keys = list(run.keys())
    print('keys:', keys)
    for k in keys:
        v = run[k]
        t = type(v).__name__
        if isinstance(v, (str,int,bool)):
            sample = v
        elif isinstance(v, list):
            sample = f'list(len={len(v)})'
        elif isinstance(v, dict):
            sample = f'dict(keys={list(v.keys())[:8]})'
        else:
            sample = str(v)[:100]
        print(' ',k,':', t, '->', sample)
    if i>=11:
        break
