import { useState, useEffect, useMemo } from 'react';
import { usePersona } from '../context/PersonaContext';
import { getDashboard, getWaterfall, getForecast, getCalibration } from '../api/client';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ArrowRight, ShieldCheck, DollarSign, Activity, Cpu,
  Zap, Clock, Users, Database, Layers, Sparkles, ChevronRight,
  BarChart3,
} from 'lucide-react';
import KpiCard from './KpiCard';
import AlertsBanner from './AlertsBanner';
import TelemetryPanel from './TelemetryPanel';
import WaterfallChart from './WaterfallChart';
import AccentureLogo from './AccentureLogo';
import DataStatusBadge from './DataStatusBadge';

// Fetch sparkline trend data from the new /api/dashboard/trends endpoint
async function fetchTrends(role) {
  try {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const res = await fetch(`${base}/dashboard/trends?role=${role}&days=30`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Derive aggregate metrics from kpi_summaries (real, not hardcoded)
function deriveAggregates(kpiSummaries) {
  if (!kpiSummaries || kpiSummaries.length === 0) return null;

  const revenues = kpiSummaries.filter(k => k.kpi === 'Revenue');
  const totalRevenue = revenues.reduce((sum, k) => sum + (k.current_value || 0), 0);
  const alertedRevenues = revenues.filter(k => k.status === 'alert');
  const revenueAtRisk = alertedRevenues.reduce((sum, k) => {
    return sum + Math.abs((k.pct_change / 100) * (k.current_value || 0));
  }, 0);

  const alerts = kpiSummaries.filter(k => k.status === 'alert');
  const topPctChange = alerts.length > 0
    ? Math.max(...alerts.map(k => Math.abs(k.pct_change)))
    : 0;

  const revShifts = revenues.filter(k => k.pct_change !== 0);
  const avgRevChange = revShifts.length > 0
    ? revShifts.reduce((sum, k) => sum + k.pct_change, 0) / revShifts.length
    : 0;

  return {
    totalRevenue: totalRevenue > 0 ? totalRevenue : null,
    revenueAtRisk,
    alertCount: alerts.length,
    topPctChange,
    avgRevChange,
  };
}

function StatCard({ label, value, subtext, icon: Icon, iconColor, valueColor }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase mb-2">
        <span>{label}</span>
        {Icon && <Icon size={16} className={iconColor || 'text-slate-400'} />}
      </div>
      <div className={`text-2xl font-bold ${valueColor || 'text-slate-900'}`}>{value}</div>
      {subtext && (
        <div className="text-xs text-slate-500 mt-1 font-medium">{subtext}</div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 bg-slate-200 rounded-3xl" />
      <div className="grid grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-slate-200 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { persona, role } = usePersona();
  const [data, setData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [waterfallData, setWaterfallData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [calibrationData, setCalibrationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvedActions, setApprovedActions] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      getDashboard(persona, role),
      fetchTrends(role),
    ])
      .then(([dashRes, trendsRes]) => {
        setData(dashRes);
        setTrendsData(trendsRes?.trends || null);

        // Secondary loads — non-blocking
        getWaterfall('East Region', '2026-08-11', 'revenue')
          .then(setWaterfallData).catch(() => {});
        getForecast('Revenue', 'East Region')
          .then(setForecastData).catch(() => {});
        getCalibration()
          .then(setCalibrationData).catch(() => {});
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [persona, role]);

  const aggregates = useMemo(() => deriveAggregates(data?.kpi_summaries), [data]);

  const handleApproveAction = (actionId) => {
    setApprovedActions(prev => new Set([...prev, actionId]));
  };

  // Helper: get trend series for a KPI card
  const getTrendFor = (kpi, region) => {
    if (!trendsData || !trendsData[kpi] || !trendsData[kpi][region]) return null;
    return trendsData[kpi][region];
  };

  // Top flagged case for CEO action panel
  const topAlertCase = data?.active_alerts?.find(a =>
    a.kpi === 'Revenue' || a.kpi === 'Checkout Error Rate'
  ) || data?.active_alerts?.[0] || null;

  const topAlertRegion = topAlertCase?.region || 'East Region';
  const topAlertWeek = topAlertCase?.week_start || '2026-08-11';

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 space-y-2">
        <h3 className="font-bold flex items-center gap-2">
          <AlertTriangle size={18} /> Failed to load dashboard
        </h3>
        <p className="text-sm">{error}</p>
        <p className="text-xs text-rose-500">Make sure the backend is running at localhost:8000</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-slate-950 via-[#19042b] to-slate-950 border border-[#a100ff]/30">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <AccentureLogo className="h-4 opacity-90" variant="light" />
            <span className="text-slate-500">•</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#a100ff]/20 text-[#d896ff] border border-[#a100ff]/30">
              {persona === 'ceo' ? '👑 Executive Strategy Suite'
               : persona === 'manager' ? '⚙️ Operations Command'
               : '🔬 Quantitative Deep-Dive'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {persona === 'ceo' && 'Executive Strategy & P&L Intelligence'}
            {persona === 'manager' && 'Regional Operations & Tactical Velocity'}
            {persona === 'analyst' && 'Statistical Diagnostics & Data Governance'}
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            {persona === 'ceo' && 'High-level business movements, revenue risk exposure, and one-click strategic intervention approvals.'}
            {persona === 'manager' && 'Territory tracking, customer friction spikes, incident escalations, and tactical team assignments.'}
            {persona === 'analyst' && 'Full statistical distributions, z-score matrices, correlation coefficients, SQL lineage, and accuracy calibration.'}
          </p>
        </div>

        <div className="flex flex-col gap-3 items-end">
          {/* Live Data Status Badge */}
          <DataStatusBadge />

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/10">
            <div>
              <div className="text-[11px] text-slate-300 font-medium uppercase">Active Alerts</div>
              <div className={`text-xl font-bold ${data?.active_alerts?.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {data?.active_alerts?.length || 0}
              </div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <div className="text-[11px] text-slate-300 font-medium uppercase">Monitored KPIs</div>
              <div className="text-xl font-bold text-white">{data?.kpi_summaries?.length || 0}</div>
            </div>
            {aggregates?.totalRevenue && (
              <>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <div className="text-[11px] text-slate-300 font-medium uppercase">Total Revenue</div>
                  <div className="text-xl font-bold text-white">
                    ${aggregates.totalRevenue.toFixed(0)}/wk
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>


      {/* Priority Alert Banner */}
      {data.active_alerts?.length > 0 && (
        <AlertsBanner alert={data.active_alerts[0]} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CEO VIEW                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {persona === 'ceo' && (
        <div className="space-y-8">

          {/* Macro Metric Scorecards — computed from real API data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <StatCard
              label="Total Run-Rate Revenue"
              value={aggregates?.totalRevenue
                ? `$${Math.round(aggregates.totalRevenue).toLocaleString()}`
                : '—'}
              subtext="Across all monitored regions"
              icon={DollarSign}
              iconColor="text-indigo-600"
            />
            <StatCard
              label="Revenue at Risk"
              value={aggregates?.revenueAtRisk
                ? `$${Math.round(aggregates.revenueAtRisk).toLocaleString()}`
                : '$0'}
              subtext={aggregates?.alertCount > 0
                ? `${aggregates.alertCount} active anomaly${aggregates.alertCount > 1 ? 's' : ''}`
                : 'All KPIs within normal range'}
              icon={AlertTriangle}
              iconColor={aggregates?.revenueAtRisk > 0 ? 'text-amber-500' : 'text-slate-400'}
              valueColor={aggregates?.revenueAtRisk > 0 ? 'text-rose-600' : 'text-slate-700'}
            />
            <StatCard
              label="Avg Revenue Shift"
              value={aggregates?.avgRevChange !== undefined
                ? `${aggregates.avgRevChange > 0 ? '+' : ''}${aggregates.avgRevChange.toFixed(1)}%`
                : '—'}
              subtext="Week-over-week across regions"
              icon={aggregates?.avgRevChange < 0 ? TrendingDown : TrendingUp}
              iconColor={aggregates?.avgRevChange < 0 ? 'text-rose-500' : 'text-emerald-500'}
              valueColor={aggregates?.avgRevChange < 0 ? 'text-rose-600' : 'text-emerald-600'}
            />
            <StatCard
              label="AI Compute Cost"
              value={`$${data?.telemetry_summary?.total_cost_usd?.toFixed(4) || '0.0000'}`}
              subtext="Deterministic pipeline — minimal LLM usage"
              icon={Cpu}
              iconColor="text-purple-600"
              valueColor="text-emerald-700"
            />
          </div>

          {/* Strategic Decision & Approval Center — uses real top alert */}
          {topAlertCase && (
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={20} className="text-amber-400" />
                  <h2 className="text-lg font-bold">Executive Decision Rights & Intervention Center</h2>
                </div>
                <span className="text-xs bg-indigo-500/30 px-3 py-1 rounded-full text-indigo-300 border border-indigo-500/40">
                  {approvedActions.size === 0 ? '1 Pending Approval' : 'Action Authorized'}
                </span>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-500/20 text-rose-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                      {topAlertCase.severity?.toUpperCase() || 'P1'} Incident
                    </span>
                    <span className="text-xs text-slate-300">{topAlertCase.kpi} — {topAlertCase.region}</span>
                  </div>
                  <div className="text-base font-semibold text-white">
                    {topAlertCase.kpi === 'Checkout Error Rate'
                      ? 'Escalate checkout issue to Engineering & authorize 24hr customer-success outreach'
                      : `Investigate ${topAlertCase.kpi} anomaly in ${topAlertCase.region} and authorize corrective action`
                    }
                  </div>
                  <div className="text-xs text-slate-400">
                    Shift: {topAlertCase.pct_change > 0 ? '+' : ''}{topAlertCase.pct_change?.toFixed(1)}% •
                    Week of {topAlertCase.week_start} •
                    Owner: {topAlertCase.routed_to || 'VP Sales'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to={`/case/${encodeURIComponent(topAlertRegion)}/${topAlertWeek}`}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    Inspect Evidence
                  </Link>
                  <button
                    onClick={() => handleApproveAction('ceo-action-1')}
                    disabled={approvedActions.has('ceo-action-1')}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                      approvedActions.has('ceo-action-1')
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {approvedActions.has('ceo-action-1')
                      ? <><CheckCircle2 size={14} /> Action Authorized & Dispatched</>
                      : 'Authorize Strategic Intervention'
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards Grid */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Executive KPI Health Monitor</h2>
              <span className="text-xs text-slate-500 font-medium">Filtered for {role.toUpperCase()} visibility</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.kpi_summaries?.map((kpi, i) => (
                <KpiCard
                  key={`${kpi.kpi}-${kpi.region}`}
                  data={kpi}
                  trendData={getTrendFor(kpi.kpi, kpi.region)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MANAGER VIEW                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {persona === 'manager' && (
        <div className="space-y-8">

          {/* Operational Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard
              label="Active Escalations"
              value={`${data?.active_alerts?.length || 0} Active`}
              subtext={data?.active_alerts?.[0]
                ? `Routed to: ${data.active_alerts[0].routed_to}`
                : 'No escalations pending'}
              icon={Users}
              iconColor="text-emerald-600"
              valueColor={data?.active_alerts?.length > 0 ? 'text-amber-600' : 'text-emerald-700'}
            />
            {aggregates && (
              <StatCard
                label="Revenue Pacing"
                value={`${aggregates.avgRevChange > 0 ? '+' : ''}${aggregates.avgRevChange.toFixed(1)}% avg shift`}
                subtext={aggregates.avgRevChange < -5
                  ? 'Underperforming baseline — action required'
                  : 'Within acceptable variance range'}
                icon={Activity}
                iconColor="text-indigo-600"
                valueColor={aggregates.avgRevChange < -5 ? 'text-rose-600' : 'text-slate-900'}
              />
            )}
            {topAlertCase && (
              <StatCard
                label="Top Incident Onset"
                value={topAlertCase.week_start}
                subtext={`${topAlertCase.kpi} anomaly · ${topAlertCase.region}`}
                icon={Clock}
                iconColor="text-purple-600"
              />
            )}
          </div>

          {/* Tactical Work Queue — driven by real alerts */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Regional Operational Action Queue</h2>
              <span className="text-xs text-slate-500">Auto-routed by KPI ownership</span>
            </div>

            <div className="space-y-3">
              {(data.active_alerts || []).slice(0, 4).map((alert, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        alert.severity === 'high'
                          ? 'bg-rose-100 text-rose-700'
                          : alert.severity === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {alert.kpi}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{alert.region}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">
                      {alert.kpi === 'Checkout Error Rate'
                        ? 'Initiate customer-success winback campaign for impacted checkout sessions'
                        : `Review ${alert.kpi} decline and prepare escalation for ${alert.routed_to}`
                      }
                    </div>
                    <div className="text-xs text-slate-500">
                      {alert.pct_change > 0 ? '+' : ''}{alert.pct_change?.toFixed(1)}% shift ·
                      Week of {alert.week_start} · Owner: {alert.routed_to}
                    </div>
                  </div>
                  <Link
                    to={`/case/${encodeURIComponent(alert.region)}/${alert.week_start}`}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                  >
                    Open Case
                  </Link>
                </div>
              ))}
              {(!data.active_alerts || data.active_alerts.length === 0) && (
                <div className="p-6 text-center text-slate-400 text-sm">
                  <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={28} />
                  All KPIs are within normal operating ranges.
                </div>
              )}
            </div>
          </div>

          {/* Regional KPI Cards */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Operations KPI Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.kpi_summaries?.map((kpi, i) => (
                <KpiCard
                  key={`${kpi.kpi}-${kpi.region}`}
                  data={kpi}
                  trendData={getTrendFor(kpi.kpi, kpi.region)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ANALYST VIEW                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {persona === 'analyst' && (
        <div className="space-y-8">

          {/* Statistical Matrix Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const topAlert = data?.active_alerts?.[0];
              const zScore = topAlert?.z_score;
              const calibAcc = calibrationData?.stats?.overall_accuracy;
              return (
                <>
                  <StatCard
                    label="Anomaly Z-Score Peak"
                    value={zScore !== undefined ? `z = ${zScore.toFixed(2)}` : '—'}
                    subtext={zScore && Math.abs(zScore) >= 1.5
                      ? 'Clears 90% statistical significance'
                      : 'Within normal bounds'}
                    icon={Activity}
                    iconColor="text-purple-600"
                    valueColor={zScore && Math.abs(zScore) >= 1.5 ? 'text-rose-600' : 'text-slate-900'}
                  />
                  <StatCard
                    label="Data Completeness"
                    value={data?.telemetry_summary?.overall_completeness !== undefined
                      ? `${(data.telemetry_summary.overall_completeness * 100).toFixed(1)}%`
                      : '100.0%'}
                    subtext={`${data?.kpi_summaries?.length || 0} KPI series monitored`}
                    icon={Database}
                    iconColor="text-indigo-600"
                    valueColor="text-emerald-600"
                  />
                  <StatCard
                    label="Calibration Accuracy"
                    value={calibAcc !== undefined
                      ? `${(calibAcc * 100).toFixed(0)}%`
                      : '—'}
                    subtext="Historical driver confirmation rate"
                    icon={CheckCircle2}
                    iconColor="text-emerald-500"
                  />
                </>
              );
            })()}
          </div>

          {/* Waterfall Decomposition Preview */}
          {waterfallData && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Additive Waterfall Decomposition (Revenue = Volume × Price × Mix)
                  </h2>
                  <p className="text-xs text-slate-500">Pure deterministic arithmetic — ΔRevenue = ΔVolume + ΔPrice + ΔMix</p>
                </div>
                <Link to="/case/East%20Region/2026-08-11" className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1">
                  Full Diagnostic <ArrowRight size={14} />
                </Link>
              </div>
              <WaterfallChart data={waterfallData} startValue={waterfallData.baseline_revenue || 4000} />
            </div>
          )}

          {/* All KPIs with Full Lineage */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Governed Semantic Entities & Lineage</h2>
              <Link to="/knowledge-graph" className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1">
                Explore Knowledge Graph <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.kpi_summaries?.map((kpi, i) => (
                <KpiCard
                  key={`${kpi.kpi}-${kpi.region}`}
                  data={kpi}
                  trendData={getTrendFor(kpi.kpi, kpi.region)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Telemetry */}
      {data.telemetry_summary && (
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Cpu size={18} className="text-indigo-600" />
              Runtime Telemetry & Cost Accounting
            </h2>
            <span className="text-xs text-slate-500">Deterministic statistical pipeline</span>
          </div>
          <TelemetryPanel telemetry={data.telemetry_summary} />
        </div>
      )}
    </div>
  );
}
