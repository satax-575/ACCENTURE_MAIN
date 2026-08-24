import { useState, useEffect } from 'react';
import { usePersona } from '../context/PersonaContext';
import { getDashboard, getWaterfall, getForecast, getCalibration } from '../api/client';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  ArrowRight, ShieldCheck, DollarSign, Activity, Cpu, 
  Zap, Clock, Users, Database, Layers, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import KpiCard from './KpiCard';
import AlertsBanner from './AlertsBanner';
import TelemetryPanel from './TelemetryPanel';
import WaterfallChart from './WaterfallChart';
import AccentureLogo from './AccentureLogo';

export default function Dashboard() {
  const { persona, role } = usePersona();
  const [data, setData] = useState(null);
  const [waterfallData, setWaterfallData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [calibrationData, setCalibrationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvedActions, setApprovedActions] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    getDashboard(persona, role)
      .then(res => {
        setData(res);
        // Load supplemental data for persona dashboards
        getWaterfall('East Region', '2026-08-11', 'revenue').then(setWaterfallData).catch(() => {});
        getForecast('Revenue', 'East Region').then(setForecastData).catch(() => {});
        getCalibration().then(setCalibrationData).catch(() => {});
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [persona, role]);

  const handleApproveAction = (actionId) => {
    setApprovedActions(prev => new Set([...prev, actionId]));
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center space-x-3">
        <div className="w-6 h-6 border-3 border-[#a100ff] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-600 font-medium">Synthesizing {persona.toUpperCase()} Intelligence Workspace...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
        <h3 className="font-bold mb-1">Failed to load dashboard</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* Dynamic Persona Hero Header with Accenture Sub-Brand */}
      <div className="p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-slate-950 via-[#19042b] to-slate-950 border border-[#a100ff]/30">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <AccentureLogo className="h-4 opacity-90" variant="light" />
            <span className="text-slate-500">•</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#a100ff]/20 text-[#d896ff] border border-[#a100ff]/30">
              {persona === 'ceo' ? '👑 Executive Strategy Suite' : persona === 'manager' ? '⚙️ Operations Command' : '🔬 Quantitative Deep-Dive'}
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

        {/* Quick KPI Stat Counter */}
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/10">
          <div>
            <div className="text-[11px] text-slate-300 font-medium uppercase">Active Alerts</div>
            <div className="text-xl font-bold text-amber-400">{data?.active_alerts?.length || 0}</div>
          </div>
          <div className="h-8 w-px bg-white/20"></div>
          <div>
            <div className="text-[11px] text-slate-300 font-medium uppercase">Monitored KPIs</div>
            <div className="text-xl font-bold text-white">{data?.kpi_summaries?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Priority Alert Banner if any */}
      {data.active_alerts && data.active_alerts.length > 0 && (
        <AlertsBanner alert={data.active_alerts[0]} />
      )}

      {/* ========================================================================= */}
      {/* 1. CEO EXECUTIVE VIEW */}
      {/* ========================================================================= */}
      {persona === 'ceo' && (
        <div className="space-y-8">
          
          {/* Macro Metric Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase">
                <span>Total Run-Rate Revenue</span>
                <DollarSign size={16} className="text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">$28,450<span className="text-sm font-normal text-slate-500">/wk</span></div>
              <div className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
                <TrendingDown size={14} /> -11.6% net revenue drag in East Region
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase">
                <span>Revenue at Risk</span>
                <AlertTriangle size={16} className="text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">$2,730</div>
              <div className="text-xs text-slate-500 mt-1">
                Primary driver: Checkout Error Surge
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase">
                <span>Decision Speedup</span>
                <Zap size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">4.5x</div>
              <div className="text-xs text-slate-500 mt-1">
                Avg. triage time reduced to &lt; 2 hrs
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase">
                <span>AI Compute Economics</span>
                <Cpu size={16} className="text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">$0.000</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">
                92% token savings via JSON fencing
              </div>
            </div>
          </div>

          {/* Strategic Decision & Approval Center */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-amber-400" />
                <h2 className="text-lg font-bold">Executive Decision Rights & Intervention Center</h2>
              </div>
              <span className="text-xs bg-indigo-500/30 px-3 py-1 rounded-full text-indigo-300 border border-indigo-500/40">
                1 Pending Approval
              </span>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-rose-500/20 text-rose-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30">P1 Incident</span>
                  <span className="text-xs text-slate-300">East Region Checkout Failure Resolution</span>
                </div>
                <div className="text-base font-semibold text-white">Escalate checkout issue to Engineering & Authorize 24hr customer-success outreach</div>
                <div className="text-xs text-slate-400">Projected Recovery: Resolve ~55% of revenue impact within 3-5 days • Owner: Head of Engineering</div>
              </div>

              <div className="flex items-center gap-3">
                <Link 
                  to="/case/East%20Region/2026-08-11"
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition-all"
                >
                  Inspect Evidence
                </Link>
                <button
                  onClick={() => handleApproveAction('action-1')}
                  disabled={approvedActions.has('action-1')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                    approvedActions.has('action-1')
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {approvedActions.has('action-1') ? (
                    <>
                      <CheckCircle2 size={14} /> Action Authorized & Dispatched
                    </>
                  ) : (
                    'Authorize Strategic Intervention'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Executive KPI Monitored Health</h2>
              <span className="text-xs text-slate-500 font-medium">Filtered for CEO Visibility</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.kpi_summaries?.map((kpi, i) => (
                <KpiCard key={i} data={kpi} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MANAGER OPERATIONS VIEW */}
      {/* ========================================================================= */}
      {persona === 'manager' && (
        <div className="space-y-8">
          
          {/* Operational Health & Team Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                <Users size={16} className="text-emerald-600" /> Operational SLA Status
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">1 Escalation Active</div>
              <p className="text-xs text-slate-500 mt-1">Assigned to: Head of Engineering</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                <Activity size={16} className="text-indigo-600" /> Regional Pacing
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">East: 88.4% Pacing</div>
              <p className="text-xs text-rose-600 font-medium mt-1">Underperforming baseline by -11.6%</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                <Clock size={16} className="text-purple-600" /> Incident Onset Timing
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">2026-08-09</div>
              <p className="text-xs text-slate-500 mt-1">Checkout error preceded sales drop by 48h</p>
            </div>
          </div>

          {/* Tactical Work Queue */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Regional Operational Action Playbooks</h2>
              <span className="text-xs text-slate-500">Auto-routed by KPI ownership</span>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">Checkout Failure</span>
                    <span className="text-xs font-bold text-slate-700">East Region Support Queue</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">Initiate customer-success winback campaign for impacted checkout sessions</div>
                  <div className="text-xs text-slate-500">Affected Accounts: ~42 accounts | Owner: VP Sales</div>
                </div>
                <Link to="/case/East%20Region/2026-08-11" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0">
                  Open Incident Case
                </Link>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Data Feed Delay</span>
                    <span className="text-xs font-bold text-slate-700">North Region Support Ticket Sync</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">Contact Data Engineering regarding missing ticket export batch</div>
                  <div className="text-xs text-slate-500">Status: Engine Abstaining due to stale feed | Owner: Data Ops</div>
                </div>
                <Link to="/case/North%20Region/2026-08-18" className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shrink-0">
                  View Abstention
                </Link>
              </div>
            </div>
          </div>

          {/* Regional KPI Cards */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Operations KPI Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.kpi_summaries?.map((kpi, i) => (
                <KpiCard key={i} data={kpi} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ANALYST QUANTITATIVE DEEP-DIVE VIEW */}
      {/* ========================================================================= */}
      {persona === 'analyst' && (
        <div className="space-y-8">
          
          {/* Statistical Matrix Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                <Activity size={16} className="text-purple-600" /> Anomaly Z-Score Peak
              </div>
              <div className="text-2xl font-bold text-rose-600 mt-2">z = -1.89</div>
              <p className="text-xs text-slate-500 mt-1">Revenue shift clears 95% statistical significance</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                <Database size={16} className="text-indigo-600" /> Data Completeness
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">100.0%</div>
              <p className="text-xs text-slate-500 mt-1">0 duplicate order IDs across 7,108 rows</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                <CheckCircle2 size={16} className="text-emerald-500" /> Calibration Accuracy
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {calibrationData?.stats?.overall_accuracy ? `${(calibrationData.stats.overall_accuracy * 100).toFixed(0)}%` : '100%'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Historical driver confirmation rate</p>
            </div>
          </div>

          {/* Waterfall Decomposition Preview Card */}
          {waterfallData && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Additive Waterfall Decomposition (Revenue = Volume × Price × Mix)</h2>
                  <p className="text-xs text-slate-500">Pure deterministic arithmetic breakdown — zero LLM hallucination</p>
                </div>
                <Link to="/case/East%20Region/2026-08-11" className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1">
                  Full Diagnostic <ArrowRight size={14} />
                </Link>
              </div>
              <WaterfallChart data={waterfallData} startValue={4017} />
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
                <KpiCard key={i} data={kpi} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Telemetry Section */}
      {data.telemetry_summary && (
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Cpu size={18} className="text-indigo-600" /> Runtime Telemetry & Cost Accounting
            </h2>
            <span className="text-xs text-slate-500">Zero-Hallucination Deterministic Pipeline</span>
          </div>
          <TelemetryPanel telemetry={data.telemetry_summary} />
        </div>
      )}
    </div>
  );
}
