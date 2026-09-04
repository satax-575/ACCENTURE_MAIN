import { AlertTriangle, TrendingUp, TrendingDown, GitMerge, Info } from 'lucide-react';

export default function ContradictionView({ contradictions, drivers }) {
  if (!contradictions || contradictions.length === 0) return null;

  // Find the contradicting driver pairs from the driver list
  const positiveDrivers = (drivers || []).filter(d => d.pct_change > 0);
  const negativeDrivers = (drivers || []).filter(d => d.pct_change < 0);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={13} className="text-amber-700" />
        </div>
        <div>
          <div className="text-xs font-bold text-amber-800">Contradictory Evidence Detected</div>
          <div className="text-[10px] text-amber-600">
            {contradictions.length} conflicting driver signal{contradictions.length > 1 ? 's' : ''} — both hypotheses shown
          </div>
        </div>
        <div className="ml-auto">
          <div className="group relative">
            <Info size={13} className="text-amber-500 cursor-help" />
            <div className="absolute right-0 top-5 z-10 hidden group-hover:block w-64 bg-slate-900 text-white text-[10px] rounded-xl p-2.5 shadow-xl leading-relaxed">
              Instead of silently picking one hypothesis, the engine surfaces both contradicting drivers
              side-by-side. The system flags this as LOW confidence and will not recommend action until
              an analyst resolves the contradiction.
            </div>
          </div>
        </div>
      </div>

      {/* Contradiction descriptions */}
      {contradictions.map((c, i) => (
        <div key={i} className="text-[10px] text-amber-700 bg-amber-100 rounded-xl px-3 py-2 font-medium">
          ⚡ {c}
        </div>
      ))}

      {/* Side-by-side hypothesis cards */}
      {positiveDrivers.length > 0 && negativeDrivers.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Hypothesis A — positive driver */}
          <HypothesisCard
            label="Hypothesis A"
            driver={positiveDrivers[0]}
            direction="positive"
            icon={<TrendingUp size={14} className="text-emerald-600" />}
            bgColor="bg-emerald-50 border-emerald-200"
            textColor="text-emerald-800"
          />

          {/* Hypothesis B — negative driver */}
          <HypothesisCard
            label="Hypothesis B"
            driver={negativeDrivers[0]}
            direction="negative"
            icon={<TrendingDown size={14} className="text-rose-600" />}
            bgColor="bg-rose-50 border-rose-200"
            textColor="text-rose-800"
          />
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10px] text-amber-700 font-semibold pt-1">
        <GitMerge size={11} />
        Analyst resolution required before action dispatch
      </div>
    </div>
  );
}

function HypothesisCard({ label, driver, direction, icon, bgColor, textColor }) {
  return (
    <div className={`border rounded-xl p-3 space-y-2 ${bgColor}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-black uppercase tracking-wider ${textColor}`}>{label}</span>
        {icon}
      </div>
      <div className={`text-xs font-bold ${textColor}`}>{driver.driver}</div>
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Change</span>
          <span className={`font-bold ${direction === 'positive' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {driver.pct_change > 0 ? '+' : ''}{driver.pct_change?.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Contribution</span>
          <span className="font-semibold text-slate-700">{driver.contribution_pct}%</span>
        </div>
        {driver.correlation != null && (
          <div className="flex justify-between">
            <span className="text-slate-500">Correlation r</span>
            <span className="font-semibold text-slate-700">{driver.correlation}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Onset</span>
          <span className="font-semibold text-slate-700">{driver.onset}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Confidence</span>
          <span className={`font-bold ${driver.confidence === 'HIGH' ? 'text-emerald-700' : 'text-amber-600'}`}>
            {driver.confidence}
          </span>
        </div>
      </div>
    </div>
  );
}
