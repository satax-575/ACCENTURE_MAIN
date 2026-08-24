import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getCase } from '../api/client';
import { usePersona } from '../context/PersonaContext';
import { 
  ArrowLeft, MessageSquare, AlertTriangle, ShieldCheck, 
  Clock, Database, Layers, CheckCircle2, Sliders, ChevronRight,
  TrendingDown, Sparkles, ExternalLink, Activity, Info, FileText
} from 'lucide-react';
import DriversPanel from './DriversPanel';
import WaterfallChart from './WaterfallChart';
import ConfidenceGauge from './ConfidenceGauge';
import ActionPanel from './ActionPanel';
import EvidenceTrail from './EvidenceTrail';
import TelemetryPanel from './TelemetryPanel';
import FeedbackModal from './FeedbackModal';
import NarrativeCard from './NarrativeCard';
import ExecutiveMemoModal from './ExecutiveMemoModal';

export default function CasePage() {
  const { region, weekStart } = useParams();
  const [searchParams] = useSearchParams();
  const metric = searchParams.get('metric') || 'revenue';
  const { persona, role } = usePersona();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [activeTab, setActiveTab] = useState('diagnostic'); // diagnostic, waterfall, evidence

  useEffect(() => {
    setLoading(true);
    getCase(region, weekStart, metric, persona, role)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [region, weekStart, metric, persona, role]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center space-x-3">
        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-600 font-medium">Running Deterministic Root-Cause Diagnostics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-700 space-y-3">
        <div className="flex items-center gap-2 font-bold text-lg">
          <AlertTriangle size={20} /> Access Restricted or Case Error
        </div>
        <p className="text-sm">{error}</p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const isAbstain = data.confidence?.level === 'ABSTAIN';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* Top Breadcrumb & Quick Case Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link 
            to="/" 
            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Cases</span>
              <ChevronRight size={12} />
              <span className="capitalize">{metric} Movement</span>
              <ChevronRight size={12} />
              <span className="font-semibold text-slate-800">{region}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5 capitalize">
              {region} — {metric} Shift Analysis
            </h1>
          </div>
        </div>

        {/* Action Controls: Quick Feedback, Executive Memo & Scenario Links */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Scenario Toggles */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
            <Link 
              to="/case/East%20Region/2026-08-11?metric=revenue" 
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                region === 'East Region' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              East Region (Anomaly)
            </Link>
            <Link 
              to="/case/North%20Region/2026-08-18?metric=revenue" 
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                region === 'North Region' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              North Region (Abstain)
            </Link>
          </div>

          <button 
            onClick={() => setShowMemoModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
          >
            <FileText size={14} className="text-indigo-400" /> Executive Board Memo
          </button>

          <button 
            onClick={() => setShowFeedback(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
          >
            <MessageSquare size={14} /> Submit Feedback
          </button>
        </div>
      </div>

      {/* Prominent Abstention Alert Banner if engine declined to speculate */}
      {isAbstain && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-5 rounded-3xl shadow-lg flex items-start gap-4">
          <div className="p-2.5 bg-white/20 rounded-2xl shrink-0">
            <AlertTriangle size={24} className="text-amber-100" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base">Engine Hard Abstention Enforced</h3>
            <p className="text-xs text-amber-100 leading-relaxed">
              {data.confidence?.reason} The engine refuses to guess or hallucinate explanations when dependent feeds are stale or missing.
            </p>
            <div className="pt-2 text-xs font-mono text-amber-200">
              Action Required: Remediate {data.confidence?.missing_or_stale?.join(', ')} feed before re-evaluating.
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Analytical Core (8 cols) + Governance & Actions (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Signal Summary & Persona Narrative Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  data.signal?.flagged 
                    ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                  {data.signal?.pct_change > 0 ? '+' : ''}{data.signal?.pct_change}% Shift (z = {data.signal?.z_score})
                </span>
                <span className="text-xs text-slate-500 font-medium">Week of {data.signal?.week_start || weekStart}</span>
              </div>

              {/* Persona Tag */}
              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-xl font-bold uppercase tracking-wider">
                Audience: {persona}
              </span>
            </div>

            {/* Persona Narrative */}
            <NarrativeCard narrative={data.narrative} />

            {/* Baseline Comparison Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-medium block mb-0.5">Trailing Baseline Mean</span>
                <span className="text-base font-bold text-slate-800">${data.signal?.baseline_mean?.toFixed(2) || '0.00'}/day</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-medium block mb-0.5">Target Week Mean</span>
                <span className="text-base font-bold text-slate-800">${data.signal?.target_mean?.toFixed(2) || '0.00'}/day</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-medium block mb-0.5">Statistical Flag</span>
                <span className="text-base font-bold text-rose-600">{data.signal?.flagged ? 'Material Anomaly' : 'Normal Noise'}</span>
              </div>
            </div>
          </div>

          {/* Navigation View Tabs */}
          <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
            <button 
              onClick={() => setActiveTab('diagnostic')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'diagnostic' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity size={16} /> Driver Decomposition ({data.drivers?.length || 0})
            </button>
            {data.waterfall && (
              <button 
                onClick={() => setActiveTab('waterfall')}
                className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'waterfall' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers size={16} /> Additive Waterfall Math
              </button>
            )}
            <button 
              onClick={() => setActiveTab('evidence')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'evidence' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database size={16} /> Data Freshness & Feeds
            </button>
          </div>

          {/* Tab 1: Driver Decomposition & Causal Precedence */}
          {activeTab === 'diagnostic' && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Ranked Explanatory Drivers</h2>
                  <p className="text-xs text-slate-500">Evaluated with temporal causal precedence check (driver onset &le; KPI shift)</p>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold">
                  Statistical Attribution
                </span>
              </div>
              <DriversPanel drivers={data.drivers} />
            </div>
          )}

          {/* Tab 2: Additive Waterfall Analysis */}
          {activeTab === 'waterfall' && data.waterfall && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Volume, Price & Mix Decomposition</h2>
                <p className="text-xs text-slate-500">Exact additive math (&Delta;Revenue = &Delta;Volume + &Delta;Price + &Delta;Mix) without LLM estimation</p>
              </div>
              <WaterfallChart data={data.waterfall} startValue={data.signal?.baseline_mean || 0} />
            </div>
          )}

          {/* Tab 3: Evidence & Freshness Audit */}
          {activeTab === 'evidence' && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Source Freshness & Quality Lineage</h2>
                <p className="text-xs text-slate-500">Multi-cadence audit across daily transactions, weekly marketing, and event support feeds</p>
              </div>
              <EvidenceTrail freshness={data.freshness} />
            </div>
          )}
        </div>

        {/* Right Column (4 Cols): Confidence, Actions, Telemetry */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Confidence Scorecard */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 self-start flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600" /> Analytical Confidence
            </h2>
            <ConfidenceGauge confidence={data.confidence} />
          </div>

          {/* Governed Action Recommendations */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sliders size={16} className="text-indigo-600" /> Governed Action Playbook
              </h2>
            </div>
            <ActionPanel 
              actions={data.actions} 
              confidenceLevel={data.confidence?.level} 
              caseData={{ region: data.region || region, week_start: data.signal?.week_start || weekStart, metric }}
            />
          </div>

          {/* Trace Telemetry Breakdown */}
          {data.telemetry && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-indigo-600" /> Pipeline Stage Trace
              </h2>
              <TelemetryPanel telemetry={data.telemetry} />
            </div>
          )}

        </div>
      </div>

      {/* Executive Board Memo Modal */}
      {showMemoModal && (
        <ExecutiveMemoModal
          onClose={() => setShowMemoModal(false)}
          region={data.region || region}
          weekStart={data.signal?.week_start || weekStart}
        />
      )}

      {/* Analyst Feedback Modal */}
      {showFeedback && (
        <FeedbackModal 
          onClose={() => setShowFeedback(false)} 
          caseData={{ region: data.region, week_start: data.signal?.week_start || weekStart, metric }}
        />
      )}
    </div>
  );
}
