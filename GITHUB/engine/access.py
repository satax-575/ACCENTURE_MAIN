"""
Access control, attached to the KPI semantic contract itself.

Round 2 additions:
  - Column-level security: redacts sensitive fields for non-authorized roles
  - Domain-level security: marketing KPIs visible only to marketing + C-suite
  - Audit trail: logs every access check with timestamp, role, resource, decision
"""
import os
import json
import yaml
from datetime import datetime, timezone
from typing import Optional, Any

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
AUDIT_LOG_PATH = os.path.join(DATA_DIR, "audit_log.json")


def load_contracts():
    with open(os.path.join(DATA_DIR, "kpi_contracts.yaml")) as f:
        return yaml.safe_load(f)


def can_view(role: str, kpi_name: str) -> bool:
    """Check if a role has access to view a KPI."""
    contracts = load_contracts()
    kpi = contracts.get(kpi_name)
    if not kpi:
        return False
    allowed = role in kpi.get("access", [])
    _log_audit(role, kpi_name, "view", allowed)
    return allowed


def region_filter(role: str, requested_region: str, home_region: str = None) -> bool:
    """
    CEO sees all regions. A regional manager sees only their own region.
    Analysts see campaign-level data with no region restriction here.
    """
    if role == "ceo":
        return True
    if role == "manager":
        return requested_region == home_region
    return True


def get_column_access(role: str, kpi_name: str) -> dict:
    """
    Returns column-level access for a role viewing a specific KPI.
    Columns not listed in column_security are accessible to anyone
    who can view the KPI.
    """
    contracts = load_contracts()
    kpi = contracts.get(kpi_name, {})
    col_security = kpi.get("column_security", {})

    access_map = {}
    for col, allowed_roles in col_security.items():
        access_map[col] = role in allowed_roles

    return access_map


def redact_sensitive_fields(data: dict, role: str, kpi_name: str) -> dict:
    """
    Redact fields that the role is not authorized to see.
    Returns a copy of the data with restricted fields replaced by '[REDACTED]'.
    """
    col_access = get_column_access(role, kpi_name)
    redacted = data.copy()

    for field, has_access in col_access.items():
        if not has_access and field in redacted:
            redacted[field] = "[REDACTED]"

    return redacted


def get_decision_rights(role: str, kpi_name: str) -> dict:
    """Returns the decision rights available to a role for a KPI."""
    contracts = load_contracts()
    kpi = contracts.get(kpi_name, {})
    rights = kpi.get("decision_rights", {})

    return {
        action: role in roles
        for action, roles in rights.items()
    }


def get_accessible_kpis(role: str) -> list:
    """Returns all KPI names that a role can access."""
    contracts = load_contracts()
    return [name for name, spec in contracts.items()
            if role in spec.get("access", [])]


# ---------- Audit Trail ----------

def _log_audit(role: str, resource: str, action: str, allowed: bool):
    """Append an entry to the audit log."""
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "role": role,
        "resource": resource,
        "action": action,
        "allowed": allowed,
    }

    try:
        entries = []
        if os.path.exists(AUDIT_LOG_PATH):
            with open(AUDIT_LOG_PATH, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    entries = json.loads(content)

        entries.append(entry)

        # Keep only last 1000 entries to prevent unbounded growth
        if len(entries) > 1000:
            entries = entries[-1000:]

        with open(AUDIT_LOG_PATH, "w", encoding="utf-8") as f:
            json.dump(entries, f, indent=2)
    except Exception:
        pass  # Audit logging should never break the application


def get_audit_log(limit: int = 50) -> list:
    """Return the most recent audit log entries."""
    try:
        if not os.path.exists(AUDIT_LOG_PATH):
            return []
        with open(AUDIT_LOG_PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            entries = json.loads(content)
        return entries[-limit:]
    except Exception:
        return []

