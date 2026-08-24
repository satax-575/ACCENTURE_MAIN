"""
Pipeline orchestrator: Ingest -> Detect -> Root cause -> Confidence -> Narrate -> Recommend.

Round 2 additions:
  - Runtime telemetry instrumentation per stage
  - run_all_kpis() for proactive scanning
  - Waterfall decomposition integration
  - Alternative hypotheses in output
  - LLM vs non-LLM method tracking
"""
import time
import pandas as pd
from typing import Optional

from . import ingest, detect, root_cause, confidence, narrate, recommend
from .telemetry import TelemetryCollector


def run_case(region: str, week_start: str, metric: str = "revenue",
             persona: str = "ceo", use_llm: bool = False) -> dict:
    """
    Single entry point for analyzing a KPI case.
    Returns a JSON-serializable dict with signal, drivers, confidence,
    narrative, actions, waterfall, and telemetry.
    """
    collector = TelemetryCollector()
    week_start_ts = pd.Timestamp(week_start)

    # --- Stage 1: Ingest (deterministic) ---
    t0 = time.perf_counter()
    tx, mk, sp = ingest.load_sources()
    daily = ingest.daily_kpis(tx, sp)
    as_of = tx["date"].max()
    freshness = ingest.source_freshness(tx, mk, sp, region, as_of)
    collector.record("ingest", "deterministic", (time.perf_counter() - t0) * 1000)

    # --- Stage 2: Detect (statistical) ---
    t0 = time.perf_counter()
    from . import access
    contracts = access.load_contracts()
    kpi_contract = None
    # Find the matching contract for the metric
    metric_to_kpi = {
        "revenue": "Revenue",
        "orders": "Purchase Frequency",
        "aov": "Average Order Value",
        "checkout_error_rate": "Checkout Error Rate",
    }
    kpi_name = metric_to_kpi.get(metric, "Revenue")
    kpi_contract = contracts.get(kpi_name, {})
    threshold = kpi_contract.get("threshold_pct", 5.0)

    signal = detect.detect_shift(daily, region, week_start_ts, metric=metric,
                                  threshold_pct=threshold)
    collector.record("detect", "statistical", (time.perf_counter() - t0) * 1000)

    if not signal.get("flagged"):
        collector.record("root_cause", "statistical", 0)
        collector.record("confidence", "rule_based", 0)
        collector.record("narrate", "template", 0)
        collector.record("recommend", "rule_based", 0)
        return {
            "region": region,
            "signal": signal,
            "drivers": [],
            "confidence": {"level": "N/A", "reason": "No significant, material shift detected.",
                           "contradictions": []},
            "freshness": freshness,
            "narrative": "No anomaly detected for this KPI/region/week.",
            "actions": [],
            "action": "No action needed.",
            "waterfall": {"total_change": 0, "components": []},
            "telemetry": collector.summary(),
        }

    # --- Stage 3: Root cause (statistical) ---
    t0 = time.perf_counter()
    kpi_onset = week_start_ts
    drivers = root_cause.find_root_cause(daily, mk, region, week_start_ts, kpi_onset)
    waterfall = root_cause.waterfall_decomposition(daily, region, week_start_ts)
    collector.record("root_cause", "statistical", (time.perf_counter() - t0) * 1000)

    # --- Stage 4: Confidence (rule_based) ---
    t0 = time.perf_counter()
    conf = confidence.score(freshness, drivers)
    collector.record("confidence", "rule_based", (time.perf_counter() - t0) * 1000)

    # Build the case dict (without narrative yet)
    kpi_case = {
        "region": region,
        "signal": signal,
        "drivers": drivers,
        "confidence": conf,
        "freshness": freshness,
        "waterfall": waterfall,
    }

    # --- Stage 5: Narrate (template or LLM) ---
    t0 = time.perf_counter()
    narrative_text, narrate_meta = narrate.narrate(kpi_case, persona, use_llm=use_llm)
    method = "llm" if narrate_meta.get("model_name", "template") != "template" else "template"
    collector.record(
        "narrate", method, (time.perf_counter() - t0) * 1000,
        tokens_in=narrate_meta.get("tokens_in", 0),
        tokens_out=narrate_meta.get("tokens_out", 0),
        model_name=narrate_meta.get("model_name", ""),
    )
    kpi_case["narrative"] = narrative_text

    # --- Stage 6: Recommend (rule_based) ---
    t0 = time.perf_counter()
    actions = recommend.recommend(kpi_case, persona=persona)
    kpi_case["actions"] = actions
    # Backward-compatible simple action string
    kpi_case["action"] = recommend.recommend_simple(kpi_case)
    collector.record("recommend", "rule_based", (time.perf_counter() - t0) * 1000)

    # Attach telemetry
    kpi_case["telemetry"] = collector.summary()

    return kpi_case


def run_all_kpis(persona: str = "ceo") -> dict:
    """
    Proactive scanning: run detection across all KPIs × regions.
    Returns a dashboard-ready summary.
    """
    collector = TelemetryCollector()

    t0 = time.perf_counter()
    tx, mk, sp = ingest.load_sources()
    daily = ingest.daily_kpis(tx, sp)
    from . import access
    contracts = access.load_contracts()
    collector.record("ingest", "deterministic", (time.perf_counter() - t0) * 1000)

    t0 = time.perf_counter()
    flagged = detect.detect_all_shifts(daily, contracts)
    collector.record("detect_all", "statistical", (time.perf_counter() - t0) * 1000)

    # Build KPI summaries
    kpi_summaries = []
    regions = daily["region"].unique().tolist()

    kpi_metric_map = {
        "Revenue": "revenue",
        "Purchase Frequency": "orders",
        "Average Order Value": "aov",
        "Checkout Error Rate": "checkout_error_rate",
        "Marketing Spend": "marketing_spend",
        "Conversion Rate": "conversion_rate",
    }

    max_date = daily["date"].max()
    recent_week = max_date - pd.Timedelta(days=max_date.dayofweek)

    for kpi_name, metric_col in kpi_metric_map.items():
        if not access.can_view(persona, kpi_name):
            continue
        contract = contracts.get(kpi_name, {})
        for region in regions:
            # Get current value (most recent week)
            target = detect.target_week(daily, region, recent_week)
            if target.empty or metric_col not in target.columns:
                continue

            current_val = round(float(target[metric_col].mean()), 2)

            # Check if this KPI/region is in the flagged list
            matching = [f for f in flagged
                        if f.get("kpi_name") == kpi_name and f.get("region") == region]

            if matching:
                status = "alert"
                pct_change = matching[0].get("pct_change", 0)
                week = matching[0].get("week_start", str(recent_week.date()))
            else:
                status = "normal"
                pct_change = 0
                week = str(recent_week.date())

            kpi_summaries.append({
                "kpi": kpi_name,
                "status": status,
                "current_value": current_val,
                "pct_change": pct_change,
                "region": region,
                "week_start": week,
                "owner": contract.get("owner", ""),
                "source": contract.get("source", ""),
                "refresh": contract.get("refresh", ""),
            })

    return {
        "kpi_summaries": kpi_summaries,
        "flagged_shifts": flagged,
        "telemetry": collector.summary(),
    }
