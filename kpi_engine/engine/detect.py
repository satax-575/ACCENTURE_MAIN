"""
Stage 2: Detect Signal

A KPI shift is only flagged if it clears BOTH a statistical significance test
(z-score against a trailing baseline window) and a materiality test (percent
change vs. the threshold in the KPI's semantic contract). This keeps routine
noise from ever reaching an analyst -- purely arithmetic, no LLM.

Round 2 additions:
  - Multi-KPI scanning: detect_all_shifts() iterates all KPIs × regions
  - Forecast comparison: optional cross-check against prediction interval
  - Business-weight prioritization of flagged shifts
"""
import pandas as pd
from typing import List, Optional
from . import forecasting


def baseline_window(daily: pd.DataFrame, region: str, week_start: pd.Timestamp, lookback_days: int = 21):
    """Trailing window strictly before the target week, excluded from itself."""
    region_df = daily[daily.region == region].sort_values("date")
    baseline_end = week_start - pd.Timedelta(days=1)
    baseline_start = baseline_end - pd.Timedelta(days=lookback_days - 1)
    return region_df[(region_df.date >= baseline_start) & (region_df.date <= baseline_end)]


def target_week(daily: pd.DataFrame, region: str, week_start: pd.Timestamp):
    region_df = daily[daily.region == region].sort_values("date")
    week_end = week_start + pd.Timedelta(days=6)
    return region_df[(region_df.date >= week_start) & (region_df.date <= week_end)]


def detect_shift(daily: pd.DataFrame, region: str, week_start: pd.Timestamp,
                  metric: str = "revenue", threshold_pct: float = 5.0):
    """
    Returns a dict describing whether `metric` shifted significantly for
    `region` during the week starting `week_start`, vs. the trailing baseline.
    """
    baseline = baseline_window(daily, region, week_start)
    target = target_week(daily, region, week_start)

    if baseline.empty or target.empty:
        return {"flagged": False, "reason": "insufficient baseline or target data"}

    if metric not in baseline.columns:
        return {"flagged": False, "reason": f"metric '{metric}' not found in data"}

    baseline_daily_mean = baseline[metric].mean()
    baseline_daily_std = baseline[metric].std(ddof=0) or 1e-9
    target_daily_mean = target[metric].mean()

    z = (target_daily_mean - baseline_daily_mean) / baseline_daily_std
    pct_change = (target_daily_mean - baseline_daily_mean) / (baseline_daily_mean or 1e-9) * 100

    significant = abs(z) >= 1.5          # trailing-window z-score threshold
    material = abs(pct_change) >= threshold_pct

    # Supplementary forecast check
    forecast_check = forecasting.forecast_anomaly_check(daily, region, week_start, metric)

    result = {
        "flagged": bool(significant and material),
        "metric": metric,
        "region": region,
        "week_start": str(week_start.date()),
        "baseline_mean": round(float(baseline_daily_mean), 2),
        "target_mean": round(float(target_daily_mean), 2),
        "pct_change": round(float(pct_change), 1),
        "z_score": round(float(z), 2),
        "significant": bool(significant),
        "material": bool(material),
    }

    if forecast_check:
        result["forecast_check"] = forecast_check
        # If the baseline z-score is borderline but forecast also flags it, strengthen the signal
        if (not significant and abs(z) >= 1.0 and material
                and forecast_check.get("outside_prediction_interval")):
            result["flagged"] = True
            result["significant"] = True
            result["detection_note"] = "Borderline z-score strengthened by forecast PI breach"

    return result


def detect_all_shifts(daily: pd.DataFrame, contracts: dict) -> List[dict]:
    """
    Scan all KPIs × regions for material movements.
    Returns a list of flagged shifts sorted by priority (|z| × business_weight).
    """
    regions = daily["region"].unique().tolist()

    # Map KPI names to metric column names
    kpi_metric_map = {
        "Revenue": "revenue",
        "Purchase Frequency": "orders",
        "Average Order Value": "aov",
        "Checkout Error Rate": "checkout_error_rate",
        "Marketing Spend": "marketing_spend",
        "Conversion Rate": "conversion_rate",
    }

    # Find the most recent complete weeks
    max_date = daily["date"].max()
    week_starts = []
    for weeks_back in range(0, 3):
        ws = max_date - pd.Timedelta(days=max_date.dayofweek + 7 * weeks_back)
        week_starts.append(ws)

    flagged = []
    for kpi_name, metric_col in kpi_metric_map.items():
        contract = contracts.get(kpi_name, {})
        threshold = contract.get("threshold_pct", 5.0)
        biz_weight = contract.get("business_weight", 0.5)

        for region in regions:
            for ws in week_starts:
                signal = detect_shift(daily, region, ws, metric=metric_col,
                                       threshold_pct=threshold)
                if signal.get("flagged"):
                    # Priority: higher z-score and business weight = more important
                    days_ago = (max_date - ws).days
                    recency = max(1.0 - (days_ago / 28), 0.3)
                    priority = abs(signal.get("z_score", 0)) * biz_weight * recency

                    signal["kpi_name"] = kpi_name
                    signal["business_weight"] = biz_weight
                    signal["priority_score"] = round(priority, 2)
                    flagged.append(signal)

    flagged.sort(key=lambda s: s["priority_score"], reverse=True)
    return flagged
