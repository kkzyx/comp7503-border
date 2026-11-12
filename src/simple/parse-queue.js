if (msg.statusCode !== 200 || !['LWS', 'LSC'].some(port => msg.payload?.[port])) throw new Error('Invalid clearance response');
const observedAt = new Date();
const sampledAt = new Date(Math.floor(observedAt.getTime() / 900000) * 900000);
const modified = new Date(msg.headers?.['last-modified']);
const sourceModifiedAt = Number.isFinite(modified.getTime()) ? modified : null;
const age = sourceModifiedAt ? observedAt - sourceModifiedAt : NaN;
const sourceFresh = age >= -300000 && age <= 2700000;
const labels = {0: 'Normal', 1: 'Busy', 2: 'Very busy', 4: 'Maintenance', 99: 'Non-service hours'};
const hk = new Date(sampledAt.getTime() + 28800000);
const documents = ['LWS', 'LSC'].flatMap(port => ['arrival', 'departure'].map(direction => {
    const raw = msg.payload[port]?.[direction === 'arrival' ? 'arrQueue' : 'depQueue'];
    const code = Number.isInteger(raw) ? raw : null;
    return {_id: `${sampledAt.toISOString()}_resident_${port}_${direction}`, port, group: 'resident', direction, code, label: labels[code] || 'Unavailable', observedAt, sampledAt, sourceModifiedAt, sourceFresh, valid: sourceFresh && [0, 1, 2].includes(code), busy: [1, 2].includes(code), hkDay: hk.toISOString().slice(0, 10), hkHour: hk.getUTCHours(), source: msg.responseUrl || msg.url};
}));
msg.sourceName = 'resident';
msg.payload = [documents.map(document => ({replaceOne: {filter: {_id: document._id}, replacement: document, upsert: true}})), {ordered: false}];
return msg;
