# Deploy the published image

Release image: `aazyx774/comp7503-border:1.2.0`. See `VALIDATION.md` for publication and verification status. This release includes a bounded historical dataset as well as the application.

## Fresh installation

Install Docker with Docker Compose, then put `compose.pull.yaml` and `start-pull.sh` in a new directory. Do not use a directory or Compose project name already used by a different application. The default project name is `comp7503-border`; use a different `COMPOSE_PROJECT_NAME` if necessary.

On macOS/Linux, set the image and start both services:

```sh
sh start-pull.sh
```

The Compose file defaults to this release; set `BORDER_IMAGE` only to override it. If both images are already installed and the registry is unavailable, use `BORDER_SKIP_PULL=1 sh start-pull.sh`. Windows PowerShell users can run Compose directly:

```powershell
docker compose -f compose.pull.yaml pull
docker compose -f compose.pull.yaml up -d --no-build --wait --wait-timeout 240
```

For a private repository, log in with an account granted access before pulling. Open `http://127.0.0.1:1880/ui/`. Set `BORDER_PORT=1882` before starting if 1880 is already occupied. On a remote server, use an SSH tunnel or an authenticated HTTPS reverse proxy; the default port binds only to localhost. MongoDB has no published host port.

## What is included

- The application image contains the latest exported flow and its Dashboard/MongoDB node dependencies. MongoDB runs as a separate service on the same Compose network, reachable as `mongodb`.
- A fresh installation does not require manually importing the flow or installing palette nodes. The entrypoint seeds the flow only when the Node-RED data volume has no `flows.json`.
- The image includes `dataset/history.json.gz` and its checksum/date manifest. Before Node-RED starts, `seed-history.js` restores missing historical records into MongoDB. Existing records with the same IDs are never replaced. The bundled snapshot contains 3,226 daily departure records across eight land borders (2025-10-01 to 2026-11-11) and 365 Sheung Shui rainfall records (2025-10-01 to 2026-09-30). This supports historical charts and 365 same-date rainfall/passenger pairs without a live API download. See `HISTORICAL_DATA.md`.
- No credentials, unrelated collections, private backups or old live snapshots are included. Restored acquisition timestamps remain their original values; historical records are not presented as new live observations.
- When online, passenger/rainfall collectors continue checking official archives and live collectors gather current data. The live train-history chart needs time to accumulate new snapshots. API reachability and publication delays affect current data. An unavailable API produces an error/missing data, not fabricated records.
- MTR snapshots, clearance snapshots and current weather use 14-day TTL indexes. Daily passenger/rainfall history is not expired. Set `BORDER_SEED_HISTORY=off` under the Node-RED environment only if you deliberately do not want bundled history restored.

## Verify collection

```sh
docker compose -f compose.pull.yaml ps
docker compose -f compose.pull.yaml logs --tail=100 nodered
docker compose -f compose.pull.yaml exec -T mongodb mongosh --quiet border_insights --eval 'for (const name of ["passengers", "weather", "snapshots", "mtr_snapshots", "weather_live"]) print(name + ": " + db.getCollection(name).countDocuments());'
```

Check source timestamps and all three pages. Service health alone does not prove collection succeeded. With external API access blocked, the initial counts should be 3,226 passengers and 365 historical weather records. Online counts may be larger. The weekly bar chart uses the previous complete Hong Kong calendar week, not the latest seven available observations; after the snapshot dates it needs newer source records and may correctly show gaps. Use the independent historical line and rainfall analysis to reproduce the bundled snapshot rather than relabelling old observations as the current week.

## Existing installation

Changing or pulling an image does not overwrite an existing Node-RED flow volume. To apply the latest flow to an existing installation, keep its working network/security settings and run the supplied `upgrade.sh` with the same Compose options, for example `sh upgrade.sh -f compose.pull.yaml`. Keep `BORDER_IMAGE` set to the chosen version. Never use `down -v` on an installation whose data you want to retain.

For submission, include the completed project report, exported flow, `dataset/`, `HISTORICAL_DATA.md`, the exact published image reference and these reproduction instructions. The image and the ZIP both carry the same historical dataset. A live server address alone is not a reproducible submission.
