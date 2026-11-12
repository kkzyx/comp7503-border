FROM nodered/node-red:5.0.9

USER root
RUN rm -f /data/flows.json /data/flows_cred.json
USER node-red

RUN npm install --no-audit --no-fund --save-exact node-red-contrib-mongodb3@2.0.1 node-red-dashboard@3.6.6

RUN cd /usr/src/node-red/node_modules/node-red-dashboard && node fixgrid.js

COPY --chown=node-red:node-red Border.Insights.Flow.json /opt/border/flow.json
COPY --chown=node-red:node-red bootstrap.sh /opt/border/bootstrap.sh
COPY --chown=node-red:node-red seed-history.js /opt/border/seed-history.js
COPY --chown=node-red:node-red dataset /opt/border/dataset

LABEL org.opencontainers.image.title="Cross-border Connections" \
      org.opencontainers.image.version="1.2.0" \
      org.opencontainers.image.description="Node-RED dashboards with a bounded official passenger and rainfall history dataset"

ENTRYPOINT ["/bin/sh", "/opt/border/bootstrap.sh"]
