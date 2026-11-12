if (msg.statusCode !== 200 || !Array.isArray(msg.payload?.temperature?.data)) throw new Error('Invalid current weather response');
const body = msg.payload;
const observedAt = new Date();
const temperature = body.temperature.data.find(row => row.place === 'Ta Kwu Ling');
const rainfall = body.rainfall?.data?.find(row => row.place === 'North District');
const records = [
    {metric: 'temperature', station: 'Ta Kwu Ling', raw: temperature?.value, unit: '°C', timestamp: body.temperature.recordTime},
    {metric: 'rainfall', station: 'North District', raw: rainfall?.max, unit: 'mm', timestamp: body.rainfall?.endTime, windowStart: body.rainfall?.startTime, windowEnd: body.rainfall?.endTime}
].map(record => {
    const sourceAt = new Date(record.timestamp);
    const numeric = /^-?\d+(\.\d+)?$/.test(String(record.raw)) ? Number(record.raw) : null;
    const valid = numeric !== null && (record.metric === 'rainfall' ? numeric >= 0 : numeric >= -30 && numeric <= 60);
    const sourceTime = Number.isFinite(sourceAt.getTime()) ? sourceAt : null;
    return {_id: `${record.metric}_${record.station}_${sourceTime?.toISOString() || observedAt.toISOString()}`, metric: record.metric, station: record.station, sourceAt: sourceTime, observedAt, valid: valid && Boolean(sourceTime), value: valid ? numeric : null, raw: record.raw ?? null, unit: record.unit, windowStart: record.windowStart ? new Date(record.windowStart) : null, windowEnd: record.windowEnd ? new Date(record.windowEnd) : null, source: msg.responseUrl || msg.url};
});
msg.sourceName = 'current-weather';
msg.payload = [records.map(document => ({replaceOne: {filter: {_id: document._id}, replacement: document, upsert: true}})), {ordered: false}];
return msg;
