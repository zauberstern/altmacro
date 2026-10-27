# Cuts

The firm-level `global_factor` extract was not stored. The country-month value-weighted return is `listed_equity.parquet`.

`g_funda` was aggregated in SQL to assets and debt by country and year. The firm rows were not stored.

Dates after 2026-10-27 were dropped, including the 31 October 2026 yield row.

Datastream economics, Markit, FISD, and CRSP Treasury returns were not fetched. The gate found the tables in this pull readable. Earlier probes had denied the underlying schemas for those other products. They are not in this catalog.
