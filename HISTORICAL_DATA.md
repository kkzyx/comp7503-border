# Historical dataset and grading reproduction

## Public snapshot

`dataset/history.json.gz` is gzip-compressed UTF-8 JSON, not a complete private database backup. It contains a `metadata` object and `collections.passengers` / `collections.weather` arrays. `dataset/manifest.json` documents SHA-256 checksums, original official source URLs, row counts, date ranges and the export timestamp.

| Collection | Scope | Dates | Records |
| --- | --- | --- | --- |
| passengers | Eight land borders; departure only; all published traveller categories retained | 2025-10-01 to 2026-11-11 | 3,226 |
| weather | Sheung Shui daily rainfall, including original completeness flags | 2025-10-01 to 2026-09-30 | 365 |

Archive size: 82,409 bytes; uncompressed JSON: 1,351,166 bytes. Exported on 12 November 2026 UTC. Dates and measurements were taken from real stored official-source records, not generated fixtures. Only whitelisted historical fields are included. There are no login credentials, MongoDB users, HTTP headers, unrelated collections or stale live snapshots.

The rainfall range provides 365 valid same-date passenger/rainfall pairs for Lo Wu and Lok Ma Chau Spur Line at export time. Passenger history extends further to support the latest 365-date line chart and the complete week of 2–8 November 2026. Missing checkpoint dates remain missing; published zeros remain zeros.

## Automatic restoration

The `1.2.0` application image includes this dataset. Use `compose.pull.yaml` and `sh start-pull.sh`. MongoDB starts first; the application entrypoint verifies checksums and imports missing records before starting Node-RED. Once both images are available locally, use `BORDER_SKIP_PULL=1 sh start-pull.sh` to skip registry access during an offline start. An internet connection is not needed to restore or analyse the included history, although live collection will correctly report unavailable sources.

Imports use deterministic `_id` values and `$setOnInsert` upserts. Repeated starts do not duplicate records or overwrite an existing database record. Interrupted imports can be repeated safely. Original `date` and `fetchedAt` fields are restored as BSON dates; they are not changed to the current time.

To repeat an import in an existing running deployment:

```sh
docker compose -f compose.pull.yaml exec -T -e BORDER_SEED_HISTORY=missing nodered node /opt/border/seed-history.js
```

Use the same Compose options as the installation. To inspect the included snapshot without MongoDB, decompress `dataset/history.json.gz` with any gzip/JSON tool. The ZIP includes the dataset separately so grading is not dependent on a private server or a registry being online.

## Expected historical results

On Passenger & Rainfall, select Lo Wu and 365 data days. For this snapshot, the rainfall analysis has 365 valid pairs spanning 2025-10-01 to 2026-09-30 with Pearson r approximately -0.068278. Lok Ma Chau Spur Line has r approximately -0.097816. These values describe association, not causation. Online source updates can legitimately change the displayed analysis later; preserve the snapshot, export date and report screenshots for fixed-result comparison.

The Monday–Sunday bar chart intentionally follows the previous complete week relative to current Hong Kong time. After the snapshot's last date, its records may not cover that week. It must show gaps until new official data arrive, never substitute the snapshot week and label it current. Other historical visualizations use available data dates and remain reproducible offline.

## Live retention and limitations

MTR raw snapshots expire 14 days after `sampledAt`; clearance snapshots expire 14 days after `sampledAt`; current weather expires 14 days after `observedAt`. MongoDB's TTL monitor removes eligible records asynchronously, not precisely on the expiry second. These indexes bound ongoing live storage. Daily passenger and rainfall archives are retained for historical analysis and are not subject to these TTL indexes.

Live observations are not seeded. Offline starts correctly show unavailable live cards and collection errors, while the historical data remain usable. Reconnect to official APIs to collect fresh rail/clearance/weather information. Regional weather proxies and source publication lag remain limitations.

## Refreshing the submission dataset

From the editable project source, against a running Node-RED container on the project MongoDB network:

```sh
python3 export_dataset.py --container YOUR_NODE_RED_CONTAINER
```

The exporter takes the latest 365 rainfall dates and enough passenger records to cover those dates and the latest 365 distinct passenger dates. It validates passenger totals, whitelists fields and writes the archive/manifest. Rebuild and retest the image and update this document's dates/counts before publishing a different snapshot. A later live download is not a replacement for submitting the snapshot used in the report.
