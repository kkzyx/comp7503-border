const result = Object.values(msg.payload)[0] || {latest: [], queues: [], weather: [], history: []};
const now = Date.now();
const fresh = (value, age) => value && now - new Date(value).getTime() >= -300000 && now - new Date(value).getTime() <= age;
const rail = result.latest[0];
const trainFresh = rail?.sourceFresh && fresh(rail.sourceAt, 120000) && fresh(rail.observedAt, 120000);
const labels = {0: 'Normal', 1: 'Busy', 2: 'Very busy', 4: 'Maintenance', 99: 'Non-service hours'};
const tones = {0: 'normal', 1: 'busy', 2: 'very-busy'};
const cards = [['LWS', 'Lo Wu', 'LOW'], ['LSC', 'Lok Ma Chau Spur Line', 'LMC']].map(([port, name, destination]) => {
    const clearance = direction => {
        const queue = result.queues.find(row => row.port === port && row.direction === direction);
        const queueFresh = queue?.sourceFresh && fresh(queue.observedAt, 2700000) && fresh(queue.sourceModifiedAt, 2700000);
        return {label: queueFresh ? labels[queue.code] || 'Unavailable' : 'Stale / unavailable', tone: queueFresh ? tones[queue.code] || 'unavailable' : 'unavailable', sourceAt: queue?.sourceModifiedAt};
    };
    const route = rail?.routes.find(row => row.destination === destination);
    return {name, destination, arrival: clearance('arrival'), departure: clearance('departure'),
        waitMin: trainFresh ? route?.waitMin ?? null : null, trains: trainFresh ? route?.trains.slice(0, 2) || [] : [],
        railNote: !trainFresh ? 'Stale / unavailable' : !route?.trains.length ? 'No matching prediction' : rail.delayReported ? 'Delay reported by MTR' : 'Prediction available'};
});
const weather = result.weather.map(record => ({...record, fresh: record.valid && fresh(record.sourceAt, 5400000) && fresh(record.observedAt, 2700000)}));
const health = flow.get('collectionHealth') || {};
const data = {cards, weather, now: new Date().toISOString(), savedSources: Object.values(health).filter(record => !record.error).length, errors: Object.entries(health).filter(([name, record]) => record.error).map(([name]) => name).join(', ')};
const payload = [{series: ['Lo Wu', 'Lok Ma Chau'], data: ['LOW', 'LMC'].map(destination => result.history.filter(row => row._id.destination === destination).map(row => ({x: new Date(row._id.time).getTime(), y: row.waitMin}))), labels: ['']}];
return [{payload: data}, {payload}];
