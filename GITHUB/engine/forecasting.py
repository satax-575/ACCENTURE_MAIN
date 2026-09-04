"""
Forecasting Module

Simple exponential smoothing and Holt-Winters for KPI time-series forecasting.
Generates expected values and prediction intervals.

Used by detect.py as a supplementary anomaly signal ("actual fell outside 95% PI")
and by the frontend to display forecast charts.

This is a STATISTICAL method — clearly labeled as non-LLM.
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional

try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    HAS_STATSMODELS = True
except ImportError:
    HAS_STATSMODELS = False


def _simple_exponential_smoothing(values: np.ndarray, alpha: float = 0.3,
                                    horizon: int = 7) -> dict:
    """
    Fallback when statsmodels is not available.
    Returns forecast values and approximate prediction intervals.
    """
    n = len(values)
    if n < 3:
        return {"forecast": [], "method": "insufficient_data"}

    # Fit: compute smoothed values
    smoothed = np.zeros(n)
    smoothed[0] = values[0]
    for i in range(1, n):
        smoothed[i] = alpha * values[i] + (1 - alpha) * smoothed[i - 1]

    # Forecast: last smoothed value repeated
    last_smoothed = smoothed[-1]
    residuals = values - smoothed
    rmse = np.sqrt(np.mean(residuals ** 2))

    forecast_values = [last_smoothed] * horizon
    lower = [last_smoothed - 1.96 * rmse] * horizon
    upper = [last_smoothed + 1.96 * rmse] * horizon

    return {
        "forecast": forecast_values,
        "lower": lower,
        "upper": upper,
        "rmse": round(float(rmse), 2),
        "method": "simple_exponential_smoothing",
    }


def _holt_winters_forecast(values: np.ndarray, horizon: int = 7,
                            seasonal_periods: int = 7) -> dict:
    """
    Holt-Winters exponential smoothing with additive trend.
    Falls back to simple exponential smoothing if data is too short
    for seasonal decomposition.
    """
    if not HAS_STATSMODELS or len(values) < 2 * seasonal_periods:
        return _simple_exponential_smoothing(values, horizon=horizon)

    try:
        model = ExponentialSmoothing(
            values,
            trend="add",
            seasonal=None,  # skip seasonal for short series
            initialization_method="estimated",
        ).fit(optimized=True)

        forecast = model.forecast(horizon)
        residuals = model.resid
        rmse = np.sqrt(np.mean(residuals ** 2))

        return {
            "forecast": forecast.tolist(),
            "lower": (forecast - 1.96 * rmse).tolist(),
            "upper": (forecast + 1.96 * rmse).tolist(),
            "rmse": round(float(rmse), 2),
            "method": "holt_winters_additive",
        }
    except Exception:
        return _simple_exponential_smoothing(values, horizon=horizon)


def forecast_kpi(daily: pd.DataFrame, region: str, metric: str = "revenue",
                  horizon: int = 7) -> dict:
    """
    Generate a forecast for a KPI in a specific region.

    Returns:
        {
            "kpi": metric,
            "region": region,
            "historical": [{"date": "...", "value": ...}, ...],
            "forecast": [{"date": "...", "value": ..., "lower": ..., "upper": ...}, ...],
            "method": "holt_winters_additive" | "simple_exponential_smoothing",
            "rmse": float,
        }
    """
    region_df = daily[daily.region == region].sort_values("date")
    if region_df.empty or metric not in region_df.columns:
        return {"kpi": metric, "region": region, "error": "No data available"}

    dates = region_df["date"].tolist()
    values = region_df[metric].values.astype(float)

    # Remove NaN values
    mask = ~np.isnan(values)
    dates = [d for d, m in zip(dates, mask) if m]
    values = values[mask]

    if len(values) < 5:
        return {"kpi": metric, "region": region, "error": "Insufficient history for forecasting"}

    result = _holt_winters_forecast(values, horizon=horizon)

    # Build historical series
    historical = [{"date": str(d.date()) if hasattr(d, 'date') else str(d),
                    "value": round(float(v), 2)}
                   for d, v in zip(dates, values)]

    # Build forecast series with future dates
    last_date = pd.Timestamp(dates[-1])
    forecast_points = []
    for i, (fv, lo, hi) in enumerate(zip(
            result.get("forecast", []),
            result.get("lower", []),
            result.get("upper", []))):
        future_date = last_date + pd.Timedelta(days=i + 1)
        forecast_points.append({
            "date": str(future_date.date()),
            "value": round(float(fv), 2),
            "lower": round(float(lo), 2),
            "upper": round(float(hi), 2),
        })

    return {
        "kpi": metric,
        "region": region,
        "historical": historical,
        "forecast": forecast_points,
        "method": result.get("method", "unknown"),
        "rmse": result.get("rmse", 0),
    }


def forecast_anomaly_check(daily: pd.DataFrame, region: str,
                             week_start: pd.Timestamp, metric: str = "revenue") -> Optional[dict]:
    """
    Check if the actual value for the target week falls outside the
    forecast prediction interval. Returns anomaly metadata if so.
    """
    region_df = daily[daily.region == region].sort_values("date")
    if region_df.empty or metric not in region_df.columns:
        return None

    # Use data before the target week to build the forecast
    train_df = region_df[region_df.date < week_start]
    target_df = region_df[(region_df.date >= week_start) &
                           (region_df.date < week_start + pd.Timedelta(days=7))]

    if train_df.empty or target_df.empty:
        return None

    values = train_df[metric].values.astype(float)
    mask = ~np.isnan(values)
    values = values[mask]

    if len(values) < 5:
        return None

    result = _holt_winters_forecast(values, horizon=7)
    if not result.get("forecast"):
        return None

    actual_mean = float(target_df[metric].mean())
    forecast_mean = float(np.mean(result["forecast"]))
    lower_mean = float(np.mean(result["lower"]))
    upper_mean = float(np.mean(result["upper"]))

    outside_pi = actual_mean < lower_mean or actual_mean > upper_mean

    return {
        "forecast_mean": round(forecast_mean, 2),
        "actual_mean": round(actual_mean, 2),
        "lower_bound": round(lower_mean, 2),
        "upper_bound": round(upper_mean, 2),
        "outside_prediction_interval": outside_pi,
        "method": result.get("method", "unknown"),
    }
