import json
from itertools import islice
p='src/data/full_run_details.json'
with open(p,'r',encoding='utf-8') as f:
    data=json.load(f)
for i,run in enumerate(islice(data,0,6)):
    print('\n=== run',i)
    players = run.get('players')
    print('players type:',type(players).__name__)
    if players and len(players)>0:
        for j,pl in enumerate(players[:3]):
            print('\n player',j,'keys:',list(pl.keys()))
            for k,v in list(pl.items())[:20]:
                t=type(v).__name__
                sample = v if isinstance(v,(str,int,bool)) else (f'len={len(v)}' if isinstance(v,(list,dict)) else str(type(v)))
                print('  ',k,':',t,'->',sample)
    else:
        print(' no players')
    if i>=5:
        break
