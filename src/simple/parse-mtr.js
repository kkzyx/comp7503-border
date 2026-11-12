if (msg.statusCode !== 200) throw new Error(`MTR HTTP ${msg.statusCode}`);
const body = msg.payload;
const block = body?.data?.['EAL-SHS'];
const sourceAt = new Date(String(block?.curr_time || body?.curr_time || '').replace(' ', 'T') + '+08:00');
const observedAt = new Date();
const sourceTime = Number.isFinite(sourceAt.getTime()) ? sourceAt : null;
const age = sourceTime ? observedAt - sourceTime : NaN;
const sourceFresh = Number(body?.status) === 1 && Boolean(block) && age >= -30000 && age <= 120000;
const routes = [['LOW', 'LWS'], ['LMC', 'LSC']].map(([destination, port]) => {
    const trains = (Array.isArray(block?.UP) ? block.UP : []).filter(train => train.dest === destination && train.valid === 'Y').map(train => ({
        destination, platform: String(train.plat || ''),
        predictedAt: new Date(String(train.time).replace(' ', 'T') + '+08:00'),
        waitMin: /^\d+$/.test(String(train.ttnt)) ? Number(train.ttnt) : null
    })).filter(train => Number.isFinite(train.predictedAt.getTime()) && train.waitMin !== null && train.waitMin <= 180).sort((first, second) => first.predictedAt - second.predictedAt);
    return {station: 'SHS', direction: 'UP', destination, port, trains, waitMin: trains[0]?.waitMin ?? null};
});
const sampledAt = new Date(Math.floor(observedAt.getTime() / 10000) * 10000);
const document = {_id: `SHS_${sampledAt.toISOString()}`, station: 'SHS', line: 'EAL', sampledAt, observedAt, sourceAt: sourceTime, sourceFresh, available: Number(body?.status) === 1 && Boolean(block), delayReported: body?.isdelay === 'Y', routes, source: msg.responseUrl || msg.url};
msg.sourceName = 'mtr-SHS';
msg.payload = [[{replaceOne: {filter: {_id: document._id}, replacement: document, upsert: true}}], {ordered: false}];
return msg;
