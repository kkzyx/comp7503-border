# Compact edition validation — 12 November 2026

## Scope

- Export: **70 nodes total** (previous compact version: 63), including one editor tab, one MongoDB config, three Dashboard tabs, five UI groups, five editor groups, four native charts, eight templates and four dropdowns. Exactly seven nodes were added for the third page; existing visualizations were retained.
- The 63-node package is archived locally as `backups/border-63-nodes-before-trends-20261112.zip`; the older 169-node archive also remains. Neither archive nor database backups are shipped in the deliverable/image.
- The prior two-border/weekday-mean 70-node package is archived as `backups/border-70-before-full-week-20261112.zip`. Multi-select and last-complete-week changes add no nodes.
- Main environment: Docker Desktop ARM64; Node-RED 5.0.9, MongoDB 7.0.45, Dashboard 3.6.6, mongodb3 nodes 2.0.1. The teacher's 25 Temperature example nodes remain unchanged and are not included in the 70-node project count. No collection was dropped.

## Automated and data checks

- All generated Function bodies compile. IDs, wire targets, same-tab connections, editor group membership and the 30–70-node limit were checked.
- The official daily CSV parsed into 17,098 valid departure documents across eight land borders on this date. Existing date/port/direction IDs are retained. Published totals are validated against the three traveller categories.
- Both borders and all 30/90/365 Passenger & Rainfall settings were executed against actual MongoDB (six combinations). Daily records, rainfall pairs, and the first two formatted outputs match the pre-change query/formatters exactly against the same database.
- Lo Wu rainfall Pearson r remains -0.06827803088214673 for 365 pairs; Lok Ma Chau Spur Line remains -0.09781566388552104. Rainfall pairs end 2026-09-30; latest daily passenger date is 2026-11-11. These are intentionally separate displayed ranges.
- One-border, three-border and all-eight selections, each at 30/90/365 trend dates, were queried against real MongoDB. All daily comparison chart outputs match the prior version for the same selections. Each weekly series matches a separate direct query for 2026-11-02 to 2026-11-08 and is independent of the history filter. Lo Wu's Mon–Sun values are 73,189 / 73,760 / 73,427 / 75,465 / 93,501 / 117,740 / 78,832 HK-resident departures.
- Hong Kong date-boundary checks cover Thursday 12 November, Sunday 15 November 23:59:59 (both show 2–8 November), Monday 16 November 00:00 (shows 9–15 November), New Year's Day and a week crossing calendar years. Query-computed dates are carried to the formatter; missing records never shift the requested week.
- Real clearance ingestion produced four fresh snapshots: each direction for each railway border. MongoDB lookup groups by both port and direction. The live cards show independently checked arrival/departure labels; both happened to be Normal during the real-data check.
- Current in-memory edge checks cover independent browser state, one/three/eight selected borders, invalid/duplicate options, empty-selection defaults, superseded responses, empty weekly data, published zero, absent daily records, and Monday-first order. Prior live-data checks covered disconnect cleanup, missing direction data and non-service status. Fixtures were not inserted into the main database.
- Existing MTR/weather validation and rainfall minimum-pair/variance rules remain in place; API errors now reach Docker logs as well as the Debug sidebar.

## Browser and deployment

- Current browser inspection confirms three selected borders render matching line/bar series. Selecting all eight retains all eight legends and distinct colors; switching from 30 to 90 dates changes the trend range to 2026-08-14–2026-11-11 while the weekly range remains 2026-11-02–2026-11-08. Missing Lok Ma Chau weekly records show 0/7 coverage, not zero-valued observations; published Sha Tau Kok zeros show 7/7 coverage. The compact summary scrolls for larger selections.
- Native chart routing was corrected, not just template/filter state: two browser sessions were directly inspected with different border pairs. One retained Lok Ma Chau Spur Line/Shenzhen Bay while the other showed Lo Wu/Lok Ma Chau Spur Line, with matching chart legends and summaries. Guarded delayed connect/tab queries restore each browser's state after Classic Dashboard cache replay. This also protects the existing passenger history chart.
- A separate temporary standalone stack booted from the new image with empty volumes and ingested 17,098 real passenger records, 2,099 rainfall records, four clearance snapshots and current weather. Main volumes were not used for this test.
- The temporary stack was then given the old 63-node flow plus two unrelated test nodes and a disabled admin editor. `upgrade.sh` installed the 70-node revision, preserved the unrelated nodes and MongoDB volume, and backed up the old flow. This checks the file-based cloud upgrade route without requiring a public editor.
- Node's IPv4-first/no-family-autoselection environment settings are retained. The user previously reported that these resolved Immigration downloads on their Huawei Cloud host. This new 70-node revision has not been deployed to that cloud host by the agent.

## Previous 1.1.0 local image preparation

- Built the latest full-week/multi-select flow into the local multi-platform image `comp7503-border:1.1.0` for `linux/arm64` and `linux/amd64`. This is a local image name, not a published Hub repository. The flow SHA-256 in both seeded data volumes is `69dd108ff4c107755e061df19c90be7746a848beeb5512af2e5284b82395d1cd`, matching the current export.
- Each application architecture booted separately with a fresh Node-RED volume and a fresh MongoDB database using `compose.pull.yaml`. AMD64 application execution used Docker Desktop emulation on the ARM64 Mac; MongoDB ran natively. This is not a native AMD64 host test.
- Both fresh installations returned HTTP 200 for `/ui/`, installed 70 project nodes with the latest labels, and ingested 17,098 passenger records, 2,099 historical rainfall records, four resident clearance snapshots, two train snapshots and two current weather records. No Node-RED error-level messages occurred during these smoke checks. No collected records were copied from the main database.
- Only the isolated smoke containers, networks and their newly created volumes were removed afterward. The three main assignment containers and their data volumes were not changed.
- Added the build-free pull Compose file, startup script and `DEPLOY_FROM_HUB.md`. Publishing and a registry pull test still require the owner's Docker Hub namespace, repository visibility and authentication; neither is claimed complete.

## Published 1.2.0 release with history

- Public image `aazyx774/comp7503-border:1.2.0` was pushed to Docker Hub on 12 November 2026. Image index digest: `sha256:e414e41929f05839ac913f77e796ebf50d44d5cac4e4b4bedc388cad3c5ae4f8`. Hub's repository API reports `is_private: false`; the tag lists both `linux/amd64` and `linux/arm64`.
- Both platforms were pulled using a temporary empty Docker client configuration, with no Docker Hub user credentials supplied. Existing local layers were reused; these were anonymous registry-access checks, not tests from a second physical machine.
- The reviewed public snapshot has 3,226 passenger records for 2025-10-01–2026-11-11 and 365 rainfall records for 2025-10-01–2026-09-30. Archive checksum, unique IDs, official-source whitelist, passenger totals and absence of credential fields were checked. `dataset/manifest.json` records the original export time, ranges and both compressed/uncompressed hashes.
- Fresh application instances for both architectures were run with empty volumes on an internal-only Docker network, preventing external API access. Each restored exactly 3,226 passenger and 365 weather records before starting the UI, with no live observations seeded. Seeded `date`/`fetchedAt` values were verified as BSON dates. The deployed flow hash on both was `5cd2bc378cd3e288fd8612ffb2cb928990956ab000703a384e0fc25535561bde`; all 70 nodes compile and have valid IDs/wires/groups.
- With only the bundled data, Lo Wu and Lok Ma Chau Spur Line each reproduce 365 same-date rainfall/passenger pairs and the previously documented Pearson coefficients exactly. Eight-border series, Monday-first weekly labels and the current full-week dates were checked. Original history outputs remain unchanged against the pre-change baseline on the main database.
- Reimport inserted zero additional records and left an existing validation marker unchanged; disabling imports was also checked. A deliberately corrupted manifest was rejected before database writes. These fixtures and file modifications existed only in isolated test containers.
- All three live collections have 14-day TTL indexes. Isolated old/fresh timestamp fixtures confirmed automatic removal of expired records and retention of fresh records for MTR, clearance and current weather. Fixtures were removed after testing. Historical daily collections do not receive TTL indexes.
- Browser inspection through a temporary local reverse proxy confirmed that the isolated offline application renders the passenger line, 365-pair correlation, scatter plot, comparison line and full-week bars from the restored snapshot. Collection failures no longer broadcast an empty error payload over historical summaries; live/query errors remain visible in their appropriate views and logs.
- The actual minimal `border-control-pull-install.zip` was extracted into a new temporary directory without the editable project sources. Its unmodified `sh start-pull.sh` pulled the public application and MongoDB images and started a fresh, healthy installation on an alternate local port without a build. This checks the exact friend/TA installation files, not only a development Compose setup.
- Main assignment containers, their existing flow and the teacher's example were not redeployed during publishing. The public image does not automatically update the user's separate Huawei Cloud host. Runtime tests used Docker Desktop ARM64, including AMD64 application emulation, not a native AMD64 cloud machine.

## Deliberate limits

The new trend charts remain **outbound HK residents**, not all travellers or bidirectional passenger analysis. Only the live clearance cards show both directions. There is no new prediction model, causal/statistical-significance claim, hourly passenger feed, queue correlation, ranking, pie chart, heatmap, long-term MTR rollup or custom HTTP API.

The 1.2.0 public release includes a bounded historical dataset and reproducible restoration. No native AMD64 host test or complete group report is claimed. Classic Dashboard is retained for course compatibility; keep its editor private. A running UI/health check alone does not prove successful data acquisition.
