# Cross-border Connections — compact edition

A small COMP7503A Node-RED project: compare Lo Wu and Lok Ma Chau Spur Line connections, explore daily passengers against rainfall, and compare land-border passenger trends.

## Quick start

Install Docker with Docker Compose (on macOS/Windows, start Docker Desktop), then clone this repository:

```sh
git clone https://github.com/kkzyx/comp7503-border.git
cd comp7503-border
sh start-pull.sh
```

Open **http://127.0.0.1:1880/ui/**. No build, manual flow import or palette installation is needed. The script pulls the public `aazyx774/comp7503-border:1.2.0` image and starts MongoDB alongside it. First startup automatically restores **3,226 passenger records and 365 rainfall records** from the bundled official public dataset. Live panels require working access to the official APIs and time to collect new observations; bundled history is not live data.

If port 1880 is occupied, run `BORDER_PORT=1882 sh start-pull.sh` and open port 1882 instead. Windows PowerShell commands and verification steps are in [DEPLOY_FROM_HUB.md](DEPLOY_FROM_HUB.md). Stop the services with `docker compose -f compose.pull.yaml stop`; rerun the startup script to resume. Keep the volumes to retain collected data.

The default Dashboard binding is localhost only. For remote access, use an SSH tunnel or an authenticated HTTPS reverse proxy; do not expose the editor or MongoDB publicly. Use a unique `COMPOSE_PROJECT_NAME` if another installation already uses `comp7503-border`.

## Size and interface

**70 nodes in the exported flow**, including all configuration, page and editor-group nodes. One editor tab contains five labelled sections. The previous compact edition had 63 nodes; the new page adds seven while preserving its existing views.

Three English classic Dashboard pages at http://127.0.0.1:1880/ui/:

1. **Live Connections** — independent resident arrival/departure clearance at Lo Wu and Lok Ma Chau Spur Line, next trains toward the border, upcoming trains, regional temperature/rain and one native rail-history chart.
2. **Passenger & Rainfall** — border and period filters, daily/weekday/weekend means, one native passenger chart, Pearson r, wet/dry means and a small scatter plot.
3. **Border Traffic Trends** — select any of eight land borders together and 30/90/365 data dates for the daily outbound HK-resident line chart. The Monday–Sunday bars show actual daily counts for the previous complete Hong Kong calendar week, independently of the trend-period filter. The summary shows both date ranges and each border's weekly coverage. On Thursday 12 November 2026 and Sunday 15 November, the bars show 2–8 November; at Monday 16 November 00:00 HK, they advance to 9–15 November. Unpublished/missing days remain gaps, not zero or a different week. Passenger & Rainfall remains independent.

Standard charts use `ui_chart`; cards, table and scatter use small `ui_template` panels. Four filters are independent per browser. Passenger analysis remains **HK residents departing Hong Kong**; live resident clearance shows both directions. Both rail branches are predicted at Sheung Shui toward LOW/Lo Wu and LMC/Lok Ma Chau Spur Line. No separate frontend is needed.

The architectural reference is the course demo and the user's description of a small senior-student weather project. Its original attachment was not available for this revision; its exact design/code was not copied or claimed verified. All historical charts query MongoDB rather than relying on memory-only chart history.

## Collect → MongoDB → display

| Data | Project request interval | Collection and key |
| --- | --- | --- |
| MTR Sheung Shui EAL predictions | 10 seconds | `mtr_snapshots`: station + 10-second sample slot |
| Resident clearance grades, two railway borders, both directions | 15 minutes | `snapshots`: border + resident + direction + 15-minute slot |
| HKO current report: temperature and district past-hour rain | 15 minutes | `weather_live`: station + metric + source time |
| Daily outbound passenger CSV, eight land borders | Check every 6 hours | `passengers`: date + border + direction |
| Sheung Shui daily rainfall archive | Check every 6 hours | `weather`: SSH + rainfall + date |

Intervals are project polling settings, not guarantees of source publication. Live widgets read MongoDB every 10 seconds; historical widgets read every 60 seconds. Live data are shared; historical filters are independent per browser. Superseded historical responses are ignored.

Classic Dashboard chart nodes need their dynamic `className` set to `{{msg.socketid}}` for socket-targeted history messages: its dynamic-field handling carries `msg.socketid` into the emitted chart update. Without this, native charts can broadcast despite scoped template/filter messages. Connect/tab-change events repeat the current guarded query after the Dashboard's initial state replay, so cached native data do not persist over a browser's own selection. The common live rail chart intentionally remains unscoped.

Collection validates types, dates and passenger totals. Unknown/missing weather is not zero; maintenance/non-service/stale grades are not normal. Upserts prevent duplicate records within a sample slot or repeated source observation. `sourceAt`/`sourceModifiedAt` are distinct from acquisition `observedAt`. MongoDB dates are UTC; labels and day matching use Hong Kong time.

MTR, clearance and current-weather records use 14-day TTL indexes; daily passenger and rainfall history is retained. The compact edition does **not** create long-term MTR hourly rollups. Its six-hour rail chart averages collected predictions within five-minute buckets; these are not actual delays or measured passenger waits. TTL deletion is asynchronous. Unrelated collections and the teacher's Temperature flow remain out of scope.

Current weather uses Ta Kwu Ling temperature and the HKO **North District maximum** past-hour rainfall field. This is not a Sheung Shui rain-gauge reading. Historical daily rainfall still uses Sheung Shui. These are regional context proxies, not checkpoint instruments. A stale source displays —.

## Analysis retained

- Daily outbound HK-resident count, period mean, weekday/weekend means.
- Same-Hong-Kong-date daily rainfall/passenger pairs, requiring complete numeric HKO records (`C`).
- Pearson r only with >=30 valid pairs and variation in both variables.
- Wet-day (>=1 mm) and dry-day (<1 mm) passenger averages, with sample counts.
- Actual paired date range displayed: historical weather publication lag can make it older than the latest passenger date.
- Eight selectable land borders: Lo Wu, Lok Ma Chau Spur Line, Lok Ma Chau, Shenzhen Bay, Heung Yuen Wai, Hong Kong-Zhuhai-Macao Bridge, Man Kam To and Sha Tau Kok. Any selection up to all eight appears in the comparison. Clearing the selection restores Lo Wu/Lok Ma Chau Spur Line.
- The trend line uses the latest N distinct dates available across all selected borders, not N separately chosen dates per border. The Monday–Sunday bars query the previous complete Hong Kong calendar week separately and show actual daily counts, not weekday means. Valid published zero counts are retained; absent records have no bar rather than a fabricated zero. Weekly coverage is shown out of seven days.

No causal claim, prediction model or statistical-significance claim. Weekday, holiday, seasonal and serial-correlation confounding remain. See `WEATHER_ANALYSIS.md`.

## Removed from the larger version

Inbound passenger/visitor analysis modes, three extra MTR stations/directions, multi-station weather archive, historical temperature correlation, Spearman and weekday-centred coefficients, hourly MTR/rain association, heatmap, clearance/passenger correlation, ranking, pie chart, detail tables, custom JSON HTTP APIs and the separate query/dashboard editor tabs. Bidirectional resident clearance and eight-border outbound passenger collection are present in this revision.

The prior full package is saved locally in `backups/border-full-169-nodes.zip` and excluded from the deliverable and Docker image. Existing MongoDB data and the teacher's Temperature sample are preserved.

## Run and update

The current Mac instance uses `../comp7503-platform/compose.yaml` (`comp7503-assignment`). Main UI: http://127.0.0.1:1880/ui/; editor: http://127.0.0.1:1880/; existing Mongo Express: http://127.0.0.1:8081/ → `border_insights`.

```sh
python3 build_flow.py
python3 deploy.py
```

The exported flow is self-contained: no runtime local JS files are needed after import. The Dockerfile installs classic `node-red-dashboard@3.6.6` and `node-red-contrib-mongodb3@2.0.1`. URI inside Docker: `mongodb://mongodb:27017/border_insights`.

`deploy.py` replaces only this project's old/new editor and Dashboard configuration using known stable IDs, keeps revision checking, and backs up the prior flow. It removes obsolete full-version collectors instead of running both editions. Do not import a duplicate alongside the old application.

On a new machine run `sh start.sh`; do not start a second stack on the current occupied port. Existing data-volume flows are not overwritten by an image rebuild. See `SERVER_DEPLOYMENT.md`. Classic Dashboard is used for course compatibility; keep the editor private.

For friends or graders, `compose.pull.yaml` and `start-pull.sh` provide a build-free fresh installation of `aazyx774/comp7503-border:1.2.0`. Follow `DEPLOY_FROM_HUB.md` and check publication status in `VALIDATION.md`. The image includes a checksum-verified public historical snapshot: 3,226 passenger and 365 rainfall records. Startup fills missing records without replacing existing IDs. The same `dataset/` is included in the ZIP for grading; see `HISTORICAL_DATA.md`. No credentials, unrelated data or live snapshots are published.

For an existing standalone cloud instance with the editor disabled, upload the new export and `upgrade.sh` into the existing project directory, preserve the server's Compose/security configuration, and run `sh upgrade.sh`. It backs up the stored flow, merges only project-owned nodes, preserves unrelated nodes and MongoDB volumes, and recreates Node-RED without rebuilding its image. Use `sh upgrade.sh -f compose.yaml -f compose.hub.yaml` with the existing `BORDER_IMAGE` when that was the original deployment. Do not edit/deploy concurrently. Errors now also reach Docker logs.

## Sources and deliverables

- MTR: https://data.gov.hk/en-data/dataset/mtr-data2-nexttrain-data
- Clearance: https://data.gov.hk/en-data/dataset/hk-immd-set28-land-boundary-control-points-waiting-time
- Daily passengers: https://data.gov.hk/en-data/dataset/hk-immd-set5-statistics-daily-passenger-traffic
- Current weather: https://data.gov.hk/en-data/dataset/hk-hko-rss-current-weather-report
- HKO daily rain: https://data.weather.gov.hk/weatherAPI/cis/csvfile/SSH/ALL/daily_SSH_RF_ALL.csv

Provider data belong to MTR, the Immigration Department and HKO. Educational, unofficial use only. The package contains the exported flow, Docker description, editable sources and a report outline, **not a completed group report or final course submission**.
