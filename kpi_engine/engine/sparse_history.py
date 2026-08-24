"""
Scenario 3: Sparse-History KPI

The standard path in detect.py needs a trailing baseline window (21 days by
default) to compute a reliable mean/std. A product with less history than
that cannot be scored that way -- there is no baseline to compare against.

This module is the engine's alternate strategy for that case: compare the
new item's early-life run rate against a cohort/business-rule benchmark
(a declared assumption about typical new-product performance, sourced from
past launches -- not learned, not guessed by an LLM) instead of a trailing
baseline. Confidence is explicitly capped at MODERATE, never HIGH, no matter
how large the observed gap is, because the underlying sample is thin by
construction. This mirrors detect.py + root_cause.py's job for the sparse
case, and reuses recommend.py's action pattern, but does not pretend to have
the statistical power that the standard path has.
"""
import pandas as pd

MIN_HISTORY_DAYS = 14                    # below this, detect.py's baseline is not reliable
COHORT_BENCHMARK_ORDERS_PER_DAY = 10.0   # business rule: average Day 1-14 order rate observed
                                          # across the last 3 comparable product launches
FLAG_THRESHOLD_PCT = 15.0


def is_sparse(tx: pd.DataFrame, product: str, as_of: pd.Timestamp):
    product_tx = tx[tx["product"] == product]
    if product_tx.empty:
        return False, None
    launch_date = product_tx["date"].min()
    days_live = (as_of - launch_date).days + 1
    return days_live < MIN_HISTORY_DAYS, launch_date


def analyze(tx: pd.DataFrame, product: str, region: str, as_of: pd.Timestamp):
    """
    Returns None if the product has enough history for the standard path
    (caller should use detect.py + root_cause.py instead), otherwise a
    sparse-history case dict shaped like pipeline.run_case()'s output so it
    can be narrated/recommended the same way.
    """
    sparse, launch_date = is_sparse(tx, product, as_of)
    if not sparse:
        return None

    product_tx = tx[(tx["product"] == product) & (tx["region"] == region)]
    if product_tx.empty:
        return None

    days_live = (as_of - launch_date).days + 1
    actual_orders_per_day = len(product_tx) / max(days_live, 1)
    pct_vs_benchmark = ((actual_orders_per_day - COHORT_BENCHMARK_ORDERS_PER_DAY)
                         / COHORT_BENCHMARK_ORDERS_PER_DAY * 100)
    flagged = abs(pct_vs_benchmark) >= FLAG_THRESHOLD_PCT
    direction = "below" if pct_vs_benchmark < 0 else "above"

    confidence = {
        "level": "MODERATE" if flagged else "N/A",
        "reason": (f"Only {days_live} days of history for {product} -- capped below HIGH "
                   f"regardless of gap size. Compared against a cohort/business-rule "
                   f"benchmark, not a trailing statistical baseline.")
                  if flagged else "No material gap vs. the cohort benchmark.",
    }

    narrative = (
        f"{product} in {region} is averaging {actual_orders_per_day:.1f} orders/day over its "
        f"first {days_live} days, {abs(pct_vs_benchmark):.0f}% {direction} the "
        f"{COHORT_BENCHMARK_ORDERS_PER_DAY:.0f}/day cohort benchmark for comparable new-product "
        f"launches. Confidence: MODERATE (sparse-history mode)."
    ) if flagged else f"{product} is tracking in line with the cohort benchmark."

    action = ("Monitor daily; do not escalate on sparse-history evidence alone. "
              "Re-run with the standard baseline once 14+ days of history are available.") \
        if flagged else "No action needed."

    return {
        "mode": "sparse_history",
        "product": product,
        "region": region,
        "launch_date": str(launch_date.date()),
        "days_live": days_live,
        "actual_orders_per_day": round(actual_orders_per_day, 1),
        "cohort_benchmark_orders_per_day": COHORT_BENCHMARK_ORDERS_PER_DAY,
        "pct_vs_benchmark": round(pct_vs_benchmark, 1),
        "flagged": flagged,
        "confidence": confidence,
        "narrative": narrative,
        "action": action,
    }
