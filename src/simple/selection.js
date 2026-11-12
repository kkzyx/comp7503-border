const clients = flow.get('simpleClients') || {};
const portNames = __PORT_NAMES__;
for (const [socket, client] of Object.entries(clients)) {
    if (Date.now() - client.seenAt > 86400000) delete clients[socket];
}
if (msg.payload === 'lost') {
    delete clients[msg.socketid];
    flow.set('simpleClients', clients);
    return null;
}
const sockets = msg.topic === 'refresh' ? Object.keys(clients) : msg.socketid ? [msg.socketid] : [];
const queries = [];
const ports = [];
const days = [];
const comparisons = [];
const trendDays = [];
for (const socket of sockets) {
    const client = clients[socket] || {port: 'LWS', days: 365, sequence: 0};
    client.comparePorts = client.comparePorts || ['LWS', 'LSC'];
    client.trendDays = client.trendDays || 30;
    if (msg.topic === 'port' && ['LWS', 'LSC'].includes(msg.payload)) client.port = msg.payload;
    if (msg.topic === 'days' && [30, 90, 365].includes(Number(msg.payload))) client.days = Number(msg.payload);
    if (msg.topic === 'comparePorts' && Array.isArray(msg.payload)) {
        const selected = [...new Set(msg.payload.filter(port => Object.hasOwn(portNames, port)))];
        client.comparePorts = selected.length ? selected : ['LWS', 'LSC'];
    }
    if (msg.topic === 'trendDays' && [30, 90, 365].includes(Number(msg.payload))) client.trendDays = Number(msg.payload);
    client.sequence += 1;
    client.seenAt = Date.now();
    clients[socket] = client;
    queries.push({socketid: socket, port: client.port, days: client.days, comparePorts: client.comparePorts, trendDays: client.trendDays, sequence: client.sequence});
    ports.push({socketid: socket, payload: client.port});
    days.push({socketid: socket, payload: client.days});
    comparisons.push({socketid: socket, payload: client.comparePorts});
    trendDays.push({socketid: socket, payload: client.trendDays});
}
flow.set('simpleClients', clients);
if (msg.payload === 'connect' || msg.payload === 'change') {
    setTimeout(() => {
        const current = flow.get('simpleClients') || {};
        queries.filter(query => current[query.socketid]?.sequence === query.sequence).forEach(query => {
            node.send([null, query, {socketid: query.socketid, payload: query.port}, {socketid: query.socketid, payload: query.days}, {socketid: query.socketid, payload: query.comparePorts}, {socketid: query.socketid, payload: query.trendDays}]);
        });
    }, 150);
}
return [msg.payload === 'connect' ? {} : null, queries, ports, days, comparisons, trendDays];
