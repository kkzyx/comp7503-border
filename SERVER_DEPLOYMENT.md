# Private server deployment

No agent-run Huawei Cloud deployment or Docker Hub publication has been performed. Local full-stack verification is ARM64. On 12 November 2026 the user reported successful downloads of both Immigration sources on their Huawei Cloud server using IPv4-first with network-family autoselection disabled; this is not yet verification of the cloud Flow's ingestion or Dashboard recovery.

## Start

Install Docker Engine and Compose using https://docs.docker.com/engine/install/ . Verify provider and registry HTTPS access from the actual server region. Upload this project without `backups/`.

```sh
sh start.sh
docker compose ps
curl -fsS http://127.0.0.1:1880/ui/ >/dev/null
docker compose logs --tail=60 nodered
```

Use `.env` with `BORDER_PORT=1882` if 1880 is occupied. The 1.2.0 image restores the bundled historical snapshot before starting the 70-node flow, then checks official APIs for updates. HTTP health only proves UI availability: check source saved/error messages and MongoDB data too.

## Immigration connection timeouts

Compose sets `NODE_OPTIONS` to `--dns-result-order=ipv4first --no-network-family-autoselection`. This applies the connection settings that succeeded in the user's cloud download tests to the running Node-RED process, not only a diagnostic subprocess. It prefers IPv4 and disables automatic address-family racing; it does not disable TLS verification or retry missed observations.

For an existing deployment, add this environment value under the `nodered` service, retaining any other required Node options. Recreate that service with its existing volumes and image:

```sh
docker compose up -d --no-build --force-recreate nodered
docker compose exec -T nodered node -p 'process.env.NODE_OPTIONS'
```

If using Docker Hub, retain `-f compose.yaml -f compose.hub.yaml` and `BORDER_IMAGE` as in the original deployment. A plain `docker compose restart` does not apply changed environment configuration. Do not delete volumes. Startup triggers fresh collection; after roughly a minute check `passengers` counts and the latest resident snapshot's `observedAt` and `sourceFresh`, then refresh the Dashboard. Successful diagnostic downloads alone do not prove Flow parsing and database writes succeeded.

Do not expose 1880/27017/8081 publicly. Allow SSH from trusted sources and connect from your computer:

```sh
ssh -N -L 1888:127.0.0.1:1880 USER@SERVER
```

Open http://127.0.0.1:1888/ui/; select Live Connections, Passenger & Rainfall or Border Traffic Trends. Change the tunnel's right-hand port if the server uses 1882. Public access needs HTTPS, authentication, editor/admin API restrictions and proper Dashboard WebSockets, not a simple public port binding. See https://nodered.org/docs/user-guide/runtime/securing-node-red .

## Transfer local data separately

The 1.2.0 image includes only the bounded public snapshot described in `HISTORICAL_DATA.md`, not the entire accumulated database. The current Mac data belong to `comp7503-assignment`, not the standalone deployment. For additional private backups or live history, transfer data separately; do not publish unreviewed backups.

From this project directory, preferably while writes and editor changes are paused:

```sh
mkdir -p backups
docker compose -f ../comp7503-platform/compose.yaml exec -T mongodb \
  mongodump --db border_insights --archive --gzip > backups/border-local.archive.gz
```

Copy the archive securely to the server. Prefer a new empty database; keep both backups if merging existing collections. Restore without dropping data:

```sh
docker compose stop nodered
docker compose exec -T mongodb mongorestore --archive --gzip \
  --nsInclude='border_insights.*' < backups/border-local.archive.gz
docker compose start nodered
```

Overlapping IDs may be skipped with duplicate errors. A dump during active writes is not a cross-collection point-in-time guarantee. Old rail, clearance and current-weather records expire under their 14-day TTL indexes after migration. Do not publish unreviewed backups to Docker Hub.

## Upgrade and back up

`sh backup.sh` targets this standalone Compose. For the current Mac stack explicitly use the older platform Compose path above. Verify restore before relying on a backup. `docker compose down` retains volumes; **do not use `down -v` on a real deployment**.

### Existing cloud deployment, including a disabled editor

Upload only the new `Border.Insights.Flow.json` and `upgrade.sh` into the server's existing project directory. Keep its working Compose files, access controls, Node options, image name, project name and data volumes. Do not overwrite a customised server directory wholesale or enable the public editor merely to upgrade. Pause other editor/deployment activity during this procedure.

From that directory, as the same Docker-capable user used for the original deployment:

```sh
sh upgrade.sh
```

If the original deployment uses the Hub override, retain the same exported `BORDER_IMAGE` and run:

```sh
sh upgrade.sh -f compose.yaml -f compose.hub.yaml
```

The script copies the new self-contained export, backs up `/data/flows.json` under `/data/border-backups/`, merges only this project's known editor/UI nodes and recreates Node-RED using its current image without rebuilding. Unrelated nodes, settings, credentials and MongoDB volumes are not deleted. No admin HTTP API is needed. The installed image must already contain the project's existing Dashboard/MongoDB node packages, as the previous compact image does.

Wait for startup collection, refresh the browser and confirm all three pages. Check `docker compose logs --tail=100 nodered` for collection/query errors; the project error Debug node now writes to Docker logs as well as the editor sidebar. Confirm four fresh resident snapshots (two ports, two directions) and recent passenger records for the eight land borders. API failures are still retried at the next scheduled collection, not by a new retry queue.

For rollback, with no concurrent editor activity, copy the printed backup path back to `/data/flows.json` using `docker compose exec -T nodered cp BACKUP_PATH /data/flows.json`, then restart Node-RED. MongoDB data remain intact. Keep the same `-f` options for Hub deployments.

### Local development with an enabled editor

```sh
python3 build_flow.py
docker compose up -d --build --wait --wait-timeout 240
python3 deploy.py --url http://127.0.0.1:1880
```

Run the deployment script on the server, or use its SSH-tunnel URL from the Mac. An existing `/data/flows.json` is intentionally not overwritten by rebuilding the image. Keep the same project name to reuse the same volumes.

## Optional Docker Hub

Server-side building is sufficient. Publishing is optional and requires your own authenticated repository. Multi-architecture example (not executed):

```sh
docker login
docker buildx build --platform linux/amd64,linux/arm64 \
  -t USERNAME/comp7503-border:1.2.0 --push .
```

On the server:

```sh
export BORDER_IMAGE=USERNAME/comp7503-border:1.2.0
docker compose -f compose.yaml -f compose.hub.yaml pull
docker compose -f compose.yaml -f compose.hub.yaml up -d --no-build --wait --wait-timeout 240
```

Keep the same two Compose file options for subsequent operations. The MongoDB image and its data volume remain separate from the application image.
