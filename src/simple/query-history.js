const client = (flow.get('simpleClients') || {})[msg.socketid];
if (!client || client.sequence !== msg.sequence) return null;
const hkNow = new Date(Date.now() + 28800000);
const today = Date.UTC(hkNow.getUTCFullYear(), hkNow.getUTCMonth(), hkNow.getUTCDate());
const daysSinceMonday = (new Date(today).getUTCDay() + 6) % 7;
const weekStart = today - (daysSinceMonday + 7) * 86400000;
msg.weekDates = Array.from({length: 7}, (unused, index) => new Date(weekStart + index * 86400000).toISOString().slice(0, 10));
msg.weekStart = msg.weekDates[0];
msg.weekEnd = msg.weekDates[6];
msg.payload = [[
    {$match: {port: {$in: [...new Set([msg.port, ...msg.comparePorts])]}, direction: 'departure'}},
    {$facet: {
        selected: [{$match: {port: msg.port}}, {$sort: {day: -1}}, {$limit: msg.days}, {$sort: {day: 1}}, {$group: {_id: null, days: {$push: {day: '$day', resident: '$resident', weekend: '$weekend'}}}}],
        comparison: [{$match: {port: {$in: msg.comparePorts}}}, {$group: {_id: '$day', records: {$push: {port: '$port', day: '$day', resident: '$resident'}}}}, {$sort: {_id: -1}}, {$limit: msg.trendDays}, {$unwind: '$records'}, {$replaceRoot: {newRoot: '$records'}}, {$sort: {day: 1, port: 1}}],
        weekly: [{$match: {port: {$in: msg.comparePorts}, day: {$gte: msg.weekStart, $lte: msg.weekEnd}}}, {$project: {_id: 0, port: 1, day: 1, resident: 1}}, {$sort: {day: 1, port: 1}}]
    }},
    {$project: {days: {$ifNull: [{$arrayElemAt: ['$selected.days', 0]}, []]}, comparison: 1, weekly: 1}},
    {$lookup: {from: 'weather', pipeline: [
        {$match: {station: 'SSH', metric: 'rainfall'}}, {$sort: {day: -1}}, {$limit: msg.days}, {$sort: {day: 1}},
        {$lookup: {from: 'passengers', let: {key: {$concat: ['$day', `_${msg.port}_departure`]}}, pipeline: [{$match: {$expr: {$eq: ['$_id', '$$key']}}}, {$project: {resident: 1}}], as: 'passenger'}}
    ], as: 'rain'}}
]];
return msg;
