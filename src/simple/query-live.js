const cutoff = new Date(Date.now() - 6 * 3600000);
msg.payload = [[
    {$match: {station: 'SHS'}},
    {$facet: {
        latest: [{$sort: {sampledAt: -1}}, {$limit: 1}],
        history: [{$match: {sourceFresh: true, sourceAt: {$gte: cutoff}}}, {$unwind: '$routes'}, {$match: {'routes.destination': {$in: ['LOW', 'LMC']}, 'routes.waitMin': {$ne: null}}}, {$group: {_id: {time: {$dateTrunc: {date: '$sourceAt', unit: 'minute', binSize: 5}}, destination: '$routes.destination'}, waitMin: {$avg: '$routes.waitMin'}}}, {$sort: {'_id.time': 1}}]
    }},
    {$lookup: {from: 'snapshots', pipeline: [{$match: {port: {$in: ['LWS', 'LSC']}, group: 'resident', direction: {$in: ['arrival', 'departure']}}}, {$sort: {sampledAt: -1}}, {$group: {_id: {port: '$port', direction: '$direction'}, record: {$first: '$$ROOT'}}}, {$replaceRoot: {newRoot: '$record'}}], as: 'queues'}},
    {$lookup: {from: 'weather_live', pipeline: [{$match: {$or: [{metric: 'temperature', station: 'Ta Kwu Ling'}, {metric: 'rainfall', station: 'North District'}]}}, {$sort: {sourceAt: -1}}, {$group: {_id: '$metric', record: {$first: '$$ROOT'}}}, {$replaceRoot: {newRoot: '$record'}}], as: 'weather'}}
]];
return msg;
