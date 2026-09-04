"""
Stage 5: Narrate — Multi-Provider LLM Abstraction

Architecture:
  - Provider auto-detection from environment variables (no hardcoding)
  - Supported providers (all have free tiers):
      1. Groq       — GROQ_API_KEY       — Llama 3.1 8B/70B, Mixtral (fastest free inference)
      2. Anthropic  — ANTHROPIC_API_KEY  — Claude Haiku 3.5 (cheap, smart)
      3. Gemini     — GEMINI_API_KEY     — Gemini 2.0 Flash (Google AI Studio free tier)
      4. OpenRouter — OPENROUTER_API_KEY — aggregates all above + more free models
  - Cost-aware routing: fast model for HIGH-confidence cases, strong for ABSTAIN/contradictions
  - Narration cache (LRU) to avoid redundant LLM calls
  - Template fallback when no provider is configured (never breaks the pipeline)

The LLM is ONLY handed the already-verified kpi_case dict.
It cannot invent drivers, numbers, or causes that were not computed upstream.
"""
import os
import json
import hashlib
from typing import Tuple, Optional

# ---------------------------------------------------------------------------
# Persona style instructions
# ---------------------------------------------------------------------------

PERSONA_INSTRUCTIONS = {
    "ceo": (
        "One or two sentences. High-level business impact and urgency. No technical detail. "
        "Focus on what's at stake and whether it needs CEO attention."
    ),
    "manager": (
        "Operational detail: what to escalate, to whom, and by when. Regional focus. "
        "Include specific numbers and the most urgent action item."
    ),
    "analyst": (
        "Full evidence trail: every driver, its contribution percentage, onset date, "
        "correlation evidence, and the overall confidence level. Be precise and technical."
    ),
}

# ---------------------------------------------------------------------------
# Model routing config (provider-agnostic fast/strong distinction)
# ---------------------------------------------------------------------------

# Each provider has a fast (cheap/free) model and a strong model.
# Routes are resolved at call-time based on which provider is active.
_PROVIDER_MODELS = {
    "groq": {
        "fast":   "qwen/qwen3.8-27b",       # fast, free — clear high-confidence cases
        "strong": "openai/gpt-oss-120b",     # 120B params — ABSTAIN, contradictions
    },
    "anthropic": {
        "fast":   "claude-haiku-3-5",
        "strong": "claude-3-5-sonnet-20241022",
    },
    "gemini": {
        "fast":   "gemini-2.0-flash",
        "strong": "gemini-1.5-pro",
    },
    "openrouter": {
        "fast":   "meta-llama/llama-3.1-8b-instruct:free",
        "strong": "anthropic/claude-haiku:beta",
    },
}


def _detect_provider() -> Optional[str]:
    """Return the first configured provider name, or None."""
    if os.environ.get("GROQ_API_KEY"):
        return "groq"
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
        return "gemini"
    if os.environ.get("OPENROUTER_API_KEY"):
        return "openrouter"
    return None


def select_model(kpi_case: dict) -> Tuple[str, str, str]:
    """
    Cost-aware routing. Returns (provider, model_name, routing_reason).

    Logic:
      - ABSTAIN → strong model (careful uncertainty communication)
      - Contradictions → strong model (competing hypotheses)
      - HIGH confidence, no contradictions → fast model (cost-optimised)
      - Otherwise → fast model
    """
    provider = _detect_provider()
    if not provider:
        return "none", "template", "No LLM provider configured — using template"

    models = _PROVIDER_MODELS[provider]
    confidence = kpi_case.get("confidence", {})
    level = confidence.get("level", "MODERATE")
    contradictions = confidence.get("contradictions", [])

    if level == "ABSTAIN":
        return provider, models["strong"], "ABSTAIN: stronger model for uncertainty communication"
    if contradictions:
        return provider, models["strong"], (
            f"Contradictions ({len(contradictions)}): stronger model for nuanced framing"
        )
    if level == "HIGH":
        return provider, models["fast"], "HIGH confidence, no contradictions: fast model (cost-optimised)"
    return provider, models["fast"], "MODERATE/LOW confidence: fast model"


# ---------------------------------------------------------------------------
# Narration cache
# ---------------------------------------------------------------------------

_narration_cache: dict = {}
MAX_CACHE_SIZE = 100


def _cache_key(kpi_case: dict, persona: str) -> str:
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
        oldest = next(iter(_narration_cache))
        del _narration_cache[oldest]
    _narration_cache[key] = narrative


def clear_cache():
    """Clear narration cache (useful after feedback corrections)."""
    _narration_cache.clear()


# ---------------------------------------------------------------------------
# Template narration — zero-cost, zero-latency fallback
# ---------------------------------------------------------------------------

def narrate_template(kpi_case: dict, persona: str) -> str:
    region = kpi_case["region"]
    delta = kpi_case["signal"]["pct_change"]
    conf = kpi_case["confidence"]["level"]
    drivers = kpi_case["drivers"]

    if conf == "ABSTAIN":
        missing = kpi_case["confidence"].get("missing_or_stale", [])
        return (
            f"Insufficient evidence to identify a reliable root cause for the "
            f"{delta:+.1f}% {kpi_case['signal']['metric']} shift in {region}. "
            f"Data gap in: {', '.join(missing)}. "
            f"Requesting clarification before recommending action."
        )

    top = drivers[0] if drivers else None
    contradictions = kpi_case["confidence"].get("contradictions", [])

    if persona == "ceo":
        if not top:
            return (
                f"{kpi_case['signal']['metric'].title()} shifted {delta:+.1f}% in {region}. "
                f"No single verified driver yet — under investigation."
            )
        narrative = (
            f"{kpi_case['signal']['metric'].title()} in {region} moved {delta:+.1f}%, "
            f"primarily driven by {top['driver'].lower()} (~{top['contribution_pct']}% "
            f"of the shift). Confidence: {conf}."
        )
        if contradictions:
            narrative += f" Note: conflicting signals detected — {contradictions[0]}."
        return narrative

    if persona == "manager":
        if not top:
            return (
                f"{region}: {kpi_case['signal']['metric']} shifted {delta:+.1f}%. "
                f"No verified driver yet — escalate to the analyst team."
            )
        narrative = (
            f"{region}: {top['driver']} shifted {top['pct_change']:+.1f}% starting "
            f"{top['onset']}, ahead of the {kpi_case['signal']['metric']} move. "
            f"Escalate and prioritize outreach this week."
        )
        if len(drivers) > 1:
            secondary = drivers[1]
            narrative += (
                f" Secondary factor: {secondary['driver']} "
                f"({secondary['pct_change']:+.1f}%, {secondary['contribution_pct']}% contribution)."
            )
        return narrative

    if persona == "analyst":
        lines = []
        for d in drivers:
            line = (
                f"{d['driver']}: {d['pct_change']:+.1f}% (onset {d['onset']}) → "
                f"{d['contribution_pct']}% contribution"
            )
            if d.get("correlation") is not None:
                line += f", r={d['correlation']}"
            line += f" [{d.get('confidence', 'N/A')}]"
            lines.append(line)
        result = (
            f"Confidence: {conf}. Ranked drivers — " + "; ".join(lines)
            if lines else f"Confidence: {conf}. No drivers passed precedence check."
        )
        if contradictions:
            result += f" [!] Contradictions: {'; '.join(contradictions)}"
        return result

    return "Unknown persona."


# ---------------------------------------------------------------------------
# Provider-specific LLM call implementations
# ---------------------------------------------------------------------------

def _build_prompt(kpi_case: dict, persona: str) -> Tuple[str, str]:
    """Build (system_prompt, user_message) for any provider."""
    system = (
        "You narrate pre-verified KPI evidence for a business audience. "
        "You must not introduce any cause, number, or driver that is not already "
        "present in the JSON evidence you are given. "
        "If the confidence level is ABSTAIN, clearly state the engine cannot identify "
        "a reliable cause and explain why. "
        f"Audience: {persona}. Style guide: {PERSONA_INSTRUCTIONS[persona]}"
    )
    user = f"Evidence JSON:\n{json.dumps(kpi_case, default=str)}"
    return system, user


def _call_groq(kpi_case: dict, persona: str, model: str) -> Tuple[str, dict]:
    from groq import Groq
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    system, user = _build_prompt(kpi_case, persona)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=400,
        temperature=0.3,
    )
    text = response.choices[0].message.content.strip()
    usage = response.usage
    return text, {
        "tokens_in": usage.prompt_tokens,
        "tokens_out": usage.completion_tokens,
        "model_name": model,
        "provider": "groq",
        "cached": False,
        # Groq free tier: $0 cost
        "estimated_cost_usd": 0.0,
    }


def _call_anthropic(kpi_case: dict, persona: str, model: str) -> Tuple[str, dict]:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    system, user = _build_prompt(kpi_case, persona)
    response = client.messages.create(
        model=model,
        max_tokens=400,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    text = response.content[0].text.strip()
    tokens_in = response.usage.input_tokens
    tokens_out = response.usage.output_tokens
    # Claude Haiku pricing: $0.80/M in, $4.00/M out
    cost = (tokens_in * 0.80 + tokens_out * 4.00) / 1_000_000
    return text, {
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "model_name": model,
        "provider": "anthropic",
        "cached": False,
        "estimated_cost_usd": round(cost, 6),
    }


def _call_gemini(kpi_case: dict, persona: str, model: str) -> Tuple[str, dict]:
    import google.generativeai as genai
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    genai.configure(api_key=api_key)
    system, user = _build_prompt(kpi_case, persona)
    gemini_model = genai.GenerativeModel(
        model_name=model,
        system_instruction=system,
    )
    response = gemini_model.generate_content(user)
    text = response.text.strip()
    usage = getattr(response, "usage_metadata", None)
    tokens_in = getattr(usage, "prompt_token_count", 0) if usage else 0
    tokens_out = getattr(usage, "candidates_token_count", 0) if usage else 0
    return text, {
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "model_name": model,
        "provider": "gemini",
        "cached": False,
        "estimated_cost_usd": 0.0,  # Free tier
    }


def _call_openrouter(kpi_case: dict, persona: str, model: str) -> Tuple[str, dict]:
    import requests
    system, user = _build_prompt(kpi_case, persona)
    resp = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
            "HTTP-Referer": "https://kpi-engine.local",
            "X-Title": "KPI Intelligence Engine",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": 400,
            "temperature": 0.3,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    text = data["choices"][0]["message"]["content"].strip()
    usage = data.get("usage", {})
    return text, {
        "tokens_in": usage.get("prompt_tokens", 0),
        "tokens_out": usage.get("completion_tokens", 0),
        "model_name": model,
        "provider": "openrouter",
        "cached": False,
        "estimated_cost_usd": 0.0,  # free models = $0
    }


_PROVIDER_CALLERS = {
    "groq": _call_groq,
    "anthropic": _call_anthropic,
    "gemini": _call_gemini,
    "openrouter": _call_openrouter,
}


# ---------------------------------------------------------------------------
# Public narrate() entry point
# ---------------------------------------------------------------------------

def narrate_with_llm(kpi_case: dict, persona: str) -> Tuple[str, dict]:
    """
    Calls the active LLM provider with cost-aware model routing.
    Falls back to template on any error or if no provider is configured.
    """
    provider, model, routing_reason = select_model(kpi_case)

    if provider == "none":
        return narrate_template(kpi_case, persona), {
            "tokens_in": 0, "tokens_out": 0,
            "model_name": "template", "provider": "none",
            "fallback": True, "routing_reason": routing_reason,
            "estimated_cost_usd": 0.0,
        }

    # Check cache before making a paid/rate-limited API call
    cache_key = _cache_key(kpi_case, persona)
    cached = _get_cached(cache_key)
    if cached:
        return cached, {
            "tokens_in": 0, "tokens_out": 0,
            "model_name": model, "provider": provider,
            "cached": True, "routing_reason": routing_reason,
            "estimated_cost_usd": 0.0,
        }

    try:
        caller = _PROVIDER_CALLERS[provider]
        narrative, meta = caller(kpi_case, persona, model)
        meta["routing_reason"] = routing_reason
        _set_cached(cache_key, narrative)
        return narrative, meta

    except Exception as exc:
        # Graceful fallback — pipeline must never break due to LLM errors
        return narrate_template(kpi_case, persona), {
            "tokens_in": 0, "tokens_out": 0,
            "model_name": "template", "provider": provider,
            "fallback": True, "fallback_reason": str(exc),
            "routing_reason": routing_reason,
            "estimated_cost_usd": 0.0,
        }


def narrate(kpi_case: dict, persona: str, use_llm: bool = False) -> Tuple[str, dict]:
    """
    Main entry point called by pipeline.py.

    use_llm=True  → attempts the active LLM provider, falls back to template
    use_llm=False → uses template directly (zero cost, zero latency)
    """
    if use_llm:
        return narrate_with_llm(kpi_case, persona)
    return narrate_template(kpi_case, persona), {
        "tokens_in": 0, "tokens_out": 0,
        "model_name": "template", "provider": "none",
        "cached": False, "estimated_cost_usd": 0.0,
    }
