# Compact report outline

This is not the finished group report.

1. **Use case and scope**: resident arrival/departure clearance at Lo Wu/Lok Ma Chau Spur Line plus outbound HK-resident passenger comparisons across eight land borders; no claim to an end-to-end route optimiser.
2. **Data sources**: MTR, Immigration and HKO catalogue/dictionary references; polling versus publication frequency; current district rain versus historical station rain.
3. **Node design**: one editor tab, 70 nodes including configuration and five editor groups. Explain five acquisition branches and shared MongoDB query/display branches for three Dashboard pages. Include an editor screenshot.
4. **Storage and reproducibility**: five collections, deterministic upsert keys, timestamps, indexes, persistent Docker volumes and 14-day TTL for rail/clearance/current-weather records. Explain the submitted bounded passenger/rainfall dataset, manifest checksums, original dates and non-overwriting startup restore.
5. **Live Connections**: independent arrival/departure grades on each of the two clearance/train cards, train table, current weather and rail-history chart. Explain stale/missing values, non-service hours and source limitations.
6. **Passenger & Rainfall**: daily passenger chart/means, 30/90/365-day filters, same-date rainfall join, Pearson r and wet/dry averages. Show actual dates and pair counts; explain the publication lag.
7. **Border Traffic Trends**: select multiple land borders (up to all eight), compare daily counts over 30/90/365 data dates and actual Monday–Sunday counts for the previous complete Hong Kong calendar week. Show the separate date ranges and weekly coverage; distinguish missing records from published zeros.
8. **Findings**: use real collected results and screenshots. Correlation is descriptive, not causal or necessarily significant. A near-zero coefficient is a valid finding.
9. **Validation and limitations**: reproduce the documented tests, acknowledge weather proxies/confounding/ETA horizon, and state what was not tested.
10. **Deployment and contributions**: exported flow, versioned Docker image/description, historical dataset and restoration steps, private runtime access, group member work and references. The source image repository is public; the running editor should remain private. The original Temperature example is not this project's new contribution.

Submit the flow, Docker Hub ID or Docker description, and the completed report together. Do not describe removed full-version features as implemented in the compact edition.
