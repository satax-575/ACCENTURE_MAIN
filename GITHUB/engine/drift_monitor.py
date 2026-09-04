"""
Drift Monitor — Stage 10+ (Post-Insight Validation)

Background module that checks whether previously issued explanations still hold
as new data lands. Flags stale insights so analysts are not acting on outdated root causes.

This is purely deterministic logic — no LLM involved.
"""
import os
import json
from datetime import datetime, timezone, timedelta
from typing import List, Dict

CASES_LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cases_log.json")


def _load_cases() -> list:
    if not os.path.exists(CASES_LOG_PATH):
        return []
    try:
        with open(CASES_LOG_PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            return json.loads(content) if content else []
    except Exception:
        return []


def _save_cases(entries: list):
    with open(CASES_LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, default=str)


def log_case_result(region: str, week_start: str, metric: str,
                    top_driver: str, confidence_level: str,
                    contribution_pct: float, narrative_hash: str = ""):
    """
    Persist a case result for later drift checking.
    Called automatically by pipeline.run_case().
    """
    entry = {
        "logged_at": datetime.now(timezone.utc).isoformat(),
        "region": region,
        "week_start": week_start,
        "metric": metric,
        "top_driver": top_driver,
        "confidence_level": confidence_level,
        "contribution_pct": contribution_pct,
        "narrative_hash": narrative_hash,
        "drift_checked_at": None,
        "is_stale": False,
        "stale_reason": None,
    }
    cases = _load_cases()
    # Deduplicate by (region, week_start, metric) — keep most recent
    cases = [c for c in cases if not (
        c["region"] == region and
        c["week_start"] == week_start and
        c["metric"] == metric
    )]
    cases.append(entry)
    # Keep last 200 cases
    if len(cases) > 200:
        cases = cases[-200:]
    _save_cases(cases)


def check_drift(daily_df, mk_df) -> List[Dict]:
    """
    Re-run root cause analysis for each logged case using the latest data window.
    If the top driver changed or confidence dropped significantly, mark the insight as stale.

    Returns a list of stale insights.
    """
    from . import root_cause, detect, ingest

    cases = _load_cases()
    stale = []
    now = datetime.now(timezone.utc)

    for case in cases:
        # Only check cases logged in the last 14 days that haven't been checked recently
        logged_at = datetime.fromisoformat(case["logged_at"])
        if (now - logged_at).days > 14:
            continue
        last_check = case.get("drift_checked_at")
        if last_check:
            hours_since = (now - datetime.fromisoformat(last_check)).total_seconds() / 3600
            if hours_since < 6:  # Don't re-check within 6 hours
                continue

        try:
            import pandas as pd
            week_start = pd.Timestamp(case["week_start"])
            region = case["region"]

            # Re-compute the anomaly signal
            daily_kpis = ingest.daily_kpis(daily_df, None) if hasattr(daily_df, 'columns') else daily_df

            signal = detect.detect_shift(daily_kpis, region, week_start)
            if not signal:
                case["drift_checked_at"] = now.isoformat()
                continue

            kpi_onset = pd.Timestamp(signal.get("week_start", week_start))
            new_drivers = root_cause.find_root_cause(daily_kpis, mk_df, region, week_start, kpi_onset)

            new_top = new_drivers[0]["driver"] if new_drivers else None
            old_top = case.get("top_driver")

            is_stale = False
            stale_reason = None

            if new_top and old_top and new_top != old_top:
                is_stale = True
                stale_reason = f"Top driver changed: was '{old_top}', now '{new_top}'"
            elif not new_drivers and case.get("confidence_level") not in ("ABSTAIN", "LOW"):
                is_stale = True
                stale_reason = "No drivers pass precedence check on latest data — signal may have resolved"
            elif new_drivers:
                new_contrib = new_drivers[0].get("contribution_pct", 0)
                old_contrib = case.get("contribution_pct", 0)
                if old_contrib > 40 and new_contrib < 20:
                    is_stale = True
                    stale_reason = f"Top driver contribution dropped from {old_contrib}% to {new_contrib}%"

            case["drift_checked_at"] = now.isoformat()
            case["is_stale"] = is_stale
            case["stale_reason"] = stale_reason

            if is_stale:
                stale.append({
                    "region": region,
                    "week_start": case["week_start"],
                    "metric": case["metric"],
                    "old_top_driver": old_top,
                    "new_top_driver": new_top,
                    "stale_reason": stale_reason,
                    "logged_at": case["logged_at"],
                })

        except Exception:
            case["drift_checked_at"] = now.isoformat()

    _save_cases(cases)
    return stale


def get_stale_insights() -> List[Dict]:
    """Return all currently flagged stale insights from the log."""
    cases = _load_cases()
    return [
        {
            "region": c["region"],
            "week_start": c["week_start"],
            "metric": c["metric"],
            "top_driver": c["top_driver"],
            "stale_reason": c["stale_reason"],
            "logged_at": c["logged_at"],
            "drift_checked_at": c["drift_checked_at"],
        }
        for c in cases if c.get("is_stale")
    ]


def get_all_logged_cases() -> List[Dict]:
    """Return all logged cases for inspection."""
    return _load_cases()
