"""
Stage 1: Ingest & Fuse

Loads the three heterogeneous sources and reconciles them onto a single
date + region grain.

Data Layer: DuckDB (analytical in-process database)
  - CSVs are registered as persistent DuckDB views on first load
  - Subsequent calls query DuckDB — no re-reading files from disk
  - Gives the project a proper analytical DB story (not just pandas CSV reads)
  - DuckDB auto-infers schema, handles date parsing, and supports SQL queries

Round 2 additions:
  - Source metadata tracking: records refresh timestamps, row counts, schema validation
  - Grain reconciliation report: shows how daily/weekly/irregular sources are aligned
  - Enhanced data quality report with completeness scores and anomaly flags
"""
import os
import pandas as pd
from typing import Dict, Tuple

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# ---------------------------------------------------------------------------
# DuckDB analytical layer
# ---------------------------------------------------------------------------

_db = None  # module-level singleton connection


def _get_db():
    """
    Return a cached DuckDB connection with all 3 source tables registered.
    First call reads CSVs and creates in-memory tables; subsequent calls
    reuse the connection (zero file I/O after initial load).
    """
    global _db
    
    # Test if existing connection is still valid
    if _db is not None:
        try:
            # Quick test query to verify connection is alive
            _db.execute("SELECT 1").fetchone()
            return _db
        except Exception:
            # Connection is broken, clear it and reconnect
            _db = None

    try:
        import duckdb
        conn = duckdb.connect(database=":memory:")  # in-process, no server needed

        # Register each CSV as a DuckDB view — schema is auto-inferred
        tx_path = os.path.join(DATA_DIR, "transactions.csv").replace("\\", "/")
        mk_path = os.path.join(DATA_DIR, "marketing.csv").replace("\\", "/")
        sp_path = os.path.join(DATA_DIR, "support_tickets.csv").replace("\\", "/")

        conn.execute(f"""
            CREATE OR REPLACE TABLE transactions AS
            SELECT *, CAST(date AS DATE) AS date_parsed
            FROM read_csv_auto('{tx_path}', header=true)
        """)
        conn.execute(f"""
            CREATE OR REPLACE TABLE marketing AS
            SELECT *, CAST(week_start AS DATE) AS week_start_parsed
            FROM read_csv_auto('{mk_path}', header=true)
        """)
        conn.execute(f"""
            CREATE OR REPLACE TABLE support_tickets AS
            SELECT *, CAST(date AS DATE) AS date_parsed
            FROM read_csv_auto('{sp_path}', header=true)
        """)

        _db = conn
        return _db

    except ImportError:
        # DuckDB not installed — fall back to pandas (should not happen after pip install)
        return None
    except Exception as e:
        # If initialization fails, make sure we don't cache a broken connection
        _db = None
        raise RuntimeError(f"Failed to initialize DuckDB: {e}")


def _duckdb_to_df(query: str) -> pd.DataFrame:
    """Run a DuckDB query and return a pandas DataFrame."""
    conn = _get_db()
    if conn is None:
        raise RuntimeError("DuckDB not available. Run: pip install duckdb")
    try:
        result = conn.execute(query).df()
        return result
    except Exception as e:
        # Connection might be broken, invalidate cache
        invalidate_duckdb()
        raise RuntimeError(f"DuckDB query failed: {query}\nError: {e}")


def invalidate_duckdb():
    """Force DuckDB reconnection on next load_sources() call."""
    global _db
    if _db is not None:
        try:
            _db.close()
        except Exception:
            pass
    _db = None



def load_sources() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load all 3 source tables via DuckDB (analytical in-process DB).
    Returns pandas DataFrames for compatibility with downstream pipeline stages.
    """
    tx = _duckdb_to_df("SELECT *, date_parsed AS date FROM transactions")
    mk = _duckdb_to_df("SELECT *, week_start_parsed AS week_start FROM marketing")
    sp = _duckdb_to_df("SELECT *, date_parsed AS date FROM support_tickets")

    # Ensure datetime types (DuckDB returns date objects; pandas pipeline expects Timestamps)
    tx["date"] = pd.to_datetime(tx["date"])
    mk["week_start"] = pd.to_datetime(mk["week_start"])
    sp["date"] = pd.to_datetime(sp["date"])

    return tx, mk, sp


def query_db(sql: str) -> pd.DataFrame:
    """Run arbitrary SQL against the DuckDB analytical layer. Exposed for /api/query endpoint."""
    return _duckdb_to_df(sql)


def source_metadata(tx: pd.DataFrame, mk: pd.DataFrame, sp: pd.DataFrame) -> dict:
    """Record metadata for each source: row count, date range, columns, refresh info."""
    return {
        "transactions": {
            "rows": len(tx),
            "columns": list(tx.columns),
            "date_range": {"min": str(tx["date"].min().date()), "max": str(tx["date"].max().date())},
            "regions": sorted(tx["region"].unique().tolist()),
            "refresh": "daily",
            "grain": "per-order item",
        },
        "marketing": {
            "rows": len(mk),
            "columns": list(mk.columns),
            "date_range": {"min": str(mk["week_start"].min().date()), "max": str(mk["week_start"].max().date())},
            "regions": sorted(mk["region"].unique().tolist()),
            "refresh": "weekly",
            "grain": "per-campaign per-region per-week",
        },
        "support_tickets": {
            "rows": len(sp),
            "columns": list(sp.columns),
            "date_range": {"min": str(sp["date"].min().date()), "max": str(sp["date"].max().date())},
            "regions": sorted(sp["region"].unique().tolist()),
            "refresh": "irregular (event-level)",
            "grain": "per-category per-region per-day",
        },
    }


def grain_reconciliation_report(tx: pd.DataFrame, mk: pd.DataFrame, sp: pd.DataFrame) -> dict:
    """Shows how different source grains are aligned for analysis."""
    return {
        "alignment_strategy": {
            "transactions → daily": "Aggregated from per-order to (date, region) grain using SUM(qty*price) for revenue, COUNT for orders",
            "support_tickets → daily": "Already at (date, region, category) grain; pivoted to wide format",
            "marketing → weekly": "Kept at weekly grain; joined on (week_start, region) for cross-source KPIs",
        },
        "cross_source_kpis": {
            "Conversion Rate": {
                "formula": "orders / clicks",
                "sources": ["transactions (daily → weekly rollup)", "marketing (weekly)"],
                "join_keys": ["week_start", "region"],
                "note": "Weekly grain — the lower-frequency source (marketing) sets the ceiling",
            },
        },
        "grain_hierarchy": {
            "finest": "transactions (per-order)",
            "standard_analysis": "daily (date, region)",
            "cross_source": "weekly (week_start, region)",
        },
    }


def daily_kpis(tx: pd.DataFrame, sp: pd.DataFrame) -> pd.DataFrame:
    """Fuse transactions + support tickets onto a daily (date, region) grain."""
    rev = (tx.groupby(["date", "region"])
             .apply(lambda g: pd.Series({
                 "revenue": (g["qty"] * g["price"]).sum(),
                 "orders": len(g),
                 "aov": (g["qty"] * g["price"]).sum() / max(len(g), 1),
             }), include_groups=False)
             .reset_index())

    tix = (sp.pivot_table(index=["date", "region"], columns="category",
                            values="ticket_count", aggfunc="sum", fill_value=0)
             .reset_index())
    if "checkout_error" not in tix.columns:
        tix["checkout_error"] = 0

    merged = rev.merge(tix[["date", "region", "checkout_error"]], on=["date", "region"], how="left")
    merged["checkout_error"] = merged["checkout_error"].fillna(0)
    merged["checkout_error_rate"] = merged["checkout_error"] / merged["orders"].replace(0, pd.NA)

    # Merge marketing data for Marketing Spend and Conversion Rate
    mk_path = os.path.join(DATA_DIR, "marketing.csv")
    if os.path.exists(mk_path):
        mk = pd.read_csv(mk_path)
        mk["week_start"] = pd.to_datetime(mk["week_start"])
        
        # Add week_start to merged to allow joining
        merged["week_start"] = pd.to_datetime(merged["date"]) - pd.to_timedelta(pd.to_datetime(merged["date"]).dt.dayofweek, unit="D")
        
        # Merge weekly spend and clicks
        merged = merged.merge(mk[["week_start", "region", "spend", "clicks"]], on=["week_start", "region"], how="left")
        
        # Distribute weekly spend daily (divide by 7)
        merged["marketing_spend"] = merged["spend"].fillna(0) / 7.0
        # Calculate daily conversion rate (daily orders / weekly clicks * 100)
        merged["conversion_rate"] = (merged["orders"] / merged["clicks"].replace(0, pd.NA) * 100).fillna(0)
        
        # Clean up temporary columns
        merged = merged.drop(columns=["spend", "clicks", "week_start"])
    else:
        merged["marketing_spend"] = 0.0
        merged["conversion_rate"] = 0.0

    return merged


def weekly_marketing(mk: pd.DataFrame) -> pd.DataFrame:
    return mk


def weekly_conversion_rate(tx: pd.DataFrame, mk: pd.DataFrame) -> pd.DataFrame:
    """
    Conversion Rate = orders / clicks, joined weekly across TWO sources.
    """
    tx = tx.copy()
    tx["week_start"] = tx["date"] - pd.to_timedelta(tx["date"].dt.dayofweek, unit="D")
    orders_weekly = (tx.groupby(["week_start", "region"])
                        .size().rename("orders").reset_index())
    merged = orders_weekly.merge(mk[["week_start", "region", "clicks"]],
                                  on=["week_start", "region"], how="inner")
    merged["conversion_rate_pct"] = (merged["orders"] / merged["clicks"] * 100).round(2)
    return merged


def data_quality_report(tx: pd.DataFrame, mk: pd.DataFrame, sp: pd.DataFrame) -> dict:
    """
    Enhanced quality check with completeness scores and per-source breakdown.
    """
    issues = []
    scores = {}

    # Transactions quality
    tx_issues = []
    dup_orders = int(tx["order_id"].duplicated().sum())
    if dup_orders:
        tx_issues.append(f"{dup_orders} duplicate order_id(s)")
    bad_price = int((tx["price"] <= 0).sum())
    if bad_price:
        tx_issues.append(f"{bad_price} row(s) with non-positive price")
    bad_qty = int((tx["qty"] <= 0).sum())
    if bad_qty:
        tx_issues.append(f"{bad_qty} row(s) with non-positive qty")
    tx_nulls = int(tx.isnull().sum().sum())
    if tx_nulls:
        tx_issues.append(f"{tx_nulls} null value(s)")
    tx_completeness = round(1 - tx.isnull().sum().sum() / (tx.shape[0] * tx.shape[1]), 4)
    scores["transactions"] = {
        "issues": tx_issues,
        "completeness": tx_completeness,
        "row_count": len(tx),
    }
    issues.extend([f"transactions: {i}" for i in tx_issues])

    # Marketing quality
    mk_issues = []
    neg_spend = int((mk["spend"] < 0).sum())
    if neg_spend:
        mk_issues.append(f"{neg_spend} row(s) with negative spend")
    mk_nulls = int(mk.isnull().sum().sum())
    if mk_nulls:
        mk_issues.append(f"{mk_nulls} null value(s)")
    mk_completeness = round(1 - mk.isnull().sum().sum() / (mk.shape[0] * mk.shape[1]), 4)
    scores["marketing"] = {
        "issues": mk_issues,
        "completeness": mk_completeness,
        "row_count": len(mk),
    }
    issues.extend([f"marketing: {i}" for i in mk_issues])

    # Support tickets quality
    sp_issues = []
    neg_tickets = int((sp["ticket_count"] < 0).sum())
    if neg_tickets:
        sp_issues.append(f"{neg_tickets} row(s) with negative count")
    sp_nulls = int(sp.isnull().sum().sum())
    if sp_nulls:
        sp_issues.append(f"{sp_nulls} null value(s)")
    sp_completeness = round(1 - sp.isnull().sum().sum() / (sp.shape[0] * sp.shape[1]), 4)
    scores["support_tickets"] = {
        "issues": sp_issues,
        "completeness": sp_completeness,
        "row_count": len(sp),
    }
    issues.extend([f"support_tickets: {i}" for i in sp_issues])

    return {
        "passed": len(issues) == 0,
        "issues": issues,
        "per_source": scores,
        "overall_completeness": round(
            sum(s["completeness"] for s in scores.values()) / len(scores), 4
        ),
    }


def source_freshness(tx, mk, sp, region: str, as_of: pd.Timestamp) -> dict:
    """
    Data-freshness metadata per source for a given region.
    """
    lookback_start = as_of - pd.Timedelta(days=14)

    tx_recent = tx[(tx.region == region) & (tx.date >= lookback_start) & (tx.date <= as_of)]
    mk_recent = mk[(mk.region == region) & (mk.week_start >= lookback_start) & (mk.week_start <= as_of)]
    sp_recent = sp[(sp.region == region) & (sp.date >= lookback_start) & (sp.date <= as_of)]

    def freshness(df, date_col, cadence_days):
        if df.empty:
            return {"present": False, "stale": True, "last_seen": None, "cadence": f"{cadence_days}d"}
        last_seen = df[date_col].max()
        gap = (as_of - last_seen).days
        return {
            "present": True,
            "stale": gap > cadence_days,
            "last_seen": str(last_seen.date()),
            "cadence": f"{cadence_days}d",
            "gap_days": gap,
        }

    return {
        "transactions": freshness(tx_recent, "date", cadence_days=1),
        "marketing": freshness(mk_recent, "week_start", cadence_days=7),
        "support_tickets": freshness(sp_recent, "date", cadence_days=1),
    }
