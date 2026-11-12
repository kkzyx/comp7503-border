#!/bin/sh
set -eu
node /opt/border/seed-history.js
if [ ! -f /data/flows.json ]; then
    cp /opt/border/flow.json /data/flows.json
fi
exec /usr/src/node-red/entrypoint.sh "$@"
