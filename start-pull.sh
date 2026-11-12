#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ "${BORDER_SKIP_PULL:-0}" != '1' ]; then
    docker compose -f compose.pull.yaml pull
fi
docker compose -f compose.pull.yaml up -d --no-build --pull never --wait --wait-timeout 240
printf '\nDashboard: http://127.0.0.1:%s/ui/\n' "${BORDER_PORT:-1880}"
printf 'Bundled history restores before startup. Allow time for fresh live collection and check database records.\n'
