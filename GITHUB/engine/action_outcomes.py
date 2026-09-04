"""
Action Outcome Tracker

Closes the feedback loop by checking, after N days, whether a recommended
action's predicted impact actually materialized — feeding that back into
future confidence calibration.

This is purely deterministic logic — no LLM involved.
"""
import os
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict

OUTCOMES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "action_outcomes.json")


def _load() -> list:
    if not os.path.exists(OUTCOMES_PATH):
        return []
    try:
        with open(OUTCOMES_PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            return json.loads(content) if content else []
    except Exception:
        return []


def _save(entries: list):
    with open(OUTCOMES_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, default=str)


def record_dispatched_action(
    action_id: str,
    region: str,
    metric: str,
    driver: str,
    predicted_impact: str,
    owner: str,
    dispatched_by: str,
    check_after_days: int = 7,
) -> dict:
    """
    Record a dispatched action for future outcome checking.
    Called when an analyst dispatches via Slack/Jira.
    """
    entry = {
        "action_id": action_id,
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "region": region,
        "metric": metric,
        "driver": driver,
        "predicted_impact": predicted_impact,
        "owner": owner,
        "dispatched_by": dispatched_by,
        "check_date": (datetime.now(timezone.utc) + timedelta(days=check_after_days)).isoformat(),
        "status": "PENDING",          # PENDING | VERIFIED | MISSED | INCONCLUSIVE
        "actual_impact_pct": None,
        "prediction_accuracy": None,  # "HIT" | "PARTIAL" | "MISS"
        "notes": None,
    }
    entries = _load()
    entries.append(entry)
    _save(entries)
    return entry


def check_outcomes(daily_df=None) -> List[Dict]:
    """
    For each pending action whose check_date has passed, compare the
    predicted impact to the actual KPI change (if daily_df is provided).

    Returns list of newly resolved outcomes.
    """
    entries = _load()
    now = datetime.now(timezone.utc)
    resolved = []

    for entry in entries:
        if entry["status"] != "PENDING":
            continue
        check_date = datetime.fromisoformat(entry["check_date"])
        if now < check_date:
            continue

        # Mark as inconclusive if no daily data available for auto-check
        if daily_df is None:
            entry["status"] = "INCONCLUSIVE"
            entry["notes"] = "No daily data provided for automatic verification. Manual review required."
            resolved.append(entry)
            continue

        # Auto-check: compare predicted impact vs actual KPI change post-dispatch
        try:
            import pandas as pd
            from . import ingest, detect

            dispatch_date = pd.Timestamp(entry["dispatched_at"]).tz_localize(None)
            region = entry["region"]
            metric_col = {
                "revenue": "revenue",
                "orders": "orders",
                "checkout_error_rate": "checkout_error_rate",
                "aov": "aov",
            }.get(entry["metric"].lower(), "revenue")

            region_df = daily_df[daily_df["region"] == region].sort_values("date")
            pre = region_df[region_df["date"] < dispatch_date].tail(7)
            post = region_df[region_df["date"] >= dispatch_date].head(7)

            if pre.empty or post.empty or metric_col not in region_df.columns:
                entry["status"] = "INCONCLUSIVE"
                entry["notes"] = "Insufficient post-dispatch data for automatic comparison."
            else:
                pre_mean = float(pre[metric_col].mean())
                post_mean = float(post[metric_col].mean())
                actual_pct = round((post_mean - pre_mean) / max(abs(pre_mean), 1) * 100, 1)
                entry["actual_impact_pct"] = actual_pct

                # Simple heuristic: if action said "resolve ~55% in 3-5 days"
                # and metric improved by >10%, call it HIT
                if actual_pct > 5:
                    entry["prediction_accuracy"] = "HIT"
                elif actual_pct > -5:
                    entry["prediction_accuracy"] = "PARTIAL"
                else:
                    entry["prediction_accuracy"] = "MISS"

                entry["status"] = "VERIFIED"
                entry["notes"] = f"Actual {entry['metric']} change: {actual_pct:+.1f}% vs predicted: {entry['predicted_impact']}"

        except Exception as ex:
            entry["status"] = "INCONCLUSIVE"
            entry["notes"] = f"Auto-check error: {str(ex)}"

        resolved.append(entry)

    _save(entries)
    return resolved


def get_all_outcomes() -> List[Dict]:
    """Return all action outcomes."""
    return _load()


def get_pending_outcomes() -> List[Dict]:
    """Return outcomes still awaiting verification."""
    now = datetime.now(timezone.utc)
    return [
        e for e in _load()
        if e["status"] == "PENDING" and
        datetime.fromisoformat(e["check_date"]) <= now
    ]


def outcome_summary() -> Dict:
    """Aggregate accuracy metrics for confidence calibration."""
    entries = _load()
    verified = [e for e in entries if e["status"] == "VERIFIED"]
    if not verified:
        return {"total": 0, "hit_rate": None, "by_driver": {}}

    hits = sum(1 for e in verified if e.get("prediction_accuracy") == "HIT")
    partials = sum(1 for e in verified if e.get("prediction_accuracy") == "PARTIAL")
    misses = sum(1 for e in verified if e.get("prediction_accuracy") == "MISS")

    by_driver = {}
    for e in verified:
        d = e.get("driver", "Unknown")
        by_driver.setdefault(d, {"hits": 0, "partials": 0, "misses": 0, "total": 0})
        by_driver[d]["total"] += 1
        acc = e.get("prediction_accuracy", "MISS")
        if acc == "HIT":
            by_driver[d]["hits"] += 1
        elif acc == "PARTIAL":
            by_driver[d]["partials"] += 1
        else:
            by_driver[d]["misses"] += 1

    return {
        "total": len(verified),
        "hits": hits,
        "partials": partials,
        "misses": misses,
        "hit_rate": round(hits / max(len(verified), 1) * 100),
        "by_driver": by_driver,
        "pending": sum(1 for e in entries if e["status"] == "PENDING"),
    }
