const client = (flow.get('simpleClients') || {})[msg.socketid];
if (!client || client.sequence !== msg.sequence) return null;
const result = Object.values(msg.payload)[0] || {days: [], rain: [], comparison: []};
const mean = values => values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
const days = result.days;
const pairs = result.rain.filter(row => row.valid && row.completeness === 'C' && row.value !== null && row.passenger.length).map(row => ({day: row.day, rain: row.value, passengers: row.passenger[0].resident}));
let coefficient = null;
let reason = 'At least 30 valid paired days required.';
if (pairs.length >= 30) {
    const meanRain = mean(pairs.map(pair => pair.rain));
    const meanPassengers = mean(pairs.map(pair => pair.passengers));
    let cross = 0;
    let rainVariance = 0;
    let passengerVariance = 0;
    for (const pair of pairs) {
        const rainDifference = pair.rain - meanRain;
        const passengerDifference = pair.passengers - meanPassengers;
        cross += rainDifference * passengerDifference;
        rainVariance += rainDifference ** 2;
        passengerVariance += passengerDifference ** 2;
    }
    coefficient = rainVariance && passengerVariance ? Math.max(-1, Math.min(1, cross / Math.sqrt(rainVariance * passengerVariance))) : null;
    reason = coefficient === null ? 'No variation in at least one variable.' : 'Descriptive association, not causation.';
}
const maximumRain = Math.max(...pairs.map(pair => pair.rain), 1);
const maximumPassengers = Math.max(...pairs.map(pair => pair.passengers), 1) * 1.05;
const data = {
    name: msg.port === 'LWS' ? 'Lo Wu' : 'Lok Ma Chau Spur Line', latest: days.at(-1) || null,
    start: days[0]?.day, end: days.at(-1)?.day,
    mean: mean(days.map(row => row.resident)), weekdayMean: mean(days.filter(row => !row.weekend).map(row => row.resident)), weekendMean: mean(days.filter(row => row.weekend).map(row => row.resident)),
    coefficient, reason, pairs: pairs.length, pairedStart: pairs[0]?.day, pairedEnd: pairs.at(-1)?.day,
    wetMean: mean(pairs.filter(pair => pair.rain >= 1).map(pair => pair.passengers)), dryMean: mean(pairs.filter(pair => pair.rain < 1).map(pair => pair.passengers)),
    wetDays: pairs.filter(pair => pair.rain >= 1).length, dryDays: pairs.filter(pair => pair.rain < 1).length,
    points: pairs.map(pair => ({...pair, x: 62 + pair.rain / maximumRain * 450, y: 220 - pair.passengers / maximumPassengers * 190})),
    ticks: Array.from({length: 5}, (unused, index) => ({x: 62 + index * 450 / 4, rain: (index * maximumRain / 4).toFixed(1), y: 220 - index * 190 / 4, passengers: Math.round(index * maximumPassengers / 4)}))
};
const portNames = __PORT_NAMES__;
const comparison = result.comparison || [];
const weekly = result.weekly || [];
const dates = [...new Set(comparison.map(row => row.day))].sort();
const borders = msg.comparePorts.map(port => {
    const records = comparison.filter(row => row.port === port && Number.isFinite(row.resident));
    const byDay = new Map(records.map(row => [row.day, row.resident]));
    const weeklyByDay = new Map(weekly.filter(row => row.port === port && Number.isFinite(row.resident)).map(row => [row.day, row.resident]));
    const weekValues = msg.weekDates.map(day => weeklyByDay.get(day) ?? null);
    return {name: portNames[port], count: records.length, mean: mean(records.map(row => row.resident)), weekCount: weekValues.filter(value => value !== null).length, weekValues, points: dates.map(day => ({x: Date.parse(`${day}T12:00:00+08:00`), y: byDay.get(day) ?? null}))};
});
const series = borders.map(border => border.name);
return [
    {socketid: msg.socketid, payload: data},
    {socketid: msg.socketid, payload: [{series: [data.name], data: [days.map(row => ({x: Date.parse(`${row.day}T12:00:00+08:00`), y: row.resident}))], labels: ['']}]},
    {socketid: msg.socketid, payload: [{series, data: borders.map(border => border.points), labels: ['']}]},
    {socketid: msg.socketid, payload: [{series, data: borders.map(border => border.weekValues), labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}]},
    {socketid: msg.socketid, payload: {start: dates[0], end: dates.at(-1), requestedDays: msg.trendDays, weekStart: msg.weekStart, weekEnd: msg.weekEnd, borders}}
];
