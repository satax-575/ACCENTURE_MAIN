"""
Run the KPI Intelligence-to-Action Engine end to end on the sample data.

    python run_demo.py

Reproduces all Round 2 scenarios:
  Scenario 1 - Multi-factor anomaly        (East Region, week of 2026-08-11)
  Scenario 2 - Abstention                  (North Region, week of 2026-08-18)
  Scenario 3 - Sparse-history KPI          (New Product X, 10 days of data)
  Scenario 4 - Persona-specific narratives (CEO vs Manager vs Analyst)
  Scenario 5 - Access control & security   (role-based, column-level, domain-level)
  Scenario 6 - Feedback loop & learning    (confirm, calibrate, weight suggestions)
  Scenario 7 - Telemetry & LLM breakdown   (per-stage method tracking, cost)
  Scenario 8 - Conversational Q&A          (keyword-based intent routing)
"""
import sys
import json

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from engine import pipeline, feedback, access, ingest, sparse_history
from engine import knowledge_graph, alerts, forecasting, root_cause

LINE = "=" * 76
SUBLINE = "-" * 76


def banner(title):
    print(f"\n{LINE}\n  {title}\n{LINE}")


def sub_banner(title):
    print(f"\n{SUBLINE}\n  {title}\n{SUBLINE}")


def show_case(title, kpi_case):
    sub_banner(title)
    print(f"  Region:     {kpi_case['region']}")
    if "pct_change" in kpi_case.get("signal", {}):
        s = kpi_case["signal"]
        print(f"  Signal:     {s['metric']} {s['pct_change']:+.1f}% "
              f"(z={s.get('z_score')}), week of {s.get('week_start')}")
        if s.get("forecast_check"):
            fc = s["forecast_check"]
            print(f"  Forecast:   expected={fc['forecast_mean']:.0f}, "
                  f"actual={fc['actual_mean']:.0f}, "
                  f"outside PI={fc['outside_prediction_interval']}")
    if kpi_case.get("drivers"):
        print("  Ranked drivers (alternative hypotheses):")
        for d in kpi_case["drivers"]:
            corr = f", r={d['correlation']}" if d.get('correlation') is not None else ""
            print(f"    #{d.get('hypothesis_rank', '?')} {d['driver']:<24} "
                  f"{d['pct_change']:+6.1f}%  onset {d['onset']}  "
                  f"-> {d['contribution_pct']}% contribution  "
                  f"[{d.get('confidence', 'N/A')}]{corr}")
    conf = kpi_case["confidence"]
    print(f"  Confidence: {conf['level']}  ({conf['reason']})")
    if conf.get("contradictions"):
        print(f"  [!] Contradictions: {'; '.join(conf['contradictions'])}")
    print(f"  Narrative:  {kpi_case['narrative']}")

    # Structured actions
    if kpi_case.get("actions"):
        print("  Actions:")
        for a in kpi_case["actions"]:
            print(f"    Driver: {a.get('driver', 'N/A')}")
            print(f"    Lever:  {a.get('lever', 'N/A')}")
            print(f"    Action: {a.get('action', 'N/A')}")
            print(f"    Impact: {a.get('expected_impact', 'N/A')}")
            print(f"    Owner:  {a.get('owner', 'N/A')}")
            print(f"    Monitoring: {a.get('monitoring', 'N/A')}")
            if a.get("constraints"):
                print(f"    [!] Constraints: {'; '.join(a['constraints'])}")
            print()
    else:
        print(f"  Action:     {kpi_case.get('action', 'N/A')}")


def show_telemetry(kpi_case):
    t = kpi_case.get("telemetry", {})
    print(f"\n  Telemetry Summary:")
    print(f"    Total latency:    {t.get('total_latency_ms', 0):.1f} ms")
    print(f"    LLM calls:        {t.get('llm_calls', 0)}")
    print(f"    Total tokens:     {t.get('total_tokens', 0)}")
    print(f"    Estimated cost:   ${t.get('estimated_cost_usd', 0):.6f}")
    print(f"    Method breakdown:")
    for method, stats in t.get("method_breakdown", {}).items():
        print(f"      {method:<16} {stats['count']} stage(s), {stats['latency_ms']:.1f} ms")
    if t.get("stages"):
        print(f"    Per-stage detail:")
        for s in t["stages"]:
            model = f" ({s['model_name']})" if s.get("model_name") else ""
            tokens = f" [{s['tokens_in']}->{s['tokens_out']} tokens]" if s.get("tokens_in") or s.get("tokens_out") else ""
            print(f"      {s['stage']:<16} {s['method']:<14} {s['latency_ms']:>7.1f} ms{model}{tokens}")


def main():
    # ================================================================
    banner("STAGE 0 -- DATA QUALITY CHECK (Time + Grain + Quality)")
    # ================================================================
    tx, mk, sp = ingest.load_sources()
    dq = ingest.data_quality_report(tx, mk, sp)
    print(f"  Quality passed:       {dq['passed']}")
    print(f"  Overall completeness: {dq['overall_completeness']:.1%}")
    if dq["issues"]:
        print(f"  Issues: {dq['issues']}")
    for src, info in dq["per_source"].items():
        print(f"  {src:<20} {info['row_count']} rows, "
              f"completeness={info['completeness']:.1%}, "
              f"issues={len(info['issues'])}")

    # Source metadata
    meta = ingest.source_metadata(tx, mk, sp)
    print(f"\n  Source refresh cadences:")
    for src, m in meta.items():
        print(f"    {src:<20} {m['refresh']:<10} grain={m['grain']}")

    # Grain reconciliation
    grain = ingest.grain_reconciliation_report(tx, mk, sp)
    print(f"\n  Grain hierarchy: {grain['grain_hierarchy']}")

    # Cross-source KPI: Conversion Rate
    conv = ingest.weekly_conversion_rate(tx, mk)
    east_conv = conv[(conv.region == "East Region") & (conv.week_start == "2026-08-10")]
    if not east_conv.empty:
        print(f"\n  Conversion Rate (East Region, week of 2026-08-10): "
              f"{east_conv['conversion_rate_pct'].iloc[0]}%  "
              f"(cross-source KPI: transactions + marketing)")

    # ================================================================
    banner("SCENARIO 1 -- Multi-factor anomaly (East Region, 2026-08-11)")
    # ================================================================
    case1 = pipeline.run_case("East Region", "2026-08-11", metric="revenue", persona="ceo")
    show_case("CEO View", case1)

    # Waterfall decomposition
    sub_banner("Waterfall Decomposition (Revenue -> Volume + Price + Mix)")
    wf = case1.get("waterfall", {})
    print(f"  Total change:     ${wf.get('total_change', 0):+.2f}/day")
    print(f"  Baseline revenue: ${wf.get('baseline_revenue', 0):.2f}/day")
    print(f"  Target revenue:   ${wf.get('target_revenue', 0):.2f}/day")
    for comp in wf.get("components", []):
        print(f"    {comp['name']:<16} ${comp['value']:+.2f}  -- {comp.get('description', '')}")

    # ================================================================
    banner("SCENARIO 2 -- Abstention (North Region, 2026-08-18)")
    # ================================================================
    case2 = pipeline.run_case("North Region", "2026-08-18", metric="revenue", persona="ceo")
    show_case("Abstention Case", case2)

    # Show freshness details for the abstention
    print(f"\n  Source freshness (North Region):")
    for src, f in case2.get("freshness", {}).items():
        status = "[V] Fresh" if (f.get("present") and not f.get("stale")) else \
                 "[X] Stale" if f.get("present") else "[X] Missing"
        last = f.get("last_seen", "N/A")
        print(f"    {src:<20} {status:<12} last_seen={last}  cadence={f.get('cadence', 'N/A')}")

    # ================================================================
    banner("SCENARIO 3 -- Sparse-history KPI (New Product X)")
    # ================================================================
    as_of = tx["date"].max()
    case3 = sparse_history.analyze(tx, product="New Product X", region="East Region", as_of=as_of)
    if case3:
        print(f"  Mode:         {case3['mode']}")
        print(f"  Product:      {case3['product']} in {case3['region']}")
        print(f"  Launch date:  {case3['launch_date']}  |  Days live: {case3['days_live']}")
        print(f"  Actual:       {case3['actual_orders_per_day']}/day")
        print(f"  Benchmark:    {case3['cohort_benchmark_orders_per_day']}/day")
        print(f"  Gap:          {case3['pct_vs_benchmark']:+.1f}%")
        print(f"  Confidence:   {case3['confidence']['level']}  ({case3['confidence']['reason']})")
        print(f"  Narrative:    {case3['narrative']}")
        print(f"  Action:       {case3['action']}")

    # ================================================================
    banner("SCENARIO 4 -- Same evidence, three persona narratives")
    # ================================================================
    for persona in ["ceo", "manager", "analyst"]:
        case = pipeline.run_case("East Region", "2026-08-11", metric="revenue", persona=persona)
        print(f"\n  [{persona.upper()}]")
        print(f"  {case['narrative']}")
        if case.get("actions"):
            print(f"  Top action: {case['actions'][0].get('action', 'N/A')}")
            print(f"  Can approve: {case['actions'][0].get('decision_rights', {}).get('can_approve', 'N/A')}")

    # ================================================================
    banner("SCENARIO 5 -- Access Control & Security")
    # ================================================================

    # KPI-level access
    sub_banner("KPI-level access control")
    for role in ["ceo", "manager", "analyst"]:
        accessible = access.get_accessible_kpis(role)
        print(f"  role={role:<8} accessible KPIs: {accessible}")

    # Column-level security
    sub_banner("Column-level security")
    for role in ["ceo", "manager", "analyst"]:
        col_access = access.get_column_access(role, "Revenue")
        print(f"  role={role:<8} Revenue columns: {col_access}")
    for role in ["ceo", "analyst"]:
        col_access = access.get_column_access(role, "Marketing Spend")
        print(f"  role={role:<8} Marketing Spend columns: {col_access}")

    # Domain-level security
    sub_banner("Domain-level security")
    print(f"  Manager can view Marketing Spend: {access.can_view('manager', 'Marketing Spend')}")
    print(f"  Analyst can view Checkout Error Rate: {access.can_view('analyst', 'Checkout Error Rate')}")

    # Region-level security
    sub_banner("Region-level security")
    print(f"  CEO viewing North Region:            {access.region_filter('ceo', 'North Region')}")
    print(f"  Manager (East) viewing North Region: "
          f"{access.region_filter('manager', 'North Region', home_region='East Region')}")
    print(f"  Manager (East) viewing East Region:  "
          f"{access.region_filter('manager', 'East Region', home_region='East Region')}")

    # Decision rights
    sub_banner("Decision rights")
    for role in ["ceo", "manager", "analyst"]:
        rights = access.get_decision_rights(role, "Revenue")
        print(f"  role={role:<8} Revenue rights: {rights}")

    # ================================================================
    banner("SCENARIO 6 -- Feedback Loop & Learning")
    # ================================================================

    # Record feedback
    entry = feedback.record_feedback(case1, verdict="confirmed", analyst="s.malakar",
                                      severity_rating=4, action_effectiveness="effective")
    print(f"  Logged feedback: {json.dumps(entry, indent=4, default=str)}")

    # Calibration
    cal = feedback.calibration_summary()
    print(f"\n  Calibration summary:")
    for driver, stats in cal.items():
        print(f"    {driver:<24} accuracy={stats['accuracy']}  "
              f"({stats['confirmed']}/{stats['total']} confirmed)")

    # Weight adjustment suggestions
    suggestions = feedback.weight_adjustment_suggestions()
    print(f"\n  Weight adjustment suggestions: {json.dumps(suggestions, indent=4)}")

    # ================================================================
    banner("SCENARIO 7 -- Telemetry & LLM vs Non-LLM Breakdown")
    # ================================================================
    show_telemetry(case1)

    print(f"\n  Note: All stages except 'narrate' are deterministic/statistical.")
    print(f"  The LLM is NEVER the source of quantitative truth.")
    print(f"  Method types used:")
    print(f"    [*] deterministic  -- ingest (data loading, aggregation)")
    print(f"    [*] statistical    -- detect (z-score), root_cause (precedence, correlation)")
    print(f"    [*] rule_based     -- confidence (threshold checks), recommend (action library)")
    print(f"    [*] template       -- narrate (zero-cost persona templates)")
    print(f"    [*] llm            -- narrate (Gemini, when GEMINI_API_KEY is set)")

    # ================================================================
    banner("SCENARIO 8 -- Knowledge Graph & KPI Relationships")
    # ================================================================
    graph = knowledge_graph.get_graph()
    g = graph.to_dict()
    print(f"  Nodes: {len(g['nodes'])}")
    for n in g["nodes"]:
        print(f"    [{n['type']:<7}] {n['id']:<24} owner={n.get('owner', 'N/A')}")
    print(f"\n  Edges: {len(g['edges'])}")
    for e in g["edges"]:
        print(f"    {e['source']} --{e['relation']}--> {e['target']}")

    # Lineage trace
    lineage = graph.get_lineage("Revenue")
    print(f"\n  Revenue lineage:")
    print(f"    Formula: {lineage['formula']}")
    print(f"    Source:  {lineage['source']}")
    print(f"    Lineage: {lineage['lineage_description']}")
    print(f"    Direct drivers: {lineage['direct_drivers']}")
    print(f"    All transitive: {lineage['all_transitive_drivers']}")

    # Impact path
    path = graph.impact_path("Checkout Error Rate", "Revenue")
    print(f"\n  Impact path (Checkout Error Rate -> Revenue): {' -> '.join(path) if path else 'None'}")

    # ================================================================
    banner("SCENARIO 9 -- Proactive Alerts")
    # ================================================================
    alert_list = alerts.scan_all_kpis(role="ceo")
    print(f"  Active alerts: {len(alert_list)}")
    for a in alert_list[:5]:
        print(f"    [{a['severity'].upper():<6}] {a['kpi']:<24} {a['region']:<16} "
              f"{a['pct_change']:+.1f}%  priority={a['priority_score']}  "
              f"routed_to={a['routed_to']}")

    # ================================================================
    banner("SCENARIO 10 -- Forecasting")
    # ================================================================
    daily = ingest.daily_kpis(tx, sp)
    fc = forecasting.forecast_kpi(daily, "East Region", metric="revenue", horizon=7)
    print(f"  Method: {fc.get('method', 'N/A')}")
    print(f"  RMSE:   ${fc.get('rmse', 0):.2f}")
    print(f"  Historical points: {len(fc.get('historical', []))}")
    print(f"  Forecast points:   {len(fc.get('forecast', []))}")
    if fc.get("forecast"):
        for fp in fc["forecast"][:3]:
            print(f"    {fp['date']}: ${fp['value']:.0f}  "
                  f"(95% PI: ${fp['lower']:.0f} - ${fp['upper']:.0f})")

    # ================================================================
    banner("DEMO COMPLETE")
    # ================================================================
    print(f"\n  To start the API server:")
    print(f"    cd kpi_engine && uvicorn app:app --reload --host 0.0.0.0 --port 8000")
    print(f"\n  To start the React frontend:")
    print(f"    cd kpi_engine/frontend && npm install && npm run dev")
    print(f"\n  Then open http://localhost:5173 in your browser.")
    print()


if __name__ == "__main__":
    main()
