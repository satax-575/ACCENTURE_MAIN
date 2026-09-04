"""
Proactive Alert Engine

Scans all KPIs × regions for material movements, generates a prioritized
alert list, and routes each alert to the appropriate persona based on KPI
ownership from the semantic contracts.

Priority scoring: abs(z_score) × business_weight × recency_factor
Deduplication: suppresses alerts for the same KPI/region if already acknowledged.

This is a deterministic/statistical module — not an LLM step.
"""
import pandas as pd
from typing import List, Dict, Optional
from . import ingest, detect, knowledge_graph

# In-memory acknowledged alerts (would be a database in production)
_acknowledged: set = set()


def _alert_key(kpi: str, region: str, week_start: str) -> str:
    return f"{kpi}::{region}::{week_start}"


def acknowledge_alert(kpi: str, region: str, week_start: str):
    _acknowledged.add(_alert_key(kpi, region, week_start))


def is_acknowledged(kpi: str, region: str, week_start: str) -> bool:
    return _alert_key(kpi, region, week_start) in _acknowledged


def scan_all_kpis(role: str = "ceo") -> List[dict]:
    """
    Scan all KPIs × regions for material movements.
    Returns a prioritized list of alerts.
    """
    from . import access

    tx, mk, sp = ingest.load_sources()
    daily = ingest.daily_kpis(tx, sp)
    graph = knowledge_graph.get_graph()

    contracts = access.load_contracts()
    regions = daily["region"].unique().tolist()

    # Find the most recent complete week
    max_date = daily["date"].max()
    # Go back up to 3 weeks to find anomalies
    week_starts = []
    for weeks_back in range(0, 3):
        ws = max_date - pd.Timedelta(days=max_date.dayofweek + 7 * weeks_back)
        week_starts.append(ws)

    alerts = []

    # Map KPI names to column names in the daily DataFrame
    kpi_to_metric = {
        "Revenue": "revenue",
        "Purchase Frequency": "orders",
        "Average Order Value": "aov",
        "Checkout Error Rate": "checkout_error_rate",
    }

    for kpi_name, metric_col in kpi_to_metric.items():
        contract = contracts.get(kpi_name, {})
        if not access.can_view(role, kpi_name):
            continue

        threshold = contract.get("threshold_pct", 5.0)
        biz_weight = contract.get("business_weight", 0.5)
        owner = contract.get("owner", "Unknown")

        for region in regions:
            for ws in week_starts:
                key = _alert_key(kpi_name, region, str(ws.date()))
                if is_acknowledged(kpi_name, region, str(ws.date())):
                    continue

                signal = detect.detect_shift(
                    daily, region, ws, metric=metric_col, threshold_pct=threshold
                )

                if signal.get("flagged"):
                    # Recency factor: most recent week gets highest weight
                    days_ago = (max_date - ws).days
                    recency = max(1.0 - (days_ago / 28), 0.3)

                    priority = abs(signal.get("z_score", 0)) * biz_weight * recency

                    severity = "high" if abs(signal.get("pct_change", 0)) >= 10 else \
                               "medium" if abs(signal.get("pct_change", 0)) >= 5 else "low"

                    alerts.append({
                        "kpi": kpi_name,
                        "region": region,
                        "severity": severity,
                        "pct_change": signal.get("pct_change", 0),
                        "z_score": signal.get("z_score", 0),
                        "priority_score": round(priority, 1),
                        "week_start": str(ws.date()),
                        "routed_to": owner,
                        "acknowledged": False,
                        "metric_col": metric_col,
                    })

    # Sort by priority descending
    alerts.sort(key=lambda a: a["priority_score"], reverse=True)
    return alerts


def get_top_alert(role: str = "ceo") -> Optional[dict]:
    """Return the single highest-priority unacknowledged alert."""
    alerts = scan_all_kpis(role)
    return alerts[0] if alerts else None
