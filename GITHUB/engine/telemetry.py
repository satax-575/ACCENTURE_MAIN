"""
Runtime Telemetry Collector

Tracks per-stage metrics for every pipeline execution:
  - stage_name, method_type (deterministic|statistical|ml|llm|rule_based|template)
  - latency_ms, tokens_in, tokens_out, model_name, estimated_cost_usd

The @track_stage decorator wraps each pipeline stage function so telemetry
is collected automatically without polluting business logic. The TelemetryCollector
aggregates per-request telemetry into a summary included in every API response.

This is NOT an LLM step -- it is pure instrumentation.
"""
import time
import functools
from dataclasses import dataclass, field, asdict
from typing import List, Optional


# Approximate cost per 1K tokens for common models (USD)
MODEL_COSTS = {
    "gemini-2.0-flash": {"input": 0.0, "output": 0.0},          # free tier
    "gemini-1.5-pro": {"input": 0.00125, "output": 0.005},
    "claude-sonnet-4-6": {"input": 0.003, "output": 0.015},
    "template": {"input": 0.0, "output": 0.0},
}


@dataclass
class StageMetric:
    stage: str
    method: str                   # deterministic | statistical | rule_based | llm | template
    latency_ms: float = 0.0
    tokens_in: int = 0
    tokens_out: int = 0
    model_name: str = ""
    estimated_cost_usd: float = 0.0

    def to_dict(self):
        d = asdict(self)
        d["latency_ms"] = round(d["latency_ms"], 1)
        d["estimated_cost_usd"] = round(d["estimated_cost_usd"], 6)
        return d


class TelemetryCollector:
    """Per-request telemetry collector. Create one per pipeline.run_case() call."""

    def __init__(self):
        self.stages: List[StageMetric] = []
        self._start_time = time.perf_counter()

    def record(self, stage: str, method: str, latency_ms: float,
               tokens_in: int = 0, tokens_out: int = 0, model_name: str = ""):
        cost = self._estimate_cost(model_name, tokens_in, tokens_out)
        self.stages.append(StageMetric(
            stage=stage, method=method, latency_ms=latency_ms,
            tokens_in=tokens_in, tokens_out=tokens_out,
            model_name=model_name, estimated_cost_usd=cost,
        ))

    def summary(self) -> dict:
        total_latency = sum(s.latency_ms for s in self.stages)
        llm_calls = sum(1 for s in self.stages if s.method == "llm")
        total_tokens_in = sum(s.tokens_in for s in self.stages)
        total_tokens_out = sum(s.tokens_out for s in self.stages)
        total_cost = sum(s.estimated_cost_usd for s in self.stages)
        return {
            "stages": [s.to_dict() for s in self.stages],
            "total_latency_ms": round(total_latency, 1),
            "llm_calls": llm_calls,
            "total_tokens_in": total_tokens_in,
            "total_tokens_out": total_tokens_out,
            "total_tokens": total_tokens_in + total_tokens_out,
            "estimated_cost_usd": round(total_cost, 6),
            "method_breakdown": self._method_breakdown(),
        }

    def _method_breakdown(self) -> dict:
        breakdown = {}
        for s in self.stages:
            breakdown.setdefault(s.method, {"count": 0, "latency_ms": 0.0})
            breakdown[s.method]["count"] += 1
            breakdown[s.method]["latency_ms"] = round(
                breakdown[s.method]["latency_ms"] + s.latency_ms, 1)
        return breakdown

    @staticmethod
    def _estimate_cost(model_name: str, tokens_in: int, tokens_out: int) -> float:
        costs = MODEL_COSTS.get(model_name, {"input": 0.0, "output": 0.0})
        return (tokens_in / 1000 * costs["input"]) + (tokens_out / 1000 * costs["output"])


def track_stage(stage_name: str, method: str):
    """
    Decorator that wraps a pipeline stage function to automatically record
    its latency and method type in the TelemetryCollector.

    The wrapped function must accept a `telemetry` keyword argument of type
    TelemetryCollector. If not provided, telemetry is silently skipped.

    Usage:
        @track_stage("detect", "statistical")
        def detect_shift(daily, region, ..., telemetry=None):
            ...
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            collector: Optional[TelemetryCollector] = kwargs.get("telemetry")
            start = time.perf_counter()
            result = func(*args, **kwargs)
            elapsed_ms = (time.perf_counter() - start) * 1000

            if collector is not None:
                # If the function returns token metadata (for LLM stages), extract it
                tokens_in = 0
                tokens_out = 0
                model_name = ""
                if isinstance(result, tuple) and len(result) == 2 and isinstance(result[1], dict):
                    actual_result, meta = result
                    tokens_in = meta.get("tokens_in", 0)
                    tokens_out = meta.get("tokens_out", 0)
                    model_name = meta.get("model_name", "")
                    result = actual_result

                collector.record(
                    stage=stage_name, method=method, latency_ms=elapsed_ms,
                    tokens_in=tokens_in, tokens_out=tokens_out, model_name=model_name,
                )
            return result
        return wrapper
    return decorator
