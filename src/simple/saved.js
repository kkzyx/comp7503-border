const health = flow.get('collectionHealth') || {};
const name = msg.sourceName || 'collection';
health[name] = {savedAt: new Date().toISOString(), error: null};
flow.set('collectionHealth', health);
node.status({fill: 'green', shape: 'dot', text: `${name}: saved`});
return null;
