#!/bin/sh
set -eu
cd "$(dirname "$0")"
docker compose up -d --build --wait --wait-timeout 240
printf '\nDashboard: http://127.0.0.1:%s/ui/ (Live Connections / Passenger & Rainfall / Border Traffic Trends)\n' "${BORDER_PORT:-1880}"
printf 'Existing data volume flows are preserved. Use python3 deploy.py to apply a flow upgrade.\n'
