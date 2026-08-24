"""
Stage 3: Find Root Cause

For each candidate driver, computes:
  1. percent change vs. the trailing baseline (magnitude)
  2. the first date the driver itself deviates >=1 std from its own baseline
      (onset date), used for a causal PRECEDENCE check
  3. a normalized contribution score

Round 2 additions:
  - Waterfall decomposition: volume/price/mix additive breakdown
  - Alternative hypotheses: up to 3 ranked explanations with per-hypothesis confidence
  - Correlation analysis: Pearson/Spearman between driver and KPI time-series
  - Contradiction detection: identifies when drivers point in conflicting directions
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from . import detect

DRIVER_WEIGHTS = {
    "purchase_frequency": 0.85,
    "checkout_error_rate": 0.90,
    "marketing_spend": 0.35,
    "aov": 0.30,
}

DRIVER_LABELS = {
    "purchase_frequency": "Purchase frequency",
    "checkout_error_rate": "Checkout error rate",
    "marketing_spend": "Marketing spend",
    "aov": "Average order value",
}


def _onset_date(series_df: pd.DataFrame, date_col: str, value_col: str, baseline_mean: float, baseline_std: float):
    """First date in series_df where value deviates >=1 std from baseline."""
    std = baseline_std or 1e-9
    dev = series_df[(series_df[value_col] - baseline_mean).abs() >= std]
    if dev.empty:
        return None
    return dev.sort_values(date_col)[date_col].iloc[0]


def _driver_shift(daily: pd.DataFrame, region: str, week_start: pd.Timestamp, metric: str):
    baseline = detect.baseline_window(daily, region, week_start)
    target = detect.target_week(daily, region, week_start)
    if baseline.empty or target.empty or metric not in daily.columns:
        return None

    baseline_mean = baseline[metric].mean()
    baseline_std = baseline[metric].std(ddof=0) or 1e-9
    target_mean = target[metric].mean()
    if pd.isna(baseline_mean) or pd.isna(target_mean) or baseline_mean == 0:
        return None

    pct_change = (target_mean - baseline_mean) / baseline_mean * 100
    combined = pd.concat([baseline, target])
    onset = _onset_date(combined, "date", metric, baseline_mean, baseline_std)

    # Correlation with revenue (supplementary evidence)
    correlation = _compute_correlation(daily, region, week_start, metric, "revenue")

    return {"pct_change": pct_change, "onset": onset, "correlation": correlation}


def _compute_correlation(daily: pd.DataFrame, region: str, week_start: pd.Timestamp,
                          driver_col: str, kpi_col: str) -> Optional[float]:
    """Pearson correlation between driver and KPI over a 28-day window."""
    region_df = daily[daily.region == region].sort_values("date")
    window_end = week_start + pd.Timedelta(days=6)
    window_start = week_start - pd.Timedelta(days=21)
    window = region_df[(region_df.date >= window_start) & (region_df.date <= window_end)]

    if len(window) < 7 or driver_col not in window.columns or kpi_col not in window.columns:
        return None

    driver_vals = window[driver_col].dropna()
    kpi_vals = window[kpi_col].dropna()

    common_idx = driver_vals.index.intersection(kpi_vals.index)
    if len(common_idx) < 5:
        return None

    try:
        corr = float(driver_vals.loc[common_idx].corr(kpi_vals.loc[common_idx]))
        return round(corr, 3) if not np.isnan(corr) else None
    except Exception:
        return None


def _marketing_shift(mk: pd.DataFrame, region: str, week_start: pd.Timestamp):
    region_mk = mk[mk.region == region].sort_values("week_start")
    baseline = region_mk[region_mk.week_start < week_start].tail(3)
    target = region_mk[region_mk.week_start == week_start]
    if baseline.empty or target.empty:
        return None
    baseline_mean = baseline["spend"].mean()
    target_spend = target["spend"].iloc[0]
    pct_change = (target_spend - baseline_mean) / baseline_mean * 100
    return {"pct_change": pct_change, "onset": target["week_start"].iloc[0], "correlation": None}


def waterfall_decomposition(daily: pd.DataFrame, region: str,
                              week_start: pd.Timestamp) -> dict:
    """
    Break the total revenue change into additive components:
      Revenue = Orders × AOV
      ΔRevenue = ΔVolume_effect + ΔPrice_effect + ΔMix_effect

    Volume effect:  ΔOrders × baseline_AOV
    Price effect:   baseline_Orders × ΔAOV
    Mix effect:     ΔOrders × ΔAOV  (interaction term)

    This is purely deterministic arithmetic — no LLM, no model.
    """
    baseline = detect.baseline_window(daily, region, week_start)
    target = detect.target_week(daily, region, week_start)

    if baseline.empty or target.empty:
        return {"total_change": 0, "components": [], "method": "waterfall_decomposition"}

    b_rev = float(baseline["revenue"].mean())
    t_rev = float(target["revenue"].mean())
    b_orders = float(baseline["orders"].mean())
    t_orders = float(target["orders"].mean())
    b_aov = b_rev / max(b_orders, 1)
    t_aov = t_rev / max(t_orders, 1)

    delta_orders = t_orders - b_orders
    delta_aov = t_aov - b_aov

    volume_effect = delta_orders * b_aov
    price_effect = b_orders * delta_aov
    mix_effect = delta_orders * delta_aov

    total = t_rev - b_rev

    return {
        "total_change": round(total, 2),
        "baseline_revenue": round(b_rev, 2),
        "target_revenue": round(t_rev, 2),
        "components": [
            {"name": "Volume Effect", "value": round(volume_effect, 2),
             "description": f"Change in order count ({delta_orders:+.1f} orders/day) × baseline AOV (${b_aov:.2f})"},
            {"name": "Price Effect", "value": round(price_effect, 2),
             "description": f"Baseline orders ({b_orders:.0f}/day) × change in AOV (${delta_aov:+.2f})"},
            {"name": "Mix Effect", "value": round(mix_effect, 2),
             "description": f"Interaction of volume and price changes"},
        ],
        "method": "waterfall_decomposition",
    }


def find_root_cause(daily: pd.DataFrame, mk: pd.DataFrame, region: str,
                     week_start: pd.Timestamp, kpi_onset: pd.Timestamp) -> list:
    """
    Returns a ranked list of drivers (alternative hypotheses) that:
    (a) shifted meaningfully and (b) passed the causal precedence check,
    each with a normalized contribution percentage and per-hypothesis confidence.
    """
    candidates = {}

    for metric in ["purchase_frequency", "checkout_error_rate", "aov"]:
        col = {"purchase_frequency": "orders", "checkout_error_rate": "checkout_error_rate", "aov": "aov"}[metric]
        shift = _driver_shift(daily, region, week_start, col)
        if shift:
            candidates[metric] = shift

    mkt_shift = _marketing_shift(mk, region, week_start)
    if mkt_shift:
        candidates["marketing_spend"] = mkt_shift

    passed = {}
    for name, shift in candidates.items():
        onset = shift["onset"]
        precedes = (onset is not None) and (pd.Timestamp(onset) <= pd.Timestamp(kpi_onset))
        if precedes and abs(shift["pct_change"]) >= 3:
            passed[name] = shift

    if not passed:
        return []

    magnitudes = {name: abs(s["pct_change"]) * DRIVER_WEIGHTS[name] for name, s in passed.items()}
    total = sum(magnitudes.values()) or 1e-9

    # Check for contradictions: drivers pointing in opposite directions
    directions = {name: 1 if s["pct_change"] > 0 else -1 for name, s in passed.items()}
    unique_directions = set(directions.values())
    has_contradictions = len(unique_directions) > 1

    ranked = []
    for idx, (name, shift) in enumerate(sorted(passed.items(),
                                                key=lambda x: magnitudes[x[0]], reverse=True)):
        contribution = round(magnitudes[name] / total * 100)

        # Per-hypothesis confidence
        if contribution >= 30 and not has_contradictions:
            hyp_conf = "HIGH"
        elif contribution >= 15:
            hyp_conf = "MODERATE"
        else:
            hyp_conf = "LOW"

        ranked.append({
            "driver": DRIVER_LABELS[name],
            "pct_change": round(shift["pct_change"], 1),
            "onset": str(pd.Timestamp(shift["onset"]).date()),
            "contribution_pct": contribution,
            "hypothesis_rank": idx + 1,
            "confidence": hyp_conf,
            "correlation": shift.get("correlation"),
        })

    return ranked


def detect_contradictions(ranked_drivers: list) -> list:
    """
    Check if top drivers point in conflicting directions.
    Returns a list of contradiction descriptions.
    """
    contradictions = []
    if len(ranked_drivers) < 2:
        return contradictions

    for i in range(len(ranked_drivers)):
        for j in range(i + 1, len(ranked_drivers)):
            d1 = ranked_drivers[i]
            d2 = ranked_drivers[j]
            # One positive, one negative shift — potentially contradictory
            if (d1["pct_change"] > 0) != (d2["pct_change"] > 0):
                # Only flag if both have meaningful contribution
                if d1["contribution_pct"] >= 15 and d2["contribution_pct"] >= 15:
                    contradictions.append(
                        f"{d1['driver']} ({d1['pct_change']:+.1f}%) and "
                        f"{d2['driver']} ({d2['pct_change']:+.1f}%) point in "
                        f"opposite directions"
                    )
    return contradictions
