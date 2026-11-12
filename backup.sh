#!/bin/sh
set -eu
cd "$(dirname "$0")"
stamp=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
docker compose exec -T mongodb mongodump --db border_insights --archive --gzip > "backups/border-data-$stamp.archive.gz"
docker compose exec -T nodered tar -czf - -C /data . > "backups/nodered-data-$stamp.tar.gz"
printf 'Saved database and Node-RED data to backups/ (%s)\n' "$stamp"
printf 'Node-RED directory is a live copy; pause editor changes while backing up.\n'
