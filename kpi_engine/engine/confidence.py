"""
Stage 4: Confidence Scoring & Abstention

Rule-based, not LLM-based. Scores confidence at both the case level and
per-hypothesis level.

Round 2 additions:
  - Per-hypothesis confidence scoring
  - Contradictory evidence detection (lowers overall confidence)
  - Feedback calibration integration (adjusts thresholds based on historical accuracy)
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
