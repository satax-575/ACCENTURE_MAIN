"""
Stage 6: Feedback Loop

Stores analyst verdicts and derives running accuracy scores per driver.

Round 2 additions:
  - Per-driver weight adjustment suggestions based on accumulated feedback
  - Rolling trend tracking (30-day accuracy windows)
  - Expanded feedback types: severity rating, action effectiveness
  - Feedback-driven learning: exports weight adjustments for root_cause.py
"""
import json
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "feedback_log.json")


def _load():
    if not os.path.exists(LOG_PATH):
        return []
    try:
        with open(LOG_PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            return json.loads(content)
    except Exception:
        return []


def _save(entries):
    with open(LOG_PATH, "w") as f:
        json.dump(entries, f, indent=2, default=str)


def record_feedback(kpi_case: dict, verdict: str, corrected_cause: str = None,
                     analyst: str = "demo_analyst", severity_rating: int = None,
                     action_effectiveness: str = None) -> dict:
    """
    Record analyst feedback on a generated case.
    verdict in {'confirmed', 'rejected', 'corrected'}
    severity_rating: 1-5 (analyst's assessment of business severity)
    action_effectiveness: 'effective' | 'ineffective' | 'not_yet_assessed'
    """
    top_driver = kpi_case["drivers"][0]["driver"] if kpi_case.get("drivers") else None
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "analyst": analyst,
        "region": kpi_case.get("region", ""),
        "metric": kpi_case.get("signal", {}).get("metric", ""),
        "week_start": kpi_case.get("signal", {}).get("week_start", ""),
        "system_top_driver": top_driver,
        "system_confidence": kpi_case.get("confidence", {}).get("level", ""),
        "verdict": verdict,
        "corrected_cause": corrected_cause,
        "severity_rating": severity_rating,
        "action_effectiveness": action_effectiveness,
    }
    entries = _load()
    entries.append(entry)
    _save(entries)
    return entry


def calibration_summary() -> dict:
    """Per-driver accuracy: fraction of cases where the analyst confirmed the system's top driver."""
    entries = _load()
    by_driver = {}
    for e in entries:
        d = e.get("system_top_driver") or "(none)"
        by_driver.setdefault(d, {"confirmed": 0, "total": 0, "rejected": 0, "corrected": 0})
        by_driver[d]["total"] += 1
        verdict = e.get("verdict", "")
        if verdict == "confirmed":
            by_driver[d]["confirmed"] += 1
        elif verdict == "rejected":
            by_driver[d]["rejected"] += 1
        elif verdict == "corrected":
            by_driver[d]["corrected"] += 1
    return {
        d: {**stats, "accuracy": round(stats["confirmed"] / stats["total"], 2) if stats["total"] else None}
        for d, stats in by_driver.items()
    }


def rolling_accuracy(days: int = 30) -> dict:
    """Per-driver accuracy over the last N days only."""
    entries = _load()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    recent = [e for e in entries if e.get("timestamp", "") >= cutoff]

    by_driver = {}
    for e in recent:
        d = e.get("system_top_driver") or "(none)"
        by_driver.setdefault(d, {"confirmed": 0, "total": 0})
        by_driver[d]["total"] += 1
        if e.get("verdict") == "confirmed":
            by_driver[d]["confirmed"] += 1

    return {
        d: {**stats, "accuracy": round(stats["confirmed"] / stats["total"], 2) if stats["total"] else None}
        for d, stats in by_driver.items()
    }


def weight_adjustment_suggestions() -> dict:
    """
    Based on accumulated feedback, suggest weight adjustments for root_cause.py.

    If a driver is frequently rejected as the top cause, suggest lowering its
    weight. If a corrected cause is frequently named, suggest raising it.

    This is the learning loop: feedback → calibration → weight suggestion → 
    analyst reviews → weights are manually updated in root_cause.py's
    DRIVER_WEIGHTS (or eventually automatically).
    """
    cal = calibration_summary()
    suggestions = {}

    for driver, stats in cal.items():
        if driver == "(none)" or stats["total"] < 2:
            continue

        accuracy = stats["accuracy"]
        if accuracy is not None and accuracy < 0.5:
            suggestions[driver] = {
                "current_accuracy": accuracy,
                "suggestion": "LOWER_WEIGHT",
                "reason": f"Only {accuracy:.0%} of cases confirmed — driver may be over-weighted",
                "total_feedback": stats["total"],
            }
        elif accuracy is not None and accuracy >= 0.8:
            suggestions[driver] = {
                "current_accuracy": accuracy,
                "suggestion": "MAINTAIN_OR_RAISE",
                "reason": f"{accuracy:.0%} accuracy — driver attribution is well-calibrated",
                "total_feedback": stats["total"],
            }

    return suggestions


def feedback_stats() -> dict:
    """Overall feedback statistics."""
    entries = _load()
    return {
        "total_feedback": len(entries),
        "confirmed": sum(1 for e in entries if e.get("verdict") == "confirmed"),
        "rejected": sum(1 for e in entries if e.get("verdict") == "rejected"),
        "corrected": sum(1 for e in entries if e.get("verdict") == "corrected"),
        "overall_accuracy": round(
            sum(1 for e in entries if e.get("verdict") == "confirmed") / max(len(entries), 1), 2
        ),
        "avg_severity": round(
            sum(e.get("severity_rating", 0) for e in entries if e.get("severity_rating"))
            / max(sum(1 for e in entries if e.get("severity_rating")), 1), 1
        ),
    }


BASE_WEIGHTS = {
    "purchase_frequency": 0.85,
    "checkout_error_rate": 0.90,
    "marketing_spend": 0.35,
    "aov": 0.30,
}

# Map from analyst-facing driver labels back to internal keys
_LABEL_TO_KEY = {
    "Purchase frequency": "purchase_frequency",
    "Checkout error rate": "checkout_error_rate",
    "Marketing spend": "marketing_spend",
    "Average order value": "aov",
}


def get_live_weights() -> dict:
    """
    Derive runtime-adjusted driver weights from accumulated analyst feedback.
    This is the LIVE learning loop: feedback corrections immediately change
    how root_cause.py ranks drivers on the next request — no manual edit needed.

    Logic:
      - If a driver has >= 3 feedback entries and accuracy < 50%: lower weight by 20%
      - If a driver has >= 3 entries and accuracy >= 80%: raise weight by 10%
      - Otherwise: use base weight unchanged

    Returns dict with same keys as DRIVER_WEIGHTS in root_cause.py.
    """
    weights = BASE_WEIGHTS.copy()
    try:
        cal = calibration_summary()
        for label, stats in cal.items():
            key = _LABEL_TO_KEY.get(label)
            if not key or stats["total"] < 3:
                continue
            acc = stats.get("accuracy")
            if acc is None:
                continue
            base = BASE_WEIGHTS.get(key, 0.5)
            if acc < 0.50:
                weights[key] = round(base * 0.80, 3)   # penalise over-weighted driver
            elif acc >= 0.80:
                weights[key] = round(min(base * 1.10, 1.0), 3)  # reward well-calibrated driver
        # Also consider frequently-corrected alternate causes
        entries = _load()
        correct_counts = {}
        for e in entries:
            if e.get("verdict") == "corrected" and e.get("corrected_cause"):
                k = _LABEL_TO_KEY.get(e["corrected_cause"], e["corrected_cause"])
                correct_counts[k] = correct_counts.get(k, 0) + 1
        for k, cnt in correct_counts.items():
            if k in weights and cnt >= 3:
                weights[k] = round(min(weights[k] * 1.15, 1.0), 3)
    except Exception:
        pass
    return weights
