import { Database, TrendingUp, Activity, CheckCircle2, Info } from 'lucide-react';

const ICON_MAP = {
  database: Database,
  trending: TrendingUp,
  activity: Activity,
  checkCircle: CheckCircle2,
};

function ScoreBar({ score, weight }) {
  const pct = score ?? 0;
  const color =
    pct >= 75 ? 'bg-emerald-500' :
    pct >= 50 ? 'bg-amber-500' :
    pct >= 25 ? 'bg-orange-500' : 'bg-rose-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
        {score != null ? `${pct}%` : 'N/A'}
      </span>
    </div>
  );
}

export default function TrustScorePanel({ trustScore }) {
  if (!trustScore) return null;

  const { overall_score, badge, components } = trustScore;

  const badgeStyle = {
    HIGH:    'bg-emerald-100 text-emerald-700 border-emerald-200',
    MODERATE:'bg-amber-100  text-amber-700  border-amber-200',
    LOW:     'bg-orange-100 text-orange-700 border-orange-200',
    ABSTAIN: 'bg-rose-100   text-rose-700   border-rose-200',
  }[badge] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-indigo-500" />
          <span className="text-xs font-bold text-slate-800">Confidence Trust Score</span>
          <div className="group relative">
            <Info size={11} className="text-slate-400 cursor-help" />
            <div className="absolute left-4 top-4 z-10 hidden group-hover:block w-56 bg-slate-900 text-white text-[10px] rounded-xl p-2.5 shadow-xl leading-relaxed">
              Decomposed confidence: why is this insight HIGH or LOW? Each sub-component is computed
              deterministically — no LLM involved.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
            {badge}
          </span>
          <span className="text-lg font-black text-slate-900">{overall_score}</span>
          <span className="text-[10px] text-slate-400 font-semibold">/100</span>
        </div>
      </div>

      {/* Overall bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            overall_score >= 72 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
            overall_score >= 45 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
            'bg-gradient-to-r from-rose-400 to-rose-600'
          }`}
          style={{ width: `${overall_score}%` }}
        />
      </div>

      {/* Sub-components */}
      <div className="space-y-2.5 pt-1">
        {components?.map((comp) => {
          const Icon = ICON_MAP[comp.icon] || Activity;
          return (
            <div key={comp.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon size={11} className="text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-700">{comp.name}</span>
                  <span className="text-[9px] text-slate-400 font-medium">({comp.weight}% weight)</span>
                </div>
              </div>
              <ScoreBar score={comp.score} weight={comp.weight} />
              <p className="text-[10px] text-slate-500 leading-relaxed ml-3.5">{comp.description}</p>
            </div>
          );
        })}
      </div>

      <div className="pt-1 border-t border-slate-100 text-[9px] text-slate-400 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        Method: rule_based · No LLM involved in confidence computation
      </div>
    </div>
  );
}
