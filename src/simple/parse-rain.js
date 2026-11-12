if (msg.statusCode !== 200 || !Array.isArray(msg.payload)) throw new Error('Invalid rainfall CSV response');
const today = new Date(Date.now() + 28800000).toISOString().slice(0, 10);
const records = [];
for (const row of msg.payload) {
    const cells = Object.values(row);
    if (cells.length < 5 || !/^\d{4}$/.test(String(cells[0]).trim())) continue;
    const day = `${Number(cells[0])}-${String(Number(cells[1])).padStart(2, '0')}-${String(Number(cells[2])).padStart(2, '0')}`;
    const date = new Date(`${day}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day || day < '2021-01-01' || day >= today) continue;
    const raw = String(cells[3]).trim();
    const completeness = String(cells[4]).trim();
    const value = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : null;
    records.push({_id: `SSH_rainfall_${day}`, station: 'SSH', metric: 'rainfall', day, raw, completeness, value, valid: value !== null && completeness === 'C', unit: 'mm', fetchedAt: new Date(), source: msg.responseUrl || msg.url});
}
if (!records.length) throw new Error('No valid rainfall dates');
return [Array.from({length: Math.ceil(records.length / 1000)}, (unused, index) => ({sourceName: 'daily-rain', payload: [records.slice(index * 1000, (index + 1) * 1000).map(document => ({replaceOne: {filter: {_id: document._id}, replacement: document, upsert: true}})), {ordered: false}]}))];
