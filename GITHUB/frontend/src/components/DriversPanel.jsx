import { TrendingUp, TrendingDown, Calendar, BarChart3, Activity } from 'lucide-react';

const CONF_COLORS = {
  HIGH:     { bar: '#10b981', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  MODERATE: { bar: '#f59e0b', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  LOW:      { bar: '#ef4444', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
};

function DriverBar({ driver, maxContribution, index }) {
  const {
    driver: name,
    pct_change,
    contribution_pct,
    onset,
    confidence,
    correlation,
    hypothesis_rank,
  } = driver;

  const colors = CONF_COLORS[confidence] || CONF_COLORS.LOW;
  const barWidth = maxContribution > 0 ? (contribution_pct / maxContribution) * 100 : 0;
  const isPositive = pct_change > 0;

  return (
    <div className="space-y-2.5 animate-fade-in" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-start justify-between gap-3">
        {/* Left: rank + name + badges */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0">
            {hypothesis_rank || index + 1}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{name}</div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${colors.badge}`}>
                {confidence}
              </span>
              {onset && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Calendar size={9} /> Onset {onset}
                </span>
              )}
              {correlation !== null && correlation !== undefined && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Activity size={9} /> r = {correlation.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: pct change */}
        <div className={`flex items-center gap-1 text-sm font-bold shrink-0 ${
          isPositive ? 'text-rose-600' : 'text-emerald-600'
        }`}>
          {isPositive
            ? <TrendingUp size={14} />
            : <TrendingDown size={14} />
          }
          {isPositive ? '+' : ''}{pct_change?.toFixed(1)}%
        </div>
      </div>

      {/* Contribution bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${barWidth}%`,
              background: colors.bar,
            }}
          />
        </div>
        <span className="text-xs font-bold text-slate-700 w-12 text-right shrink-0">
          {contribution_pct}%
        </span>
      </div>
    </div>
  );
}

export default function DriversPanel({ drivers }) {
  if (!drivers || drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <BarChart3 size={22} className="text-slate-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-700">No verified drivers found</div>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            No candidate driver cleared the causal precedence check for this KPI shift.
            The anomaly may be noise, or driver data may be insufficient.
          </p>
        </div>
      </div>
    );
  }

  const maxContribution = Math.max(...drivers.map(d => d.contribution_pct));

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> HIGH confidence
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> MODERATE
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> LOW
        </span>
        <span className="ml-auto">Bar = contribution share</span>
      </div>

      {/* Driver rows */}
      <div className="space-y-5 divide-y divide-slate-50">
        {drivers.map((driver, i) => (
          <div key={driver.driver} className={i > 0 ? 'pt-5' : ''}>
            <DriverBar
              driver={driver}
              maxContribution={maxContribution}
              index={i}
            />
          </div>
        ))}
      </div>

      {/* Causal precedence note */}
      <div className="mt-4 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-700">
        <strong>Causal precedence check:</strong> Only drivers whose deviation onset predates 
        the KPI shift are included. Contribution % is normalized over weighted driver magnitudes.
      </div>
    </div>
  );
}
