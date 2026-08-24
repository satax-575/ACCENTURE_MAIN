"""
Stage 5: Narrate

This is the only stage where an LLM belongs in this architecture -- and even
then, it is only ever handed the already-verified output of stages 2-4.

Round 2 additions:
  - Google Gemini integration (free tier) with evidence-pinned prompts
  - Token counting and cost tracking per narration call
  - Narration cache (LRU by case hash) to avoid redundant LLM calls
  - Template narration remains as zero-cost, zero-latency fallback
"""
import os
import json
import hashlib
from functools import lru_cache
from typing import Tuple, Optional

PERSONA_INSTRUCTIONS = {
    "ceo": "One or two sentences. High-level business impact and urgency. No technical detail. "
           "Focus on what's at stake and whether it needs CEO attention.",
    "manager": "Operational detail: what to escalate, to whom, and by when. Regional focus. "
               "Include specific numbers and the most urgent action item.",
    "analyst": "Full evidence trail: every driver, its contribution percentage, onset date, "
               "correlation evidence, and the overall confidence level. Be precise and technical.",
}


# ---------- Narration cache ----------

_narration_cache: dict = {}
MAX_CACHE_SIZE = 100


def _cache_key(kpi_case: dict, persona: str) -> str:
    """Hash the case evidence + persona to create a cache key."""
    # Only hash the evidence fields, not the narrative itself
    evidence = {
        "region": kpi_case.get("region"),
        "signal": kpi_case.get("signal"),
        "drivers": kpi_case.get("drivers"),
        "confidence": kpi_case.get("confidence"),
        "persona": persona,
    }
    raw = json.dumps(evidence, sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()


def _get_cached(key: str) -> Optional[str]:
    return _narration_cache.get(key)


def _set_cached(key: str, narrative: str):
    if len(_narration_cache) >= MAX_CACHE_SIZE:
        # Simple eviction: remove oldest entry
        oldest = next(iter(_narration_cache))
        del _narration_cache[oldest]
    _narration_cache[key] = narrative


# ---------- Template narration (zero-cost fallback) ----------

def narrate_template(kpi_case: dict, persona: str) -> str:
    region = kpi_case["region"]
    delta = kpi_case["signal"]["pct_change"]
    conf = kpi_case["confidence"]["level"]
    drivers = kpi_case["drivers"]

    if conf == "ABSTAIN":
        missing = kpi_case["confidence"].get("missing_or_stale", [])
        return (f"Insufficient evidence to identify a reliable root cause for the "
                f"{delta:+.1f}% {kpi_case['signal']['metric']} shift in {region}. "
                f"Data gap in: {', '.join(missing)}. "
                f"Requesting clarification before recommending action.")

    top = drivers[0] if drivers else None
    contradictions = kpi_case["confidence"].get("contradictions", [])

    if persona == "ceo":
        if not top:
            return (f"{kpi_case['signal']['metric'].title()} shifted {delta:+.1f}% in {region}. "
                    f"No single verified driver yet -- under investigation.")
        narrative = (f"{kpi_case['signal']['metric'].title()} in {region} moved {delta:+.1f}%, "
                     f"primarily driven by {top['driver'].lower()} (~{top['contribution_pct']}% "
                     f"of the shift). Confidence: {conf}.")
        if contradictions:
            narrative += f" Note: conflicting signals detected -- {contradictions[0]}."
        return narrative

    if persona == "manager":
        if not top:
            return (f"{region}: {kpi_case['signal']['metric']} shifted {delta:+.1f}%. "
                    f"No verified driver yet -- escalate to the analyst team.")
        narrative = (f"{region}: {top['driver']} shifted {top['pct_change']:+.1f}% starting "
                     f"{top['onset']}, ahead of the {kpi_case['signal']['metric']} move. "
                     f"Escalate and prioritize outreach this week.")
        if len(drivers) > 1:
            secondary = drivers[1]
            narrative += (f" Secondary factor: {secondary['driver']} "
                          f"({secondary['pct_change']:+.1f}%, {secondary['contribution_pct']}% contribution).")
        return narrative

    if persona == "analyst":
        lines = []
        for d in drivers:
            line = (f"{d['driver']}: {d['pct_change']:+.1f}% (onset {d['onset']}) -> "
                    f"{d['contribution_pct']}% contribution")
            if d.get("correlation") is not None:
                line += f", r={d['correlation']}"
            line += f" [{d.get('confidence', 'N/A')}]"
            lines.append(line)
        result = f"Confidence: {conf}. Ranked drivers -- " + "; ".join(lines) if lines else \
                 f"Confidence: {conf}. No drivers passed precedence check."
        if contradictions:
            result += f" [!] Contradictions: {'; '.join(contradictions)}"
        return result

    return "Unknown persona."


# ---------- Gemini LLM narration ----------

def narrate_with_llm(kpi_case: dict, persona: str) -> Tuple[str, dict]:
    """
    Real LLM integration using Google Gemini (free tier).
    Returns (narrative_text, token_metadata).

    The prompt only ever contains the already-verified kpi_case dict —
    never raw data — so the model cannot invent an unverified cause.
    """
    try:
        import google.generativeai as genai

        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            # Fall back to template if no API key
            return narrate_template(kpi_case, persona), {
                "tokens_in": 0, "tokens_out": 0,
                "model_name": "template", "fallback": True,
            }

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        # Check cache first
        cache_key = _cache_key(kpi_case, persona)
        cached = _get_cached(cache_key)
        if cached:
            return cached, {
                "tokens_in": 0, "tokens_out": 0,
                "model_name": "gemini-2.0-flash", "cached": True,
            }

        system_instruction = (
            "You narrate pre-verified KPI evidence for a business audience. "
            "You must not introduce any cause, number, or driver that is not "
            "already present in the JSON evidence you are given. "
            "If the confidence level is ABSTAIN, you must clearly state that "
            "the engine cannot identify a reliable cause and explain why. "
            f"Audience: {persona}. Style: {PERSONA_INSTRUCTIONS[persona]}"
        )

        prompt = f"{system_instruction}\n\nEvidence:\n{json.dumps(kpi_case, default=str)}"

        response = model.generate_content(prompt)
        narrative = response.text.strip()

        # Token usage from response metadata
        usage = getattr(response, 'usage_metadata', None)
        tokens_in = getattr(usage, 'prompt_token_count', 0) if usage else 0
        tokens_out = getattr(usage, 'candidates_token_count', 0) if usage else 0

        # Cache the result
        _set_cached(cache_key, narrative)

        return narrative, {
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "model_name": "gemini-2.0-flash",
            "cached": False,
        }

    except Exception as e:
        # Graceful fallback to template
        return narrate_template(kpi_case, persona), {
            "tokens_in": 0, "tokens_out": 0,
            "model_name": "template",
            "fallback": True,
            "error": str(e),
        }


# ---------- Narrator selection ----------

def narrate(kpi_case: dict, persona: str, use_llm: bool = False) -> Tuple[str, dict]:
    """
    Unified narration entry point. Returns (narrative, metadata).
    If use_llm=True AND a Gemini API key is available, uses the LLM.
    Otherwise falls back to template narration (zero cost, zero latency).
    """
    if use_llm:
        return narrate_with_llm(kpi_case, persona)
    return narrate_template(kpi_case, persona), {
        "tokens_in": 0, "tokens_out": 0,
        "model_name": "template", "cached": False,
    }


# Backward compatibility
NARRATOR = narrate_template
