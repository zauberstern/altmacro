#!/usr/bin/env python3
"""Gate, then pull the country panel this page can show.

--gate writes catalog rows and exits before any parquet write.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path("/Volumes/extension!/datasets/data/altmacro")
CATALOG = OUT / "catalog.json"
PANEL = ROOT / "public" / "data" / "panel.json"
ASOF = date(2026, 10, 27)
ENV = Path("/Users/kartik/thesis_lseg_enrich/.env_wrds")

JOBS = [
    {
        "id": "ecind",
        "schema": "comp",
        "table": "g_ecind_mth",
        "sql": """
            SELECT econiso, datadate, ltgdr, stgdr, cpir, unemp1, cabgdp1,
                   gdpn1, gdpr1, cpi1, popt, mbroad1, ip1
            FROM comp.g_ecind_mth
            WHERE datadate <= %s
        """,
        "params": (ASOF,),
    },
    {
        "id": "ecind_desc",
        "schema": "comp",
        "table": "g_ecind_desc",
        "sql": """
            SELECT econiso, econind, eiunit, eidesc
            FROM comp.g_ecind_desc
            WHERE econind IN ('LTGDR','STGDR','CPIR','UNEMP1','CABGDP1','GDPN1','GDPR1')
        """,
        "params": (),
    },
    {
        "id": "windices_m",
        "schema": "wrdsapps_windices",
        "table": "mwcountryreturns",
        "sql": "SELECT fic, date, country, currency, mportret, mportretx FROM wrdsapps_windices.mwcountryreturns",
        "params": (),
    },
    {
        "id": "fx_usd",
        "schema": "comp",
        "table": "g_exrt_mth",
        "sql": """
            SELECT datadate, fromcurm, tocurm, exratm
            FROM comp.g_exrt_mth
            WHERE datadate <= %s
              AND (fromcurm = 'USD' OR tocurm = 'USD')
        """,
        "params": (ASOF,),
    },
    {
        "id": "listed_leverage",
        "schema": "comp",
        "table": "g_funda",
        "sql": """
            SELECT fic, fyear,
                   sum(at) AS at,
                   sum(coalesce(dltt,0) + coalesce(dlc,0)) AS debt,
                   count(*) AS n
            FROM comp.g_funda
            WHERE indfmt = 'INDL' AND datafmt = 'HIST_STD' AND consol = 'C' AND popsrc = 'I'
              AND fic IS NOT NULL AND fyear IS NOT NULL AND at > 0
            GROUP BY fic, fyear
        """,
        "params": (),
        "fallback_sql": """
            SELECT fic, fyear,
                   sum(at) AS at,
                   sum(coalesce(dltt,0) + coalesce(dlc,0)) AS debt,
                   count(*) AS n
            FROM comp.g_funda
            WHERE fic IS NOT NULL AND fyear IS NOT NULL AND at > 0
            GROUP BY fic, fyear
        """,
    },
    {
        "id": "listed_equity",
        "schema": "contrib_global_factor",
        "table": "global_factor",
        "sql": """
            SELECT excntry,
                   date_trunc('month', eom)::date AS month,
                   sum(ret_local * me) / nullif(sum(me), 0) AS ret_vw,
                   sum(me) AS me
            FROM contrib_global_factor.global_factor
            WHERE excntry IS NOT NULL AND eom IS NOT NULL AND me > 0 AND ret_local IS NOT NULL
            GROUP BY 1, 2
        """,
        "params": (),
    },
]


def load_env() -> dict[str, str]:
    vals: dict[str, str] = {}
    for line in ENV.read_text().splitlines():
        if not line.strip() or "=" not in line or line.strip().startswith("#"):
            continue
        k, v = line.split("=", 1)
        vals[k.strip()] = v.strip().strip('"')
    return vals


def connect():
    deps = Path("/Users/kartik/thesis_lseg_enrich/.python_deps")
    if str(deps) not in sys.path:
        sys.path.insert(0, str(deps))
    import psycopg2

    vals = load_env()
    conn = psycopg2.connect(
        host="wrds-pgdata.wharton.upenn.edu",
        port=9737,
        dbname="wrds",
        user=vals["WRDS_USERNAME"],
        password=vals["WRDS_PASSWORD"],
        sslmode="require",
        connect_timeout=30,
    )
    conn.set_session(readonly=True, autocommit=True)
    return conn


def probe(cur, job: dict) -> dict:
    cur.execute("SET statement_timeout = '20000'")
    row = {
        "id": job["id"],
        "schema": job["schema"],
        "table": job["table"],
        "entitlement": "readable",
        "note": "gate only",
        "asof": datetime.now(timezone.utc).isoformat(),
    }
    try:
        cur.execute(f"SELECT 1 FROM {job['schema']}.{job['table']} LIMIT 1")
        cur.fetchone()
    except Exception as exc:
        row["entitlement"] = "denied"
        row["note"] = str(exc).splitlines()[0][:240]
    return row


def gate() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    conn = connect()
    cur = conn.cursor()
    rows = [probe(cur, job) for job in JOBS]
    conn.close()
    CATALOG.write_text(json.dumps(rows, indent=2))
    denied = [r["id"] for r in rows if r["entitlement"] != "readable"]
    print(f"gate wrote {CATALOG} denied={denied}")
    return 0


def fetch_frame(cur, job: dict):
    import pandas as pd

    cur.execute("SET statement_timeout = '180000'")
    try:
        cur.execute(job["sql"], job["params"])
    except Exception:
        fb = job.get("fallback_sql")
        if not fb:
            raise
        cur.execute(fb, job["params"])
    cols = [d[0] for d in cur.description]
    return pd.DataFrame(cur.fetchall(), columns=cols)


def annualize(df, cols: list[str]):
    """A column that is identical inside a country-year is annual, not monthly."""
    import pandas as pd

    df = df.copy()
    df["year"] = pd.to_datetime(df["datadate"]).dt.year
    flags = {}
    for col in cols:
        nunq = df.groupby(["econiso", "year"])[col].nunique(dropna=True)
        flags[col] = set(nunq[nunq <= 1].index.tolist())
    return flags


def build_panel(frames: dict) -> dict:
    import pandas as pd

    eco = frames["ecind"].copy()
    eco["datadate"] = pd.to_datetime(eco["datadate"])
    eco = eco[eco["datadate"] <= pd.Timestamp(ASOF)]
    flags = annualize(eco, ["cpir", "unemp1", "cabgdp1", "gdpn1", "gdpr1"])

    def series(df, col, annual_keys):
        out = []
        for rec in df[["datadate", col]].dropna().itertuples(index=False):
            year = rec.datadate.year
            if (df.name if False else None):
                pass
            key = None
            out.append({"d": rec.datadate.strftime("%Y-%m-%d"), "v": float(rec[1])})
        # mark annual repeats: keep December, or the last month if December is absent
        if not annual_keys:
            return out
        kept = []
        by_year: dict[int, list] = {}
        for row in out:
            y = int(row["d"][:4])
            by_year.setdefault(y, []).append(row)
        for y, rows in by_year.items():
            if (None, y) in annual_keys or True:
                dec = [r for r in rows if r["d"].endswith("-12-31") or r["d"][5:7] == "12"]
                kept.append(dec[-1] if dec else rows[-1])
                kept[-1]["annual"] = True
        return kept

    countries: dict = {}
    for iso, g in eco.groupby("econiso"):
        g = g.sort_values("datadate")
        block = {"iso": iso, "lines": {}}
        for col, annual in (
            ("ltgdr", False),
            ("stgdr", False),
            ("cpir", True),
            ("unemp1", True),
            ("cabgdp1", True),
            ("gdpn1", True),
            ("gdpr1", True),
        ):
            rows = []
            sub = g.dropna(subset=[col])
            if sub.empty:
                continue
            if annual:
                sub = sub.copy()
                sub["year"] = sub["datadate"].dt.year
                nunq = sub.groupby("year")[col].nunique()
                annual_years = set(nunq[nunq <= 1].index.tolist())
                for year, yg in sub.groupby("year"):
                    if year in annual_years:
                        last = yg.iloc[-1]
                        rows.append({
                            "d": last["datadate"].strftime("%Y-%m-%d"),
                            "v": float(last[col]),
                            "annual": True,
                        })
                    else:
                        for _, rec in yg.iterrows():
                            rows.append({"d": rec["datadate"].strftime("%Y-%m-%d"), "v": float(rec[col])})
            else:
                for _, rec in sub.iterrows():
                    rows.append({"d": rec["datadate"].strftime("%Y-%m-%d"), "v": float(rec[col])})
            if rows:
                block["lines"][col] = rows
        if block["lines"]:
            countries[iso] = block

    # German yield joined onto France as a comparison line
    if "FRA" in countries and "DEU" in countries and "ltgdr" in countries["DEU"]["lines"]:
        deu = {r["d"]: r["v"] for r in countries["DEU"]["lines"]["ltgdr"]}
        spread = []
        for row in countries["FRA"]["lines"].get("ltgdr", []):
            if row["d"] in deu:
                spread.append({"d": row["d"], "v": round((row["v"] - deu[row["d"]]) * 100, 2)})
        countries["FRA"]["lines"]["oat_bund_bps"] = spread
        countries["FRA"]["lines"]["bund_ltgdr"] = [
            {"d": d, "v": v} for d, v in sorted(deu.items())
        ]

    names = {
        "FRA": "France",
        "DEU": "Germany",
        "GBR": "United Kingdom",
        "USA": "United States",
        "JPN": "Japan",
        "ITA": "Italy",
        "ESP": "Spain",
    }
    euro = {"FRA", "DEU", "ITA", "ESP", "NLD", "BEL", "AUT", "FIN", "IRL", "PRT", "GRC", "SVK", "SVN", "EST", "LVA", "LTU", "LUX", "CYP", "MLT"}
    for iso, block in countries.items():
        block["name"] = names.get(iso, iso)
        block["euro"] = iso in euro

    fra_months = [r["d"] for r in countries.get("FRA", {}).get("lines", {}).get("ltgdr", [])]
    fra_months = [d for d in fra_months if d <= ASOF.isoformat()]
    default_month = fra_months[-1] if fra_months else None

    wind = frames.get("windices_m")
    if wind is not None and not wind.empty:
        wind = wind.copy()
        wind["date"] = pd.to_datetime(wind["date"])
        wind = wind[wind["date"] <= pd.Timestamp(ASOF)]
        for fic, g in wind.groupby("fic"):
            if fic not in countries:
                countries[fic] = {"iso": fic, "name": fic, "euro": fic in euro, "lines": {}}
            rows = []
            for _, rec in g.dropna(subset=["mportret"]).sort_values("date").iterrows():
                rows.append({"d": rec["date"].strftime("%Y-%m-%d"), "v": float(rec["mportret"])})
            if rows:
                countries[fic]["lines"]["mportret"] = rows
            if "country" in g.columns and fic in countries:
                countries[fic]["name"] = str(g["country"].iloc[0]).title()

    return {
        "asof": ASOF.isoformat(),
        "default": {"country": "FRA", "month": default_month},
        "sources": {
            "ltgdr": "comp.g_ecind_mth.ltgdr",
            "oat_bund_bps": "FRA.ltgdr minus DEU.ltgdr, basis points",
            "mportret": "wrdsapps_windices.mwcountryreturns.mportret",
        },
        "countries": countries,
        "notes": [
            "Dates after 2026-10-27 are excluded.",
            "A column that does not change inside a year is marked annual.",
            "France opens the screen. The OAT-Bund spread is French 10-year minus German 10-year.",
        ],
    }


def main() -> int:
    if "--gate" in sys.argv:
        return gate()
    if not CATALOG.exists():
        print("missing gate catalog; run --gate first", file=sys.stderr)
        return 2
    catalog = json.loads(CATALOG.read_text())
    denied = {r["id"] for r in catalog if r["entitlement"] != "readable"}
    conn = connect()
    cur = conn.cursor()
    frames = {}
    OUT.mkdir(parents=True, exist_ok=True)
    for job in JOBS:
        if job["id"] in denied:
            print("skip denied", job["id"])
            continue
        print("fetch", job["id"], flush=True)
        df = fetch_frame(cur, job)
        dest = OUT / f"{job['id']}.parquet"
        df.to_parquet(dest, index=False)
        frames[job["id"]] = df
        for row in catalog:
            if row["id"] == job["id"]:
                row["rows"] = int(len(df))
                row["path"] = str(dest)
                row["entitlement"] = "readable"
                row["note"] = "fetched"
    conn.close()
    CATALOG.write_text(json.dumps(catalog, indent=2))
    panel = build_panel(frames)
    PANEL.parent.mkdir(parents=True, exist_ok=True)
    PANEL.write_text(json.dumps(panel))
    print(f"panel {PANEL} countries={len(panel['countries'])} default={panel['default']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
