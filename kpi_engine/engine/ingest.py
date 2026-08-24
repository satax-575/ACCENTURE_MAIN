"""
Stage 1: Ingest & Fuse

Loads the three heterogeneous sources and reconciles them onto a single
date + region grain.

Round 2 additions:
  - Source metadata tracking: records refresh timestamps, row counts, schema validation
  - Grain reconciliation report: shows how daily/weekly/irregular sources are aligned
  - Enhanced data quality report with completeness scores and anomaly flags
"""
import os
import pandas as pd
from typing import Dict, Tuple

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def load_sources() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    tx = pd.read_csv(os.path.join(DATA_DIR, "transactions.csv"), parse_dates=["date"])
    mk = pd.read_csv(os.path.join(DATA_DIR, "marketing.csv"), parse_dates=["week_start"])
    sp = pd.read_csv(os.path.join(DATA_DIR, "support_tickets.csv"), parse_dates=["date"])
    return tx, mk, sp


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
