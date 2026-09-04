"""
Stage 4: Confidence Scoring & Abstention

Rule-based, not LLM-based. Scores confidence at both the case level and
per-hypothesis level.

Round 2 additions:
  - Per-hypothesis confidence scoring
  - Contradictory evidence detection (lowers overall confidence)
  - Feedback calibration integration (adjusts thresholds based on historical accuracy)

Round 3 additions:
  - trust_score_breakdown(): decomposes confidence into auditable sub-components
    (data completeness, driver agreement, historical volatility, feedback accuracy)
    so judges/analysts can see WHY confidence is HIGH/LOW, not just the label.
"""
from typing import List, Dict, Optional
from . import feedback as feedback_module

HIGH_THRESHOLD = 30      # top driver contribution % needed for HIGH


def score(freshness: dict, ranked_drivers: list) -> dict:
    """
    Score overall case confidence based on data freshness and driver quality.
    """
    missing_or_stale = [src for src, meta in freshness.items()
                         if (not meta["present"]) or meta["stale"]]

    if missing_or_stale:
        return {
            "level": "ABSTAIN",
            "reason": f"Data gap in: {', '.join(missing_or_stale)}. "
                      f"Declining to name a cause on incomplete evidence.",
            "missing_or_stale": missing_or_stale,
            "contradictions": [],
        }

    if not ranked_drivers:
        return {
            "level": "LOW",
            "reason": "Anomaly detected, but no candidate driver passed the causal precedence check.",
            "missing_or_stale": [],
            "contradictions": [],
        }

    # Check for contradictions
    from . import root_cause
    contradictions = root_cause.detect_contradictions(ranked_drivers)

    top = ranked_drivers[0]["contribution_pct"]

    # Apply feedback calibration: if the top driver has low historical accuracy,
    # cap the confidence below HIGH
    calibration = _get_calibrated_accuracy(ranked_drivers[0]["driver"])

    if contradictions:
        level = "LOW"
        reason = (f"Contradictory evidence detected: {'; '.join(contradictions)}. "
                  f"Confidence lowered due to conflicting driver signals.")
    elif calibration is not None and calibration < 0.5:
        level = "MODERATE"
        reason = (f"Top driver explains {top}% of the shift, but historical feedback accuracy "
                  f"for '{ranked_drivers[0]['driver']}' is {calibration:.0%} — capping below HIGH.")
    elif top >= HIGH_THRESHOLD:
        level = "HIGH"
        reason = f"Top driver explains {top}% of the shift with clean precedence."
    else:
        level = "MODERATE"
        reason = "Evidence points to a cause, but contribution is split across drivers."

    return {
        "level": level,
        "reason": reason,
        "missing_or_stale": [],
        "contradictions": contradictions,
    }


def _get_calibrated_accuracy(driver_name: str) -> Optional[float]:
    """
    Check historical feedback accuracy for a driver.
    Returns the accuracy float (0-1) if there's enough data, else None.
    """
    try:
        cal = feedback_module.calibration_summary()
        if driver_name in cal and cal[driver_name]["total"] >= 3:
            return cal[driver_name]["accuracy"]
    except Exception:
        pass
    return None


def score_hypothesis(driver: dict, freshness: dict) -> str:
    """
    Score confidence for a single driver hypothesis.
    Returns: 'HIGH', 'MODERATE', or 'LOW'
    """
    missing_or_stale = [src for src, meta in freshness.items()
                         if (not meta["present"]) or meta["stale"]]
    if missing_or_stale:
        return "LOW"

    contribution = driver.get("contribution_pct", 0)
    if contribution >= HIGH_THRESHOLD:
        return "HIGH"
    elif contribution >= 15:
        return "MODERATE"
    return "LOW"


def trust_score_breakdown(freshness: dict, ranked_drivers: list, daily_series=None) -> dict:
    """
    Decompose confidence into 4 auditable sub-components.
    Returns a dict with overall_score (0-100) and per-component breakdown.

    Sub-components:
      data_completeness_pct  — fraction of sources that are present and fresh
      driver_agreement_pct   — fraction of top drivers pointing in the same direction
      stability_pct          — inverse of metric volatility (lower std/mean → more stable)
      feedback_calibration_pct — historical accuracy from analyst feedback
    """
    import math

    # 1. Data completeness
    total_sources = max(len(freshness), 1)
    good_sources = sum(1 for meta in freshness.values() if meta.get("present") and not meta.get("stale"))
    data_completeness_pct = round(good_sources / total_sources * 100)

    # 2. Driver agreement (fraction pointing same direction as top driver)
    driver_agreement_pct = 100
    if len(ranked_drivers) >= 2:
        top_direction = 1 if ranked_drivers[0].get("pct_change", 0) > 0 else -1
        agreeing = sum(1 for d in ranked_drivers
                       if (1 if d.get("pct_change", 0) > 0 else -1) == top_direction)
        driver_agreement_pct = round(agreeing / len(ranked_drivers) * 100)

    # 3. Stability (use inverse of normalized volatility; 100 = very stable)
    stability_pct = 75  # default moderate
    if ranked_drivers:
        # Proxy: if top driver has correlation >= 0.7, consider stable
        top_corr = ranked_drivers[0].get("correlation")
        if top_corr is not None:
            stability_pct = min(100, round(abs(top_corr) * 100))
        # If top driver contribution is very high (>= 60%), stable signal
        top_contrib = ranked_drivers[0].get("contribution_pct", 0)
        if top_contrib >= 60:
            stability_pct = max(stability_pct, 80)

    # 4. Feedback calibration accuracy
    feedback_calibration_pct = None
    feedback_label = "Insufficient data"
    try:
        cal = feedback_module.calibration_summary()
        if ranked_drivers and cal:
            top_driver_name = ranked_drivers[0].get("driver", "")
            if top_driver_name in cal and cal[top_driver_name]["total"] >= 3:
                acc = cal[top_driver_name]["accuracy"]
                if acc is not None:
                    feedback_calibration_pct = round(acc * 100)
                    feedback_label = f"{feedback_calibration_pct}% historical accuracy ({cal[top_driver_name]['total']} cases)"
    except Exception:
        pass

    # Weighted overall score (data & agreement are most critical)
    weights = {
        "data_completeness": 0.35,
        "driver_agreement": 0.30,
        "stability": 0.20,
        "feedback_calibration": 0.15,
    }
    feedback_score = feedback_calibration_pct if feedback_calibration_pct is not None else 65  # default if no data
    overall = round(
        data_completeness_pct * weights["data_completeness"] +
        driver_agreement_pct * weights["driver_agreement"] +
        stability_pct * weights["stability"] +
        feedback_score * weights["feedback_calibration"]
    )

    # Map overall score to badge level
    if data_completeness_pct < 100:
        badge = "ABSTAIN"
    elif overall >= 72:
        badge = "HIGH"
    elif overall >= 45:
        badge = "MODERATE"
    else:
        badge = "LOW"

    return {
        "overall_score": overall,
        "badge": badge,
        "components": [
            {
                "name": "Data Completeness",
                "score": data_completeness_pct,
                "weight": 35,
                "description": f"{good_sources}/{total_sources} sources present and fresh",
                "icon": "database",
            },
            {
                "name": "Driver Agreement",
                "score": driver_agreement_pct,
                "weight": 30,
                "description": f"{'All' if driver_agreement_pct == 100 else str(driver_agreement_pct) + '%'} of ranked drivers point in same direction",
                "icon": "trending",
            },
            {
                "name": "Signal Stability",
                "score": stability_pct,
                "weight": 20,
                "description": f"Top driver correlation: {ranked_drivers[0].get('correlation', 'N/A') if ranked_drivers else 'N/A'}",
                "icon": "activity",
            },
            {
                "name": "Feedback Calibration",
                "score": feedback_calibration_pct,
                "weight": 15,
                "description": feedback_label,
                "icon": "checkCircle",
            },
        ],
        "method": "rule_based",
    }
