import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess


root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description='Export a bounded, public-data-only history dataset from the project MongoDB.')
parser.add_argument('--container', required=True, help='Running Node-RED container on the same network as mongodb')
arguments = parser.parse_args()
ports = json.loads((root / 'src/simple/ports.json').read_text())
script = r'''
const {MongoClient} = require('/usr/src/node-red/node_modules/mongodb');
(async () => {
    const client = await MongoClient.connect('mongodb://mongodb:27017/border_insights', {useUnifiedTopology: true});
    try {
        const db = client.db();
        const ports = __PORTS__;
        const rain = await db.collection('weather').find({station: 'SSH', metric: 'rainfall'}, {projection: {_id: 1, station: 1, metric: 1, day: 1, raw: 1, completeness: 1, value: 1, valid: 1, unit: 1, fetchedAt: 1}}).sort({day: -1}).limit(365).toArray();
        rain.reverse();
        const passengerDates = await db.collection('passengers').aggregate([{$match: {port: {$in: Object.keys(ports)}, direction: 'departure'}}, {$group: {_id: '$day'}}, {$sort: {_id: -1}}, {$limit: 365}]).toArray();
        if (!rain.length || !passengerDates.length) throw new Error('Historical collections must contain real source records');
        const start = [rain[0].day, passengerDates.at(-1)._id].sort()[0];
        const end = passengerDates[0]._id;
        const passengers = await db.collection('passengers').find({port: {$in: Object.keys(ports)}, direction: 'departure', day: {$gte: start, $lte: end}}, {projection: {_id: 1, port: 1, day: 1, date: 1, direction: 1, resident: 1, mainland: 1, other: 1, visitor: 1, total: 1, weekday: 1, weekend: 1, fetchedAt: 1}}).sort({day: 1, port: 1}).toArray();
        const passengerSource = 'https://www.immd.gov.hk/opendata/eng/transport/immigration_clearance/statistics_on_daily_passenger_traffic.csv';
        const rainSource = 'https://data.weather.gov.hk/weatherAPI/cis/csvfile/SSH/ALL/daily_SSH_RF_ALL.csv';
        for (const record of passengers) {
            if (record._id !== `${record.day}_${record.port}_departure` || ![record.resident, record.mainland, record.other, record.total].every(Number.isSafeInteger) || record.resident + record.mainland + record.other !== record.total) throw new Error('Invalid passenger record in source database');
            record.source = passengerSource;
        }
        for (const record of rain) {
            if (record._id !== `SSH_rainfall_${record.day}` || (record.valid && (!Number.isFinite(record.value) || record.completeness !== 'C'))) throw new Error('Invalid rainfall record in source database');
            record.source = rainSource;
        }
        const collections = {passengers, weather: rain};
        const metadata = {schemaVersion: 1, exportedAt: new Date().toISOString(), purpose: 'Reproduce historical border-traffic and rainfall analysis without requiring a live API download.', scope: 'Official public daily records only; no live snapshots, credentials or unrelated collections.', ports, sources: {passengers: passengerSource, weather: rainSource}, collections: Object.fromEntries(Object.entries(collections).map(([name, records]) => [name, {count: records.length, start: records[0].day, end: records.at(-1).day}]))};
        process.stdout.write(JSON.stringify({metadata, collections}));
    } finally {await client.close();}
})().catch(error => {console.error(error.message);process.exitCode = 1;});
'''.replace('__PORTS__', json.dumps(ports))
raw = subprocess.check_output(['docker', 'exec', '-i', arguments.container, 'node'], input=script.encode())
dataset = json.loads(raw)
archive = gzip.compress(raw, mtime=0)
folder = root / 'dataset'
folder.mkdir(exist_ok=True)
(folder / 'history.json.gz').write_bytes(archive)
manifest = {**dataset['metadata'], 'archiveFile': 'history.json.gz', 'archiveSha256': hashlib.sha256(archive).hexdigest(), 'uncompressedSha256': hashlib.sha256(raw).hexdigest(), 'compressedBytes': len(archive), 'uncompressedBytes': len(raw)}
(folder / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(manifest, ensure_ascii=False, indent=2))
