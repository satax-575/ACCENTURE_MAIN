import { useState, useEffect } from 'react';
import { Target, CheckCircle2, XCircle, AlertTriangle, Clock, TrendingUp, RefreshCw, BarChart3 } from 'lucide-react';

const STATUS_CONFIG = {
  PENDING:      { label: 'Pending',      color: 'text-amber-600',  bg: 'bg-amber-50  border-amber-200',  icon: Clock       },
  VERIFIED:     { label: 'Verified',     color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  INCONCLUSIVE: { label: 'Inconclusive',color: 'text-slate-500',  bg: 'bg-slate-50  border-slate-200',  icon: AlertTriangle },
  MISSED:       { label: 'Missed',       color: 'text-rose-600',   bg: 'bg-rose-50   border-rose-200',   icon: XCircle     },
};

const ACCURACY_CONFIG = {
  HIT:     { label: 'Hit',     color: 'text-emerald-700', bg: 'bg-emerald-100' },
  PARTIAL: { label: 'Partial', color: 'text-amber-700',   bg: 'bg-amber-100'   },
  MISS:    { label: 'Miss',    color: 'text-rose-700',    bg: 'bg-rose-100'    },
};

export default function ActionOutcomesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const base = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

  const fetchData = async () => {
    try {
      const res = await fetch(`${base}/action-outcomes`);
      if (res.ok) setData(await res.json());
    } catch { /* noop */ } finally { setLoading(false); }
  };

  const triggerCheck = async () => {
    setChecking(true);
    try {
      await fetch(`${base}/action-outcomes/check`, { method: 'POST' });
      await fetchData();
    } finally { setChecking(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-slate-500">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        Loading action outcomes...
      </div>
    );
  }

  const outcomes = data?.outcomes || [];
  const summary = data?.summary || {};
  const pending = data?.pending || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Target size={20} className="text-indigo-600" />
            Action Outcome Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Closes the loop: were dispatched actions' predicted impacts realized?
          </p>
        </div>
        <button
          onClick={triggerCheck}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
          Check Outcomes Now
        </button>
      </div>

      {/* Summary cards */}
      {summary.total > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <SummaryCard label="Total Verified" value={summary.total} icon={BarChart3} color="text-indigo-600" />
          <SummaryCard label="Hit Rate" value={summary.hit_rate != null ? `${summary.hit_rate}%` : 'N/A'} icon={CheckCircle2} color="text-emerald-600" />
          <SummaryCard label="Hits" value={summary.hits || 0} icon={CheckCircle2} color="text-emerald-600" />
          <SummaryCard label="Pending" value={summary.pending || 0} icon={Clock} color="text-amber-600" />
        </div>
      )}

      {/* Pending notice */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Clock size={16} className="text-amber-600 flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-amber-800">{pending.length} action{pending.length !== 1 ? 's' : ''} ready for verification</div>
            <div className="text-xs text-amber-600">Check date has passed — click "Check Outcomes Now" to verify.</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {outcomes.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No dispatched actions tracked yet.</p>
          <p className="text-xs mt-1">Dispatch an action via the case page to start tracking outcomes.</p>
        </div>
      )}

      {/* Outcome cards */}
      <div className="space-y-3">
        {outcomes.map((outcome, i) => {
          const statusCfg = STATUS_CONFIG[outcome.status] || STATUS_CONFIG.PENDING;
          const accCfg = outcome.prediction_accuracy ? ACCURACY_CONFIG[outcome.prediction_accuracy] : null;
          const StatusIcon = statusCfg.icon;

          return (
            <div key={i} className={`border rounded-2xl p-4 space-y-3 ${statusCfg.bg}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900">{outcome.driver}</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                      {outcome.region} · {outcome.metric}
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}>
                      <StatusIcon size={10} /> {statusCfg.label}
                    </span>
                    {accCfg && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${accCfg.bg} ${accCfg.color}`}>
                        {accCfg.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{outcome.predicted_impact}</p>
                </div>
                <div className="text-right text-[10px] text-slate-400 flex-shrink-0">
                  <div>Dispatched by {outcome.dispatched_by}</div>
                  <div>{new Date(outcome.dispatched_at).toLocaleDateString()}</div>
                  <div className="text-slate-500 font-medium">Owner: {outcome.owner}</div>
                </div>
              </div>

              {/* Actual vs predicted */}
              {outcome.status === 'VERIFIED' && outcome.actual_impact_pct != null && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50">
                  <div className="bg-white rounded-xl px-3 py-2">
                    <div className="text-[9px] text-slate-500 font-semibold uppercase">Predicted</div>
                    <div className="text-xs font-bold text-slate-800">{outcome.predicted_impact}</div>
                  </div>
                  <div className="bg-white rounded-xl px-3 py-2">
                    <div className="text-[9px] text-slate-500 font-semibold uppercase">Actual</div>
                    <div className={`text-sm font-black ${outcome.actual_impact_pct > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {outcome.actual_impact_pct > 0 ? '+' : ''}{outcome.actual_impact_pct}%
                    </div>
                  </div>
                </div>
              )}

              {outcome.notes && (
                <p className="text-[10px] text-slate-500 italic">{outcome.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
        <span>{label}</span>
        <Icon size={14} className={color} />
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}
