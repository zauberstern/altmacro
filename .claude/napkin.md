# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-10-27] A number on the page comes from a file**
   Do instead: leave the point blank when the catalog row is missing. Do not interpolate.
2. **[2026-10-27] Scenario dates do not rewrite history**
   Do instead: the series before the decision month equals the published series.
3. **[2026-10-27] See the test fail before writing the fix**
   Do instead: run the single test, keep the failure, then change production code.

## Shell & Command Reliability
1. **[2026-10-27] WRDS pulls stop before a denied schema**
   Do instead: run `python scripts/dump_catalog.py --gate` and skip any table marked denied.
2. **[2026-10-27] Large firm tables stay on the server**
   Do instead: aggregate `global_factor` and `g_funda` in SQL. Do not download the firm extract.

## Domain Behavior Guardrails
1. **[2026-10-27] France opens the screen**
   Do instead: default country FRA and the last month on or before the pull date that has `ltgdr`.
2. **[2026-10-27] Euro members have no nominal devaluation**
   Do instead: hide that control when the country is in the euro.
3. **[2026-10-27] A constant-within-year column is annual**
   Do instead: draw it once for the year, not as twelve monthly prints.
4. **[2026-10-27] Yield and spread do not share one axis**
   Do instead: draw the yield on the chart and put the spread in the rail.
5. **[2026-10-27] The last month cannot play a card**
   Do instead: disable it with "Pick an earlier month. Today is already the last point."
6. **[2026-10-27] Bare ISO codes stay out of the first five names**
   Do instead: show a country name, and keep France first.
7. **[2026-10-27] Share confirms the copy**
   Do instead: after the copy, the button reads "Link copied."
8. **[2026-10-27] A play changes today and leaves the past**
   Do instead: move the last point only. Every earlier published point stays.

## User Directives
1. **[2026-10-27] No em dash in user-facing copy**
   Do instead: use a period, a comma, or parentheses.
2. **[2026-10-27] Secrets stay out of git**
   Do instead: never commit `.env`, `.env_wrds`, or a service-role key.
