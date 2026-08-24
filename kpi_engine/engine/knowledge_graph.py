"""
KPI Knowledge Graph

In-memory graph of KPI → driver relationships, built from kpi_contracts.yaml.
Provides traversal methods for upstream/downstream analysis and lineage tracing.

This is a deterministic, rule-based module — not an LLM step.
"""
import os
import yaml
from typing import Dict, List, Set, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


class KPINode:
    """Represents a KPI or driver node in the graph."""
    __slots__ = ("name", "formula", "owner", "source", "refresh", "lineage",
                 "threshold_pct", "business_weight", "node_type")

    def __init__(self, name: str, contract: dict, node_type: str = "kpi"):
        self.name = name
        self.formula = contract.get("formula", "")
        self.owner = contract.get("owner", "")
        self.source = contract.get("source", "")
        self.refresh = contract.get("refresh", "")
        self.lineage = contract.get("lineage", "")
        self.threshold_pct = contract.get("threshold_pct", 5.0)
        self.business_weight = contract.get("business_weight", 0.5)
        self.node_type = node_type

    def to_dict(self):
        return {
            "id": self.name,
            "type": self.node_type,
            "formula": self.formula,
            "owner": self.owner,
            "source": self.source,
            "refresh": self.refresh,
            "lineage": self.lineage,
            "business_weight": self.business_weight,
        }


class KPIKnowledgeGraph:
    """
    In-memory directed graph: KPI --driven_by--> Driver.
    Built from the semantic contracts so that root_cause analysis and
    lineage queries traverse a single, governed structure.
    """

    def __init__(self):
        self.nodes: Dict[str, KPINode] = {}
        self.edges: List[dict] = []          # {source, target, relation}
        self._children: Dict[str, Set[str]] = {}   # parent -> set of children (drivers)
        self._parents: Dict[str, Set[str]] = {}     # child -> set of parents (KPIs it drives)
        self._load()

    def _load(self):
        path = os.path.join(DATA_DIR, "kpi_contracts.yaml")
        with open(path) as f:
            contracts = yaml.safe_load(f)

        # First pass: create all nodes
        for kpi_name, spec in contracts.items():
            self.nodes[kpi_name] = KPINode(kpi_name, spec, node_type="kpi")
            self._children[kpi_name] = set()
            if kpi_name not in self._parents:
                self._parents[kpi_name] = set()

        # Second pass: build edges
        for kpi_name, spec in contracts.items():
            for driver_name in spec.get("drivers", []):
                # Ensure driver node exists (it might be a KPI itself or a leaf driver)
                if driver_name not in self.nodes:
                    self.nodes[driver_name] = KPINode(driver_name, {}, node_type="driver")
                    self._children[driver_name] = set()
                    self._parents[driver_name] = set()

                self._children[kpi_name].add(driver_name)
                self._parents[driver_name].add(kpi_name)
                self.edges.append({
                    "source": kpi_name,
                    "target": driver_name,
                    "relation": "driven_by",
                })

    def upstream_drivers(self, kpi_name: str) -> List[str]:
        """All direct drivers of a KPI."""
        return list(self._children.get(kpi_name, set()))

    def downstream_kpis(self, driver_name: str) -> List[str]:
        """All KPIs that this driver affects."""
        return list(self._parents.get(driver_name, set()))

    def impact_path(self, driver_name: str, kpi_name: str) -> Optional[List[str]]:
        """
        BFS to find a path from driver to KPI through the graph.
        Returns the path as a list of node names, or None if no path exists.
        """
        if driver_name == kpi_name:
            return [driver_name]

        visited = set()
        queue = [[driver_name]]
        while queue:
            path = queue.pop(0)
            node = path[-1]
            if node in visited:
                continue
            visited.add(node)
            for parent in self._parents.get(node, set()):
                new_path = path + [parent]
                if parent == kpi_name:
                    return new_path
                queue.append(new_path)
        return None

    def all_ancestors(self, kpi_name: str) -> Set[str]:
        """All transitive drivers (recursive children in the DAG)."""
        result = set()
        queue = list(self._children.get(kpi_name, set()))
        while queue:
            node = queue.pop(0)
            if node not in result:
                result.add(node)
                queue.extend(self._children.get(node, set()))
        return result

    def to_dict(self) -> dict:
        """Serialize the graph for the frontend visualization endpoint."""
        nodes = [n.to_dict() for n in self.nodes.values()]
        return {"nodes": nodes, "edges": self.edges}

    def get_node(self, name: str) -> Optional[KPINode]:
        return self.nodes.get(name)

    def get_business_weight(self, kpi_name: str) -> float:
        node = self.nodes.get(kpi_name)
        return node.business_weight if node else 0.5

    def get_owner(self, kpi_name: str) -> str:
        node = self.nodes.get(kpi_name)
        return node.owner if node else ""

    def get_lineage(self, kpi_name: str) -> dict:
        """Full lineage trace for a KPI: sources, transformations, drivers."""
        node = self.nodes.get(kpi_name)
        if not node:
            return {"error": f"KPI '{kpi_name}' not found"}
        drivers = self.upstream_drivers(kpi_name)
        return {
            "kpi": kpi_name,
            "formula": node.formula,
            "source": node.source,
            "refresh": node.refresh,
            "lineage_description": node.lineage,
            "direct_drivers": drivers,
            "all_transitive_drivers": list(self.all_ancestors(kpi_name)),
            "owner": node.owner,
        }


# Module-level singleton
_graph: Optional[KPIKnowledgeGraph] = None


def get_graph() -> KPIKnowledgeGraph:
    global _graph
    if _graph is None:
        _graph = KPIKnowledgeGraph()
    return _graph
