import argparse
import datetime
import hashlib
import json
import urllib.error
import urllib.request
from pathlib import Path


parser = argparse.ArgumentParser(description='Merge only Border Insights nodes into a running local Node-RED instance.')
parser.add_argument('--url', default='http://127.0.0.1:1880')
arguments = parser.parse_args()
root = Path(__file__).resolve().parent
base = arguments.url.rstrip('/')
headers = {'Content-Type': 'application/json', 'Node-RED-API-Version': 'v2'}
with urllib.request.urlopen(urllib.request.Request(base + '/flows', headers=headers), timeout=20) as response:
    state = json.load(response)
incoming = json.loads((root / 'Border.Insights.Flow.json').read_text())
incoming_ids = {node['id'] for node in incoming}
def identifier(name):
    return hashlib.sha1(('comp7503-border:' + name).encode()).hexdigest()[:16]


tab_ids = {identifier(name) for name in ['tab', 'api-tab', 'ui-flow-tab']}
ui_tab_ids = {identifier(name) for name in ['dashboard-tab', 'dashboard-tab-traffic', 'dashboard-tab-patterns', 'dashboard-tab-trends']}
old_ui_groups = {node['id'] for node in state['flows'] if node.get('type') == 'ui_group' and node.get('tab') in ui_tab_ids}
remaining = [node for node in state['flows'] if node['id'] not in incoming_ids | tab_ids | ui_tab_ids | old_ui_groups and node.get('z') not in tab_ids]
backup_folder = root / 'backups'
backup_folder.mkdir(exist_ok=True)
stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
backup_path = backup_folder / f'flows-before-border-{stamp}.json'
backup_path.write_text(json.dumps(state, ensure_ascii=False, indent=2))
payload = json.dumps({'rev': state['rev'], 'flows': remaining + incoming}).encode()
request = urllib.request.Request(base + '/flows', data=payload, headers={**headers, 'Node-RED-Deployment-Type': 'flows'}, method='POST')
try:
    with urllib.request.urlopen(request, timeout=60) as response:
        print('Deployed:', response.status, response.read().decode())
except urllib.error.HTTPError as error:
    raise SystemExit(f'Deployment refused: HTTP {error.code}: {error.read().decode()}. Existing revision may have changed; run again after checking editor.')
print('Previous flows preserved in:', backup_path)
print('Dashboard: Live Connections / Passenger & Rainfall / Border Traffic Trends:', base + '/ui/')
