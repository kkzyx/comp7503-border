#!/bin/sh
set -eu
cd "$(dirname "$0")"
docker compose "$@" cp Border.Insights.Flow.json nodered:/tmp/border-incoming-flow.json
docker compose "$@" exec -T nodered node <<'JS'
const fs = require('node:fs');
const crypto = require('node:crypto');
const identifier = name => crypto.createHash('sha1').update('comp7503-border:' + name).digest('hex').slice(0, 16);
const incoming = JSON.parse(fs.readFileSync('/tmp/border-incoming-flow.json', 'utf8'));
const existing = JSON.parse(fs.readFileSync('/data/flows.json', 'utf8'));
if (!Array.isArray(existing) || !Array.isArray(incoming) || incoming.length < 30 || incoming.length > 70) throw new Error('Unexpected flow format or size');
const incomingIds = new Set(incoming.map(node => node.id));
if (incomingIds.size !== incoming.length || !incoming.some(node => node.type === 'tab' && node.id === identifier('tab'))) throw new Error('Invalid project export');
for (const node of incoming) {
    for (const output of node.wires || []) {
        if (output.some(target => !incomingIds.has(target))) throw new Error('Export contains a missing wire target');
    }
}
const tabs = new Set(['tab', 'api-tab', 'ui-flow-tab'].map(identifier));
const pages = new Set(['dashboard-tab', 'dashboard-tab-traffic', 'dashboard-tab-patterns', 'dashboard-tab-trends'].map(identifier));
const groups = new Set(existing.filter(node => node.type === 'ui_group' && pages.has(node.tab)).map(node => node.id));
const removed = new Set([...incomingIds, ...tabs, ...pages, ...groups]);
const retained = existing.filter(node => !removed.has(node.id) && !tabs.has(node.z));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync('/data/border-backups', {recursive: true});
const backup = `/data/border-backups/flows-before-upgrade-${stamp}.json`;
fs.copyFileSync('/data/flows.json', backup);
fs.writeFileSync('/data/flows.border-next.json', JSON.stringify([...retained, ...incoming], null, 2) + '\n');
fs.renameSync('/data/flows.border-next.json', '/data/flows.json');
console.log('Flow backup:', backup);
console.log(`Installed ${incoming.length} project nodes; preserved ${retained.length} unrelated nodes.`);
JS
docker compose "$@" up -d --no-build --force-recreate --wait --wait-timeout 240 nodered
printf '\nUpgrade complete. Refresh the Dashboard. Check API errors and database timestamps.\n'
