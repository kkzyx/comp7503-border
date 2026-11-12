const error = msg.error?.message || 'Unexpected processing error';
if (msg.socketid) {
    const client = (flow.get('simpleClients') || {})[msg.socketid];
    if (!client || client.sequence !== msg.sequence) return null;
    return [{payload: {error}}, {socketid: msg.socketid, payload: {error: 'Query failed. Existing charts may be outdated.'}}, null];
}
const health = flow.get('collectionHealth') || {};
health[msg.sourceName || msg.topic || 'pipeline'] = {failedAt: new Date().toISOString(), error};
flow.set('collectionHealth', health);
return [{payload: {error}}, null, {payload: {error: 'A collection or live query failed. Existing values may be outdated.'}}];
