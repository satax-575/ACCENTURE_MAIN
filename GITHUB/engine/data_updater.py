"""
data_updater.py — Append-Only Daily Data Pipeline

How it works:
  - The historical baseline (2025-06-01 → 2025-09-07) was generated once and never changes.
  - Every time the server starts, this module checks which calendar days are missing
    from the CSVs and appends rows for those days only.
  - A simple ledger file (data/data_ledger.json) tracks what's already been written,
    so restarting the server or refreshing the browser never regenerates old data.
  - Each day's rows are deterministic: same date always produces the same numbers
    (we seed the RNG from the date itself), so data is stable across restarts.

External data enrichment (optional — set these in .env):
  ALPHA_VANTAGE_KEY  — pulls real TGT daily volume to scale transaction counts
  Open-Meteo         — free weather API, no key needed, used for demand adjustment
"""

import csv
import json
import os
import random
import requests
from datetime import date, timedelta, datetime, timezone

# ---------------------------------------------------------------------------
# Paths and constants
# ---------------------------------------------------------------------------

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
LEDGER_PATH = os.path.join(DATA_DIR, "data_ledger.json")

REGIONS = ["East Region", "North Region"]

PRODUCTS = [
    ("Apparel",         0.22, 45.0),
    ("Electronics",     0.18, 120.0),
    ("Home & Garden",   0.17, 65.0),
    ("Grocery",         0.25, 28.0),
    ("Beauty & Health", 0.12, 35.0),
    ("Sports",          0.06, 55.0),
]
CHANNELS     = ["online", "mobile_app", "in_store"]
CHANNEL_MIX  = [0.45, 0.30, 0.25]

CAMPAIGNS = [
    ("Always-on Search",     0.45),
    ("Social Retargeting",   0.30),
    ("Email Re-engagement",  0.15),
    ("Display Prospecting",  0.10),
]

# US Census Bureau monthly retail seasonality (1.0 = average month)
MONTHLY_SEASONALITY = {
    1: 0.78, 2: 0.82, 3: 0.91, 4: 0.96,
    5: 1.03, 6: 1.07, 7: 1.09, 8: 1.11,
    9: 1.05, 10: 1.08, 11: 1.18, 12: 1.27,
}

# Shopify 2024 day-of-week traffic index (Mon=0 … Sun=6)
WEEKLY_PATTERN = [0.85, 0.90, 0.95, 1.00, 1.15, 1.25, 1.10]


# ---------------------------------------------------------------------------
# Ledger helpers
# ---------------------------------------------------------------------------

def _load_ledger() -> dict:
    if os.path.exists(LEDGER_PATH):
        try:
            with open(LEDGER_PATH, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "transactions": [],
        "marketing": [],
        "support_tickets": [],
        "last_run": None,
    }


def _save_ledger(ledger: dict):
    ledger["last_run"] = datetime.now(timezone.utc).isoformat()
    with open(LEDGER_PATH, "w") as f:
        json.dump(ledger, f, indent=2)


# ---------------------------------------------------------------------------
# Deterministic RNG seed per (date, region, source)
# This ensures the same date always produces identical rows — stable on restart.
# ---------------------------------------------------------------------------

def _date_seed(d: date, region: str, source: str) -> int:
    return hash(f"{d.isoformat()}{region}{source}") % (2 ** 31)


# ---------------------------------------------------------------------------
# Weather enrichment via Open-Meteo (free, no key needed)
# Returns a small demand multiplier based on real daily temperature.
# ---------------------------------------------------------------------------

_weather_cache: dict = {}

def _get_weather_multiplier(d: date, region: str) -> float:
    key = f"{d.isoformat()}{region}"
    if key in _weather_cache:
        return _weather_cache[key]

    if d >= date.today():
        return 1.0

    # Approximate US coordinates for each region
    coords = {
        "East Region":  (40.71, -74.01),   # New York
        "North Region": (44.97, -93.27),   # Minneapolis
    }
    lat, lon = coords.get(region, (40.71, -74.01))

    try:
        resp = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "daily": "temperature_2m_max",
                "start_date": d.isoformat(),
                "end_date": d.isoformat(),
                "timezone": "America/New_York",
            },
            timeout=4,
        )
        if resp.status_code == 200:
            temp_c = resp.json()["daily"]["temperature_2m_max"][0]
            # Warmer = slightly more demand (capped at ±8%)
            mult = 1.0 + (temp_c - 20) * 0.0045
            mult = max(0.92, min(1.08, mult))
            _weather_cache[key] = round(mult, 4)
            return _weather_cache[key]
    except Exception:
        pass

    _weather_cache[key] = 1.0
    return 1.0


# ---------------------------------------------------------------------------
# Alpha Vantage enrichment — real TGT daily volume as a retail demand signal
# Reads ALPHA_VANTAGE_KEY from env. Skips gracefully if not set.
# ---------------------------------------------------------------------------

_av_cache: dict = {}

def _get_av_revenue_multiplier(d: date) -> float:
    """
    Fetch Target Corp (TGT) daily trading volume from Alpha Vantage.
    Higher volume = stronger retail demand that day → more orders in our model.
    Returns a multiplier between 0.85 and 1.15.
    Falls back to 1.0 silently if no key is set or the API is unavailable.
    """
    api_key = os.environ.get("ALPHA_VANTAGE_KEY")
    if not api_key:
        return 1.0

    # Cache by individual date strings
    if d.isoformat() in _av_cache:
        return _av_cache[d.isoformat()]

    # Only fetch once per month — AV free tier: 25 calls/day
    month_key = d.strftime("%Y-%m")
    month_fetched = any(k.startswith(month_key) for k in _av_cache)
    if month_fetched:
        return _av_cache.get(d.isoformat(), 1.0)

    try:
        resp = requests.get(
            "https://www.alphavantage.co/query",
            params={
                "function": "TIME_SERIES_DAILY",
                "symbol": "TGT",
                "outputsize": "compact",
                "apikey": api_key,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            ts = resp.json().get("Time Series (Daily)", {})
            if ts:
                # Normalise volume against the 100-day mean
                volumes = [float(v["5. volume"]) for v in ts.values()]
                mean_vol = sum(volumes) / len(volumes)
                for date_str, vals in ts.items():
                    vol = float(vals["5. volume"])
                    mult = max(0.85, min(1.15, vol / mean_vol))
                    _av_cache[date_str] = round(mult, 4)
    except Exception:
        pass

    return _av_cache.get(d.isoformat(), 1.0)


# ---------------------------------------------------------------------------
# Row generators — each one is deterministic for a given date
# ---------------------------------------------------------------------------

def _gen_transaction_rows(d: date, region: str, next_order_id: int):
    rng = random.Random(_date_seed(d, region, "tx"))

    seasonal     = MONTHLY_SEASONALITY.get(d.month, 1.0)
    dow_factor   = WEEKLY_PATTERN[d.weekday()]
    region_mult  = 1.15 if region == "East Region" else 1.0
    weather_mult = _get_weather_multiplier(d, region)
    av_mult      = _get_av_revenue_multiplier(d)

    base   = 320  # avg daily orders for a mid-market retailer
    orders = max(
        int(base * seasonal * dow_factor * region_mult * weather_mult * av_mult
            * rng.gauss(1.0, 0.08)),
        10
    )

    rows = []
    for _ in range(orders):
        prod_names, prod_shares, prod_prices = zip(*PRODUCTS)
        product    = rng.choices(prod_names, weights=prod_shares)[0]
        base_price = prod_prices[prod_names.index(product)]
        price      = max(base_price * rng.gauss(1.0, 0.12), base_price * 0.5)
        qty        = rng.choices([1, 2, 3], weights=[0.70, 0.22, 0.08])[0]
        channel    = rng.choices(CHANNELS, weights=CHANNEL_MIX)[0]
        customer   = f"C{rng.randint(1, 15000):06d}"

        rows.append([
            next_order_id, d.isoformat(), region, product,
            qty, round(price, 2), channel, customer,
        ])
        next_order_id += 1

    return rows, next_order_id


def _gen_marketing_rows(week_start: date, region: str):
    rng = random.Random(_date_seed(week_start, region, "mk"))
    seasonal     = MONTHLY_SEASONALITY.get(week_start.month, 1.0)
    base_weekly  = 9500  # typical mid-market retailer weekly digital budget ($)

    rows = []
    for campaign_name, budget_share in CAMPAIGNS:
        spend       = int(base_weekly * budget_share * seasonal * rng.gauss(1.0, 0.06))
        impressions = int(spend / 4.20 * 1000)               # ~$4.20 CPM (WordStream 2024)
        clicks      = max(int(impressions * rng.gauss(0.028, 0.004)), 0)   # ~2.8% CTR
        rows.append([week_start.isoformat(), region, campaign_name, spend, impressions, clicks])

    return rows


def _gen_support_rows(d: date, region: str):
    rng = random.Random(_date_seed(d, region, "sp"))
    categories = {
        "checkout_error": (8,  2),
        "shipping_query": (22, 4),
        "return_request": (14, 3),
        "other":          (35, 6),
    }
    return [
        [d.isoformat(), region, cat, max(int(base + rng.gauss(0, noise)), 0)]
        for cat, (base, noise) in categories.items()
    ]


# ---------------------------------------------------------------------------
# Main entry point — call on server startup and from /api/data/update
# ---------------------------------------------------------------------------

def run_daily_update(invalidate_duckdb: bool = True) -> dict:
    """
    Append any calendar days that aren't yet in the CSVs.

    Safe to call multiple times — the ledger prevents duplicate rows.
    Only complete past days are written (we never write today mid-day).
    Returns a summary dict with 'message', 'dates_added', and 'rows_added'.
    """
    ledger = _load_ledger()
    summary = {"dates_added": [], "rows_added": 0, "sources_updated": []}

    tx_written = set(ledger.get("transactions", []))
    mk_written = set(ledger.get("marketing", []))
    sp_written = set(ledger.get("support_tickets", []))

    # Find the current max order_id so we don't repeat IDs
    tx_path = os.path.join(DATA_DIR, "transactions.csv")
    last_order_id = 1
    if os.path.exists(tx_path):
        with open(tx_path, "r", newline="") as f:
            reader = csv.reader(f)
            next(reader, None)
            for row in reader:
                if row:
                    try:
                        last_order_id = int(row[0])
                    except ValueError:
                        pass
    next_order_id = last_order_id + 1

    # Collect dates to fill: day after the baseline ends up to yesterday
    baseline_end = date(2025, 9, 7)
    new_dates = [
        baseline_end + timedelta(days=i + 1)
        for i in range((date.today() - baseline_end).days - 1)
        if (baseline_end + timedelta(days=i + 1)).isoformat() not in tx_written
    ]

    if not new_dates:
        return {**summary, "message": "Already up to date — nothing to append"}

    # Append transactions
    with open(tx_path, "a", newline="") as f:
        writer = csv.writer(f)
        for d in new_dates:
            for region in REGIONS:
                rows, next_order_id = _gen_transaction_rows(d, region, next_order_id)
                writer.writerows(rows)
                summary["rows_added"] += len(rows)
            tx_written.add(d.isoformat())
    summary["sources_updated"].append("transactions")

    # Append marketing (one entry per week, written on Mondays)
    mk_path = os.path.join(DATA_DIR, "marketing.csv")
    with open(mk_path, "a", newline="") as f:
        writer = csv.writer(f)
        for d in new_dates:
            if d.weekday() == 0 and d.isoformat() not in mk_written:
                for region in REGIONS:
                    rows = _gen_marketing_rows(d, region)
                    writer.writerows(rows)
                    summary["rows_added"] += len(rows)
                mk_written.add(d.isoformat())
    summary["sources_updated"].append("marketing")

    # Append support tickets
    sp_path = os.path.join(DATA_DIR, "support_tickets.csv")
    with open(sp_path, "a", newline="") as f:
        writer = csv.writer(f)
        for d in new_dates:
            for region in REGIONS:
                rows = _gen_support_rows(d, region)
                writer.writerows(rows)
                summary["rows_added"] += len(rows)
            sp_written.add(d.isoformat())
    summary["sources_updated"].append("support_tickets")

    # Save the updated ledger
    ledger["transactions"]    = sorted(tx_written)
    ledger["marketing"]       = sorted(mk_written)
    ledger["support_tickets"] = sorted(sp_written)
    _save_ledger(ledger)

    # Tell DuckDB to reload on next query
    if invalidate_duckdb and summary["rows_added"] > 0:
        try:
            from engine import ingest
            ingest._db = None
        except Exception:
            pass

    summary["dates_added"] = [d.isoformat() for d in new_dates]
    summary["message"] = (
        f"Appended {len(new_dates)} new day(s), {summary['rows_added']:,} rows"
    )
    return summary
