if (msg.statusCode !== 200 || !Array.isArray(msg.payload) || !msg.payload.length) throw new Error('Invalid passenger CSV response');
const portNames = Object.fromEntries(Object.entries(__PORT_NAMES__).map(([port, name]) => [name, port]));
const records = [];
for (const row of msg.payload) {
    const port = portNames[String(row['Control Point']).trim()];
    if (!port || String(row['Arrival / Departure']).trim() !== 'Departure') continue;
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(row.Date);
    if (!match) continue;
    const day = `${match[3]}-${match[2]}-${match[1]}`;
    const date = new Date(`${day}T00:00:00+08:00`);
    const counts = ['Hong Kong Residents', 'Mainland Visitors', 'Other Visitors', 'Total'].map(key => /^\d+$/.test(String(row[key])) ? Number(row[key]) : NaN);
    if (!counts.every(Number.isSafeInteger) || counts[0] + counts[1] + counts[2] !== counts[3] || !Number.isFinite(date.getTime()) || new Date(date.getTime() + 28800000).toISOString().slice(0, 10) !== day) continue;
    const [resident, mainland, other, total] = counts;
    const weekday = new Date(`${day}T12:00:00+08:00`).getUTCDay();
    records.push({_id: `${day}_${port}_departure`, port, day, date, direction: 'departure', resident, mainland, other, visitor: mainland + other, total, weekday, weekend: [0, 6].includes(weekday), fetchedAt: new Date(), source: msg.responseUrl || msg.url});
}
if (!records.length) throw new Error('No valid land-border passenger records');
return [Array.from({length: Math.ceil(records.length / 1000)}, (unused, index) => ({sourceName: 'passengers', payload: [records.slice(index * 1000, (index + 1) * 1000).map(document => ({replaceOne: {filter: {_id: document._id}, replacement: document, upsert: true}})), {ordered: false}]}))];
