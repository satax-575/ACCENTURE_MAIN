"""
Automated Test Suite for KPI Intelligence-to-Action Engine (Round 2)

Covers all 8 Round 2 core objectives & minimum prototype expectations:
1. Semantic Contracts & Knowledge Graph
2. Ingest, Fusion, Grain Reconciliation & Data Quality
3. Anomaly Detection (Statistical z-score + Materiality + Forecast check)
4. Root Cause Analysis, Causal Precedence, Correlation, & Waterfall Decomposition
5. Confidence Scoring, Contradiction Detection, & Abstention
6. Sparse-History / New Launch Analysis
7. Persona Narratives (CEO, Manager, Analyst) & Structured Recommendations
8. Security & Entitlements (KPI, Column Redaction, Regional, Decision Rights, Audit)
9. Human Feedback Loop, Accuracy Calibration & Weight Suggestions
10. Runtime Telemetry, Token Accounting & Cost Breakdown
11. FastAPI Endpoints End-to-End Integration
"""
import unittest
import pandas as pd
import json
import os
from fastapi.testclient import TestClient

from app import app
from engine import (
    ingest, detect, root_cause, confidence, narrate,
    recommend, access, feedback, sparse_history,
    telemetry, knowledge_graph, alerts, forecasting, pipeline
)


class TestKPIEngineCore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tx, cls.mk, cls.sp = ingest.load_sources()
        cls.daily = ingest.daily_kpis(cls.tx, cls.sp)
        cls.as_of = cls.tx["date"].max()
        cls.client = TestClient(app)

    # 1. Semantic Contracts & Knowledge Graph
    def test_semantic_contracts_and_knowledge_graph(self):
        contracts = access.load_contracts()
        self.assertIn("Revenue", contracts)
        self.assertIn("Purchase Frequency", contracts)
        self.assertIn("Checkout Error Rate", contracts)
        self.assertIn("Marketing Spend", contracts)

        graph = knowledge_graph.get_graph()
        g_dict = graph.to_dict()
        self.assertGreaterEqual(len(g_dict["nodes"]), 6)
        self.assertGreaterEqual(len(g_dict["edges"]), 6)

        # Lineage check
        lineage = graph.get_lineage("Revenue")
        self.assertEqual(lineage["kpi"], "Revenue")
        self.assertIn("Checkout Error Rate", lineage["direct_drivers"])
        self.assertIn("SUM(qty * price)", lineage["formula"])

        # Impact path
        path = graph.impact_path("Checkout Error Rate", "Revenue")
        self.assertEqual(path, ["Checkout Error Rate", "Revenue"])

    # 2. Ingest, Fusion & Data Quality
    def test_ingest_and_data_quality(self):
        dq = ingest.data_quality_report(self.tx, self.mk, self.sp)
        self.assertTrue(dq["passed"])
        self.assertEqual(dq["overall_completeness"], 1.0)
        self.assertEqual(len(dq["issues"]), 0)

        meta = ingest.source_metadata(self.tx, self.mk, self.sp)
        self.assertIn("transactions", meta)
        self.assertEqual(meta["transactions"]["refresh"], "daily")
        self.assertEqual(meta["marketing"]["refresh"], "weekly")

        grain = ingest.grain_reconciliation_report(self.tx, self.mk, self.sp)
        self.assertIn("Conversion Rate", grain["cross_source_kpis"])

        conv = ingest.weekly_conversion_rate(self.tx, self.mk)
        self.assertFalse(conv.empty)
        self.assertIn("conversion_rate_pct", conv.columns)

    # 3. Anomaly Detection (Statistical + Materiality)
    def test_anomaly_detection(self):
        # East Region anomaly week
        week_start = pd.Timestamp("2026-08-11")
        signal = detect.detect_shift(self.daily, "East Region", week_start, metric="revenue", threshold_pct=5.0)
        self.assertTrue(signal["flagged"])
        self.assertTrue(signal["significant"])
        self.assertTrue(signal["material"])
        self.assertLess(signal["pct_change"], -5.0)
        self.assertLess(signal["z_score"], -1.5)

        # Normal baseline week (e.g. week of 2026-07-06)
        normal_week = pd.Timestamp("2026-07-06")
        normal_signal = detect.detect_shift(self.daily, "East Region", normal_week, metric="revenue", threshold_pct=5.0)
        self.assertFalse(normal_signal["flagged"])

    # 4. Root Cause, Precedence, Waterfall & Correlation
    def test_root_cause_and_waterfall(self):
        week_start = pd.Timestamp("2026-08-11")
        drivers = root_cause.find_root_cause(self.daily, self.mk, "East Region", week_start, week_start)
        self.assertTrue(len(drivers) >= 1)
        top_driver = drivers[0]
        self.assertEqual(top_driver["driver"], "Checkout error rate")
        self.assertGreaterEqual(top_driver["contribution_pct"], 50)
        self.assertIsNotNone(top_driver["onset"])

        # Additive waterfall decomposition
        wf = root_cause.waterfall_decomposition(self.daily, "East Region", week_start)
        self.assertLess(wf["total_change"], 0)
        self.assertEqual(len(wf["components"]), 3)
        self.assertEqual(wf["components"][0]["name"], "Volume Effect")
        self.assertEqual(wf["components"][1]["name"], "Price Effect")
        self.assertEqual(wf["components"][2]["name"], "Mix Effect")

        # Sum of components approx total change
        comp_sum = sum(c["value"] for c in wf["components"])
        self.assertAlmostEqual(comp_sum, wf["total_change"], places=1)

    # 5. Confidence Scoring & Abstention
    def test_confidence_and_abstention(self):
        # Freshness for East Region (all sources fresh)
        freshness_east = ingest.source_freshness(self.tx, self.mk, self.sp, "East Region", self.as_of)
        drivers_east = [{"driver": "Checkout error rate", "contribution_pct": 80, "pct_change": 200, "confidence": "HIGH"}]
        conf_east = confidence.score(freshness_east, drivers_east)
        self.assertEqual(conf_east["level"], "HIGH")

        # North Region abstention (support tickets stale/missing)
        case_north = pipeline.run_case("North Region", "2026-08-18", metric="revenue", persona="ceo")
        self.assertEqual(case_north["confidence"]["level"], "ABSTAIN")
        self.assertIn("support_tickets", case_north["confidence"]["reason"])
        self.assertIn("Insufficient evidence", case_north["narrative"])
        self.assertEqual(case_north["actions"][0]["lever"], "Data resolution")

    # 6. Sparse History
    def test_sparse_history(self):
        result = sparse_history.analyze(self.tx, product="New Product X", region="East Region", as_of=self.as_of)
        self.assertIsNotNone(result)
        self.assertEqual(result["mode"], "sparse_history")
        self.assertEqual(result["days_live"], 10)
        self.assertEqual(result["confidence"]["level"], "MODERATE")
        self.assertTrue(result["flagged"])
        self.assertIn("cohort benchmark", result["narrative"])

    # 7. Persona Narratives & Structured Recommendations
    def test_persona_narratives_and_recommendations(self):
        case_ceo = pipeline.run_case("East Region", "2026-08-11", metric="revenue", persona="ceo")
        case_mgr = pipeline.run_case("East Region", "2026-08-11", metric="revenue", persona="manager")
        case_ana = pipeline.run_case("East Region", "2026-08-11", metric="revenue", persona="analyst")

        # Distinct persona narratives
        self.assertNotEqual(case_ceo["narrative"], case_mgr["narrative"])
        self.assertNotEqual(case_mgr["narrative"], case_ana["narrative"])
        self.assertIn("primarily driven by", case_ceo["narrative"].lower())
        self.assertIn("escalate and prioritize", case_mgr["narrative"].lower())
        self.assertIn("ranked drivers", case_ana["narrative"].lower())

        # Structured actions
        self.assertTrue(len(case_ceo["actions"]) >= 1)
        act = case_ceo["actions"][0]
        self.assertEqual(act["driver"], "Checkout error rate")
        self.assertEqual(act["owner"], "Head of Engineering")
        self.assertIn("Engineering escalation", act["lever"])
        self.assertIn("monitoring", act)

    # 8. Security, Entitlements & Column Redaction
    def test_access_and_column_security(self):
        # KPI access
        self.assertTrue(access.can_view("ceo", "Revenue"))
        self.assertTrue(access.can_view("manager", "Checkout Error Rate"))
        self.assertFalse(access.can_view("analyst", "Checkout Error Rate"))
        self.assertFalse(access.can_view("manager", "Marketing Spend"))

        # Regional filtering
        self.assertTrue(access.region_filter("ceo", "North Region"))
        self.assertFalse(access.region_filter("manager", "North Region", home_region="East Region"))
        self.assertTrue(access.region_filter("manager", "East Region", home_region="East Region"))

        # Column redaction
        sample_data = {"customer_id": "C00123", "price": 45.0, "qty": 2}
        redacted_for_ceo = access.redact_sensitive_fields(sample_data, "ceo", "Revenue")
        self.assertEqual(redacted_for_ceo["customer_id"], "[REDACTED]")
        self.assertEqual(redacted_for_ceo["price"], 45.0)

        redacted_for_analyst = access.redact_sensitive_fields(sample_data, "analyst", "Revenue")
        self.assertEqual(redacted_for_analyst["customer_id"], "C00123")

    # 9. Feedback Loop & Calibration
    def test_feedback_and_calibration(self):
        case = pipeline.run_case("East Region", "2026-08-11", metric="revenue", persona="analyst")
        entry = feedback.record_feedback(case, verdict="confirmed", analyst="test_analyst", severity_rating=5)
        self.assertEqual(entry["verdict"], "confirmed")
        self.assertEqual(entry["system_top_driver"], "Checkout error rate")

        cal = feedback.calibration_summary()
        self.assertIn("Checkout error rate", cal)
        self.assertGreaterEqual(cal["Checkout error rate"]["confirmed"], 1)

        stats = feedback.feedback_stats()
        self.assertGreaterEqual(stats["total_feedback"], 1)

    # 10. Telemetry & Cost Accounting
    def test_telemetry(self):
        case = pipeline.run_case("East Region", "2026-08-11", metric="revenue", persona="ceo")
        t = case["telemetry"]
        self.assertGreater(t["total_latency_ms"], 0)
        self.assertIn("deterministic", t["method_breakdown"])
        self.assertIn("statistical", t["method_breakdown"])
        self.assertIn("rule_based", t["method_breakdown"])
        self.assertEqual(t["llm_calls"], 0)
        self.assertEqual(t["estimated_cost_usd"], 0.0)

    # 11. Proactive Alerts & Forecasting
    def test_proactive_alerts_and_forecasting(self):
        alert_list = alerts.scan_all_kpis(role="ceo")
        self.assertGreater(len(alert_list), 0)
        top_alert = alert_list[0]
        self.assertIn("kpi", top_alert)
        self.assertIn("priority_score", top_alert)
        self.assertIn("routed_to", top_alert)

        fc = forecasting.forecast_kpi(self.daily, "East Region", metric="revenue", horizon=7)
        self.assertEqual(len(fc["forecast"]), 7)
        self.assertGreater(fc["rmse"], 0)
        self.assertIn("lower", fc["forecast"][0])
        self.assertIn("upper", fc["forecast"][0])

    # 12. REST API Integration Endpoints
    def test_api_endpoints(self):
        # /api/dashboard
        res = self.client.get("/api/dashboard?persona=ceo&role=ceo")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("kpi_summaries", data)
        self.assertIn("active_alerts", data)

        # /api/case
        res = self.client.get("/api/case/East%20Region/2026-08-11?metric=revenue&persona=ceo&role=ceo")
        self.assertEqual(res.status_code, 200)
        case_data = res.json()
        self.assertEqual(case_data["region"], "East Region")
        self.assertEqual(case_data["confidence"]["level"], "HIGH")

        # /api/case forbidden for unauthorized region
        res_forbidden = self.client.get("/api/case/North%20Region/2026-08-18?metric=revenue&persona=manager&role=manager&home_region=East%20Region")
        self.assertEqual(res_forbidden.status_code, 403)

        # /api/alerts
        res = self.client.get("/api/alerts?persona=ceo&role=ceo")
        self.assertEqual(res.status_code, 200)

        # /api/knowledge-graph
        res = self.client.get("/api/knowledge-graph")
        self.assertEqual(res.status_code, 200)
        self.assertIn("nodes", res.json())

        # /api/waterfall
        res = self.client.get("/api/waterfall/East%20Region/2026-08-11")
        self.assertEqual(res.status_code, 200)

        # /api/forecast
        res = self.client.get("/api/forecast/Revenue/East%20Region")
        self.assertEqual(res.status_code, 200)

        # /api/sparse-history
        res = self.client.get("/api/sparse-history?product=New%20Product%20X&region=East%20Region")
        self.assertEqual(res.status_code, 200)

        # /api/data-quality
        res = self.client.get("/api/data-quality")
        self.assertEqual(res.status_code, 200)

        # /api/chat
        res = self.client.post("/api/chat", json={"message": "Why did revenue drop in East Region?", "persona": "ceo", "role": "ceo"})
        self.assertEqual(res.status_code, 200)
        chat_data = res.json()
        self.assertIn("checkout error rate", chat_data["response"].lower())


if __name__ == "__main__":
    unittest.main()
