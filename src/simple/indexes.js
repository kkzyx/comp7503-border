return [[
    {collection: 'mtr_snapshots', payload: [{sampledAt: 1}, {name: 'mtr_raw_14_days', expireAfterSeconds: 1209600}]},
    {collection: 'mtr_snapshots', payload: [{station: 1, sampledAt: -1}, {name: 'station_history'}]},
    {collection: 'snapshots', payload: [{port: 1, group: 1, direction: 1, sampledAt: -1}, {name: 'status_history'}]},
    {collection: 'snapshots', payload: [{sampledAt: 1}, {name: 'clearance_raw_14_days', expireAfterSeconds: 1209600}]},
    {collection: 'weather_live', payload: [{metric: 1, station: 1, sourceAt: -1}, {name: 'live_weather_dates'}]},
    {collection: 'weather_live', payload: [{observedAt: 1}, {name: 'weather_live_14_days', expireAfterSeconds: 1209600}]},
    {collection: 'passengers', payload: [{port: 1, direction: 1, day: -1}, {name: 'simple_passenger_dates'}]},
    {collection: 'weather', payload: [{station: 1, metric: 1, day: -1}, {name: 'weather_dates'}]}
]];
