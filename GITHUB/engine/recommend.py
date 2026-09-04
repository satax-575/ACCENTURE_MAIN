"""
Stage 5b: Recommend

Maps verified drivers to structured, actionable recommendations.

Round 2 expansion:
  - Structured action records: driver → lever → action → expected_impact → owner → confidence → monitoring
  - Decision rights mapping: which persona can approve each action
  - Constraint awareness: flags conflicts with known constraints (e.g., budget freeze)
"""
import os
import yaml

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# Each entry is a structured action template
ACTION_LIBRARY = {
    "Checkout error rate": {
        "lever": "Engineering escalation",
        "action": "Escalate checkout issue to Engineering; trigger customer-success outreach to affected accounts.",
        "expected_impact": "Resolve ~55% of revenue impact within 3-5 days",
        "owner": "Head of Engineering",
        "monitoring": "Track checkout error rate daily until <3/day baseline restored",
    },
    "Purchase frequency": {
        "lever": "Sales & product review",
        "action": "Review recent product/pricing changes with the Sales team; consider a targeted win-back campaign.",
        "expected_impact": "Recover 20-30% of lost frequency within 2 weeks",
        "owner": "VP Sales",
        "monitoring": "Monitor daily order count by region for 14 days",
    },
    "Marketing spend": {
        "lever": "Budget reallocation",
        "action": "Confirm the spend cut was intentional with the Marketing lead; assess reallocation if not.",
        "expected_impact": "Clarify within 1 day; if unintentional, restore spend to recover ~15% of revenue gap",
        "owner": "Head of Marketing",
        "monitoring": "Verify weekly spend returns to baseline in next marketing.csv refresh",
    },
    "Average order value": {
        "lever": "Pricing & product mix",
        "action": "Review recent discounting or product-mix shifts with the Sales team.",
        "expected_impact": "Stabilize AOV within 1-2 weeks if caused by a reversible promotion",
        "owner": "VP Sales",
        "monitoring": "Track AOV daily by product and region",
    },
}

DEFAULT_ACTION = {
    "lever": "Manual review",
    "action": "Route to an analyst for manual review -- no verified driver clears the action threshold.",
    "expected_impact": "Dependent on analyst investigation",
    "owner": "Analytics Team",
    "monitoring": "Analyst to report findings within 48 hours",
}


def _load_contracts():
    with open(os.path.join(DATA_DIR, "kpi_contracts.yaml")) as f:
        return yaml.safe_load(f)


def _check_constraints(driver_name: str, contracts: dict) -> list:
    """Check if any known constraints conflict with the recommended action."""
    warnings = []
    # Check all KPIs for constraints that might affect the driver
    for kpi_name, spec in contracts.items():
        constraints = spec.get("constraints", {})
        if constraints.get("budget_freeze") and driver_name == "Marketing spend":
            warnings.append("Budget freeze is active — spend reallocation requires CEO override")
    return warnings


def _check_decision_rights(driver_name: str, persona: str, contracts: dict) -> dict:
    """Check if the current persona has decision rights for the recommended action."""
    for kpi_name, spec in contracts.items():
        drivers = spec.get("drivers", [])
        if driver_name in drivers:
            rights = spec.get("decision_rights", {})
            can_approve = any(persona in roles for roles in rights.values())
            return {
                "can_approve": can_approve,
                "available_rights": {k: v for k, v in rights.items() if persona in v},
                "requires_escalation": not can_approve,
            }
    return {"can_approve": False, "available_rights": {}, "requires_escalation": True}


def recommend(kpi_case: dict, persona: str = "ceo") -> list:
    """
    Generate structured action recommendations for each verified driver.
    Returns a list of action records.
    """
    contracts = _load_contracts()

    if kpi_case["confidence"]["level"] == "ABSTAIN":
        return [{
            "driver": "N/A",
            "lever": "Data resolution",
            "action": "No action recommended. Resolve the data gap, then re-run the case.",
            "expected_impact": "Cannot estimate until data gaps are resolved",
            "owner": "Data Engineering",
            "confidence": "ABSTAIN",
            "monitoring": "Check source freshness in the next refresh cycle",
            "constraints": [],
            "decision_rights": {"can_approve": False, "requires_escalation": False},
        }]

    drivers = kpi_case.get("drivers", [])
    if not drivers:
        action = DEFAULT_ACTION.copy()
        action["driver"] = "Unknown"
        action["confidence"] = "LOW"
        action["constraints"] = []
        action["decision_rights"] = {"can_approve": True, "requires_escalation": False}
        return [action]

    actions = []
    for driver in drivers:
        driver_name = driver["driver"]
        template = ACTION_LIBRARY.get(driver_name, DEFAULT_ACTION).copy()
        template["driver"] = driver_name
        template["confidence"] = driver.get("confidence", "MODERATE")

        # Check constraints
        template["constraints"] = _check_constraints(driver_name, contracts)

        # Check decision rights
        template["decision_rights"] = _check_decision_rights(driver_name, persona, contracts)

        actions.append(template)

    return actions


def recommend_simple(kpi_case: dict) -> str:
    """Backward-compatible simple recommendation string for run_demo.py."""
    if kpi_case["confidence"]["level"] == "ABSTAIN":
        return "No action recommended. Resolve the data gap, then re-run the case."
    drivers = kpi_case.get("drivers", [])
    if not drivers:
        return DEFAULT_ACTION["action"]
    top = drivers[0]["driver"]
    template = ACTION_LIBRARY.get(top, DEFAULT_ACTION)
    return template["action"]
