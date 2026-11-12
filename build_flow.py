import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
NODES = []
PORT_NAMES = json.loads((ROOT / 'src/simple/ports.json').read_text())


def identifier(name):
    return hashlib.sha1(('comp7503-border:' + name).encode()).hexdigest()[:16]


TAB = identifier('tab')
DATABASE = identifier('database')


def add(name, kind, display_name, targets=None, **properties):
    node = {'id': identifier(name), 'type': kind, 'z': TAB, 'name': display_name,
            'x': 200, 'y': 100,
            'wires': [[identifier(target) for target in output] for output in (targets or [])], **properties}
    NODES.append(node)
    return node


def function(name, label, targets):
    return add(name, 'function', label, targets,
               func=(ROOT / 'src/simple' / f'{name}.js').read_text().replace('__PORT_NAMES__', json.dumps(PORT_NAMES)), outputs=len(targets),
               noerr=0, initialize='', finalize='', libs=[], timeout=30)


def timer(name, label, repeat, target, delay=2, topic=''):
    return add(name, 'inject', label, [[target]], props=[{'p': 'payload'}, {'p': 'topic', 'vt': 'str'}],
               repeat=str(repeat), crontab='', once=True, onceDelay=str(delay), topic=topic,
               payload='', payloadType='date')


def http(name, label, url, target, response='obj', timeout='20000'):
    return add(name, 'http request', label, [[target]], method='GET', ret=response,
               paytoqs='ignore', url=url, persist=False, requestTimeout=timeout)


def mongo(name, collection, operation, target):
    return add(name, 'mongodb3 in', name.replace('-', ' ').title(), [[target]] if target else [[]],
               service='_ext_', configNode=DATABASE, collection=collection, operation=operation)


NODES.extend([
    {'id': TAB, 'type': 'tab', 'label': 'Cross-border Connections', 'disabled': False,
     'info': 'Compact course project. API → validate → MongoDB; MongoDB → analyse → Dashboard. Resident clearance in both directions; outbound HK-resident passenger analysis.'},
    {'id': DATABASE, 'type': 'mongodb3', 'uri': 'mongodb://mongodb:27017/border_insights',
     'name': 'Border MongoDB', 'options': json.dumps({'useNewUrlParser': True, 'useUnifiedTopology': True, 'serverSelectionTimeoutMS': 10000}), 'parallelism': '-1'}
])

timer('mtr-timer', 'MTR · 10 s', 10, 'fetch-mtr', topic='mtr-SHS')
http('fetch-mtr', 'MTR · Sheung Shui', 'https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=EAL&sta=SHS', 'parse-mtr', timeout='8000')
function('parse-mtr', 'Keep Lo Wu / Lok Ma Chau predictions', [['write-mtr']])
mongo('write-mtr', 'mtr_snapshots', 'bulkWrite', 'saved')

timer('queue-timer', 'Clearance · 15 min', 900, 'fetch-queue', delay=3, topic='resident')
http('fetch-queue', 'Resident clearance grades', 'https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeR.json', 'parse-queue')
function('parse-queue', 'Two borders · resident arrivals + departures', [['write-queue']])
mongo('write-queue', 'snapshots', 'bulkWrite', 'saved')

timer('weather-timer', 'Current weather · 15 min', 900, 'fetch-current-weather', delay=4, topic='current-weather')
http('fetch-current-weather', 'HKO current weather', 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en', 'parse-current-weather')
function('parse-current-weather', 'Regional temperature + past-hour rain', [['write-current-weather']])
mongo('write-current-weather', 'weather_live', 'bulkWrite', 'saved')

timer('passenger-timer', 'Daily passengers · check 6 h', 21600, 'fetch-passengers', delay=5, topic='passengers')
http('fetch-passengers', 'Immigration daily CSV', 'https://www.immd.gov.hk/opendata/eng/transport/immigration_clearance/statistics_on_daily_passenger_traffic.csv', 'parse-csv', response='txt', timeout='60000')
add('parse-csv', 'csv', 'Passenger CSV → rows', [['parse-passengers']], sep=',', hdrin=True, hdrout='none', multi='mult', ret='\n', temp='', skip='0', strings=True, include_empty_strings=False, include_null_values=False)
function('parse-passengers', 'Eight land borders · validate + daily upsert', [['write-passengers']])
mongo('write-passengers', 'passengers', 'bulkWrite', 'saved')

timer('rain-timer', 'Daily rain archive · check 6 h', 21600, 'fetch-rain', delay=7, topic='daily-rain')
http('fetch-rain', 'HKO Sheung Shui daily rain', 'https://data.weather.gov.hk/weatherAPI/cis/csvfile/SSH/ALL/daily_SSH_RF_ALL.csv', 'rain-csv', response='txt', timeout='60000')
add('rain-csv', 'csv', 'Daily rain CSV → rows', [['parse-rain']], sep=',', hdrin=True, hdrout='none', multi='mult', ret='\n', temp='', skip='2', strings=True, include_empty_strings=False, include_null_values=False)
function('parse-rain', 'Keep quality flag + daily upsert', [['write-rain']])
mongo('write-rain', 'weather', 'bulkWrite', 'saved')

timer('index-timer', 'Create indexes once', 0, 'indexes', delay=1)
function('indexes', 'Indexes + 14-day live-data retention', [['write-indexes']])
mongo('write-indexes', '', 'createIndex', None)
function('saved', 'Record successful database write', [[]])
add('errors', 'catch', 'Collection / query errors', [['failure']], scope=None, uncaught=False)
function('failure', 'Keep live errors separate from historical views', [['error-log'], ['history-summary', 'trend-summary'], ['live-cards']])
add('error-log', 'debug', 'Project error', [], active=True, tosidebar=True, console=True, tostatus=False, complete='payload', targetType='msg')

pages = {}
for order, (key, title, icon) in enumerate([('live', 'Live Connections', 'train'), ('patterns', 'Passenger & Rainfall', 'show_chart'), ('trends', 'Border Traffic Trends', 'timeline')], 2):
    pages[key] = identifier('dashboard-tab' if key == 'live' else 'dashboard-tab-' + key)
    NODES.append({'id': pages[key], 'type': 'ui_tab', 'name': title, 'icon': icon, 'order': order, 'disabled': False, 'hidden': False})
groups = {}
for key, page, title, order in [('connections', 'live', 'Border connections', 1), ('live-weather', 'live', 'Weather & recent rail predictions', 2), ('traffic', 'patterns', 'Daily passenger history', 1), ('weather', 'patterns', 'Rainfall & daily passengers', 2), ('trends', 'trends', 'Daily border comparison', 1)]:
    groups[key] = identifier('dashboard-group-' + key)
    NODES.append({'id': groups[key], 'type': 'ui_group', 'name': title, 'tab': pages[page], 'order': order, 'disp': True, 'width': '18' if key == 'trends' else '10', 'collapse': False})


def widget(name, kind, group, order, label='', **properties):
    return add(name, kind, label or name, properties.pop('targets', [[]]), group=groups[group],
               order=order, label=label, width=properties.pop('width', 10), height=properties.pop('height', 1), **properties)


def panel(name, group, order, filename, height, width=10):
    return widget(name, 'ui_template', group, order, height=height, width=width,
                  format=(ROOT / 'src/simple/panels' / filename).read_text(),
                  storeOutMessages=False, fwdInMessages=False, resendOnRefresh=False, templateScope='local')


def chart(name, group, order, label, live=False, kind='line', height=5, width=10, colors=None):
    return widget(name, 'ui_chart', group, order, label, height=height, width=width, chartType=kind, legend='true',
                  xformat='HH:mm' if live else 'YYYY-MM-DD', interpolate='linear', nodata='Collecting / no matching records',
                  dot=live, ymin='0', ymax='', removeOlder='10', removeOlderUnit='31536000', removeOlderPoints='',
                  useUTC=not live, colors=colors or ['#248792', '#dc9b4c'], outputs=1, useOneColor=False, useDifferentColor=True,
                  className='' if live else '{{msg.socketid}}')

widget('port-filter', 'ui_dropdown', 'traffic', 1, 'Border', targets=[['selection']], passthru=False, multiple=False, options=[{'value': 'LWS', 'label': 'Lo Wu', 'type': 'str'}, {'value': 'LSC', 'label': 'Lok Ma Chau Spur Line', 'type': 'str'}], payload='', topic='port', topicType='str')
widget('days-filter', 'ui_dropdown', 'traffic', 2, 'History', targets=[['selection']], passthru=False, multiple=False, options=[{'value': days, 'label': f'{days} data days', 'type': 'num'} for days in [30, 90, 365]], payload='', topic='days', topicType='str')
panel('live-cards', 'connections', 1, 'connections.html', 8)
panel('train-table', 'connections', 2, 'trains.html', 4)
panel('weather-card', 'live-weather', 1, 'weather.html', 4)
chart('mtr-chart', 'live-weather', 2, 'Predicted next-train wait · 5-min mean (min)', live=True)
panel('history-summary', 'traffic', 3, 'summary.html', 4)
chart('passenger-chart', 'traffic', 4, 'Outbound HK residents · daily passengers')
panel('rain-summary', 'weather', 1, 'correlation.html', 5)
panel('scatter', 'weather', 2, 'scatter.html', 6)
widget('comparison-filter', 'ui_dropdown', 'trends', 1, 'Borders (multi-select)', width=9, targets=[['selection']], passthru=False, multiple=True, options=[{'value': port, 'label': name, 'type': 'str'} for port, name in PORT_NAMES.items()], payload='', topic='comparePorts', topicType='str')
widget('trend-days-filter', 'ui_dropdown', 'trends', 2, 'History', width=9, targets=[['selection']], passthru=False, multiple=False, options=[{'value': days, 'label': f'{days} data dates', 'type': 'num'} for days in [30, 90, 365]], payload='', topic='trendDays', topicType='str')
panel('trend-summary', 'trends', 3, 'trends.html', 4, width=18)
trend_colors = ['#248792', '#dc9b4c', '#7463ad', '#bd537c', '#52864d', '#427bb8', '#a76845', '#65747f']
chart('border-trend-chart', 'trends', 4, 'Outbound HK residents · daily comparison', height=6, width=9, colors=trend_colors)
chart('weekday-chart', 'trends', 5, 'Last complete week · daily passengers', kind='bar', height=6, width=9, colors=trend_colors)
add('shared-styles', 'ui_template', 'Small panel styles', [[]], group='', order=0, width=0, height=0, format=(ROOT / 'src/simple/panels/style.html').read_text(), storeOutMessages=False, fwdInMessages=False, resendOnRefresh=False, templateScope='global')

add('browser-events', 'ui_ui_control', 'Browser connect / disconnect', [['selection']], events='all')
function('selection', 'Per-browser selection', [['query-live'], ['query-history'], ['port-filter'], ['days-filter'], ['comparison-filter'], ['trend-days-filter']])
timer('live-refresh', 'Read live data · 10 s', 10, 'query-live', delay=8)
function('query-live', 'Read rail + queue + weather from MongoDB', [['read-live']])
mongo('read-live', 'mtr_snapshots', 'aggregate.toArray', 'show-live')
function('show-live', 'Format live cards + train chart', [['live-cards', 'train-table', 'weather-card'], ['mtr-chart']])
timer('history-refresh', 'Read history · 60 s', 60, 'selection', delay=12, topic='refresh')
function('query-history', 'Read passenger history + comparisons + rain', [['read-history']])
mongo('read-history', 'passengers', 'aggregate.toArray', 'show-history')
function('show-history', 'Daily means + Pearson r + border trends', [['history-summary', 'rain-summary', 'scatter'], ['passenger-chart'], ['border-trend-chart'], ['weekday-chart'], ['trend-summary']])

sections = [
    ('01 · MTR · every 10 seconds', ['mtr-timer', 'fetch-mtr', 'parse-mtr', 'write-mtr']),
    ('02 · Clearance and current weather · every 15 minutes', ['queue-timer', 'fetch-queue', 'parse-queue', 'write-queue', 'weather-timer', 'fetch-current-weather', 'parse-current-weather', 'write-current-weather']),
    ('03 · Daily passenger and rainfall archives · check every 6 hours', ['passenger-timer', 'fetch-passengers', 'parse-csv', 'parse-passengers', 'write-passengers', 'rain-timer', 'fetch-rain', 'rain-csv', 'parse-rain', 'write-rain']),
    ('04 · Read MongoDB → analyse → display', ['live-refresh', 'query-live', 'read-live', 'show-live', 'live-cards', 'train-table', 'weather-card', 'mtr-chart', 'history-refresh', 'browser-events', 'selection', 'query-history', 'read-history', 'show-history', 'port-filter', 'days-filter', 'history-summary', 'passenger-chart', 'rain-summary', 'scatter', 'comparison-filter', 'trend-days-filter', 'trend-summary', 'border-trend-chart', 'weekday-chart']),
    ('05 · Indexes, health and errors', ['index-timer', 'indexes', 'write-indexes', 'saved', 'errors', 'failure', 'error-log', 'shared-styles'])
]
top = 70
for index, (label, names) in enumerate(sections):
    members = [next(node for node in NODES if node['id'] == identifier(name)) for name in names]
    group_id = identifier(f'simple-section-{index}')
    for offset, node in enumerate(members):
        node.update(g=group_id, x=210 + offset % 5 * 300, y=top + 55 + offset // 5 * 85)
    height = 110 + ((len(members) - 1) // 5) * 85
    NODES.append({'id': group_id, 'type': 'group', 'z': TAB, 'name': label,
                  'style': {'label': True, 'fill': '#f4f8fa', 'color': '#536b78'},
                  'nodes': [node['id'] for node in members], 'x': 44, 'y': top + 14, 'w': 1540, 'h': height - 15})
    top += height + 35

assert 30 <= len(NODES) <= 70, len(NODES)
(ROOT / 'Border.Insights.Flow.json').write_text(json.dumps(NODES, ensure_ascii=False, indent=2) + '\n')
print(f'Built {len(NODES)} nodes, including all tabs, groups and configuration nodes.')
