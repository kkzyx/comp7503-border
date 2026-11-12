# Compact analysis method

## Daily rainfall and passengers

The scope is outbound Hong Kong residents, Lo Wu or Lok Ma Chau Spur Line. The chart shows the most recent 30/90/365 passenger data days. The rainfall analysis instead takes the latest 30/90/365 available Sheung Shui rainfall dates, then looks up the same border's passenger document on each exact Hong Kong date. This deliberately avoids pairing today's weather with yesterday's traffic or dropping all pairs because weather is published later.

Only numeric, complete (`C`) daily rainfall observations and existing passenger records are used. Missing/incomplete rain is excluded, not filled with zero. Dates and actual sample count appear on screen. At least 30 pairs and nonzero variance in both variables are required for Pearson r.

Rain >=1 mm defines a wet day for the descriptive wet/dry means. Both group counts are shown. Neither r nor mean differences establish causation or significance. No holiday, seasonal or weekday adjustment is applied. Weekday/weekend means elsewhere are simple descriptive summaries, not a regression control.

## Current weather context

The current HKO report provides Ta Kwu Ling temperature and the `North District` rainfall row's `max` field for its stated past-hour interval. This is district maximum rainfall, **not a station reading or daily total**. It is not substituted into the historical daily analysis.

The dashboard labels the regional station/district, source observation time and units. A current value needs numeric valid data, source age <=90 minutes and acquisition age <=45 minutes; missing/stale values display —. Regional proxies do not measure conditions at the actual checkpoint.

## Rail / clearance context

Rail predictions are extracted from Sheung Shui UP records destined for LOW/LMC. Only valid numeric predictions participate in the six-hour historical chart, grouped into five-minute means. Missing matching predictions are not assigned zero and do not imply a closed service. Predictions are not actual delays or occupancy.

Clearance grades are read for resident arrivals and departures at LWS/LSC and saved with distinct direction keys. Each card independently looks up and checks each direction; missing arrival data never borrow a departure grade. HTTP Last-Modified is freshness metadata, not a guaranteed business event time. Codes 0/1/2 are Normal/Busy/Very busy; 4 Maintenance and 99 Non-service hours remain separate. These are grades, not exact measured waits. Current cards require trusted source metadata and fresh acquisition. The compact edition does not calculate queue correlations or a composite journey score.

## Border comparison and last complete week

The third page reads outbound passenger records for any selection of the eight land borders. Series show HK residents, not all travellers or current queues. The latest 30/90/365 distinct dates available across the selected borders define one shared date set for the line chart, shown on screen. A missing border/date is null rather than zero; a published zero is a valid observation.

Monday–Sunday bars are actual daily records, not averages. A separate MongoDB facet reads the previous complete Monday–Sunday calendar week relative to the query's current Hong Kong date (UTC+8), not the newest published record. The current week is always excluded, including all of Sunday. For example, 12 November 2026 and 15 November 2026 both show 2–8 November; 16 November 00:00 HK advances to 9–15 November. This range is independent of the line chart's history filter and is recomputed on each historical refresh. No record for a day yields null, with coverage shown as observed days out of seven; no earlier week is substituted. These comparisons do not adjust for holidays, closures or seasons and do not predict future demand. Original Passenger & Rainfall filters and calculations are unchanged.
