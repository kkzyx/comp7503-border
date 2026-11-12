const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const {MongoClient} = require('/usr/src/node-red/node_modules/mongodb');

async function seedHistory() {
    const mode = process.env.BORDER_SEED_HISTORY || 'missing';
    if (mode === 'off') {
        console.log('Historical dataset import disabled.');
        return;
    }
    if (mode !== 'missing') throw new Error('BORDER_SEED_HISTORY must be missing or off');
    const folder = path.join(__dirname, 'dataset');
    const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json'), 'utf8'));
    const archive = fs.readFileSync(path.join(folder, 'history.json.gz'));
    const hash = value => crypto.createHash('sha256').update(value).digest('hex');
    if (hash(archive) !== manifest.archiveSha256) throw new Error('Historical dataset archive checksum mismatch');
    const raw = zlib.gunzipSync(archive);
    if (hash(raw) !== manifest.uncompressedSha256) throw new Error('Historical dataset content checksum mismatch');
    const dataset = JSON.parse(raw);
    if (manifest.schemaVersion !== 1 || dataset.metadata.schemaVersion !== 1 || Object.keys(dataset.collections).sort().join(',') !== 'passengers,weather') throw new Error('Unsupported historical dataset format');
    for (const [name, records] of Object.entries(dataset.collections)) {
        if (!Array.isArray(records) || records.length !== manifest.collections[name].count) throw new Error(`Invalid dataset count: ${name}`);
        const ids = new Set();
        for (const record of records) {
            if (typeof record._id !== 'string' || ids.has(record._id) || !/^\d{4}-\d{2}-\d{2}$/.test(record.day)) throw new Error(`Invalid dataset record: ${name}`);
            ids.add(record._id);
            for (const field of ['date', 'fetchedAt']) {
                if (record[field] !== undefined) {
                    const date = new Date(record[field]);
                    if (!Number.isFinite(date.getTime())) throw new Error(`Invalid dataset date: ${name}.${field}`);
                    record[field] = date;
                }
            }
        }
    }
    const client = await MongoClient.connect('mongodb://mongodb:27017/border_insights', {useUnifiedTopology: true, serverSelectionTimeoutMS: 60000});
    try {
        const db = client.db();
        for (const [name, records] of Object.entries(dataset.collections)) {
            let inserted = 0;
            for (let offset = 0; offset < records.length; offset += 500) {
                const result = await db.collection(name).bulkWrite(records.slice(offset, offset + 500).map(record => ({updateOne: {filter: {_id: record._id}, update: {$setOnInsert: record}, upsert: true}})), {ordered: false});
                inserted += result.upsertedCount;
            }
            console.log(`Historical dataset: ${name}: inserted ${inserted}/${records.length}; existing records unchanged.`);
        }
        console.log(`Historical snapshot exported at ${manifest.exportedAt}; not a live observation.`);
    } finally {await client.close();}
}

seedHistory().catch(error => {
    console.error('Historical dataset import failed:', error.message);
    process.exitCode = 1;
});
