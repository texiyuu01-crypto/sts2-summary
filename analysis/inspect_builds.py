import json
import os
from collections import Counter

INPUT_FILE = os.path.join(os.path.dirname(__file__), '../src/data/full_run_details.json')
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

builds = Counter()
schemas = Counter()
for run in data:
    if 'build_id' in run:
        builds[run.get('build_id')] += 1
    if 'schema_version' in run:
        schemas[run.get('schema_version')] += 1

print('Top build_id:')
for b,c in builds.most_common(10):
    print(b, c)
print('\nTop schema_version:')
for s,c in schemas.most_common(10):
    print(s, c)
