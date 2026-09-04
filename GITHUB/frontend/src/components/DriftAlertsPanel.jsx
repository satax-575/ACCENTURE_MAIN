import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Clock, X } from 'lucide-react';

export default function DriftAlertsPanel() {
  const [drift, setDrift] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchDrift = async () => {
    setLoading(true);
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const res = await fetch(`${base}/drift`);
      if (res.ok) {
        const data = await res.json();
        setDrift(data);
      }
    } catch {
      // Silently fail — drift panel is non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrift();
    // Re-check every 5 minutes
    const interval = setInterval(fetchDrift, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed) return null;
  if (!drift || (drift.total_stale === 0 && drift.logged_cases === 0)) return null;

  const staleCount = drift.total_stale || 0;

  if (staleCount === 0) {
    // Show a small "all fresh" indicator
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] text-emerald-700 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {drift.logged_cases} insight{drift.logged_cases !== 1 ? 's' : ''} monitored · All fresh
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {loading ? (
            <RefreshCw size={13} className="text-amber-600 animate-spin" />
          ) : (
            <AlertTriangle size={13} className="text-amber-600" />
          )}
          <div>
            <span className="text-xs font-bold text-amber-800">
              {staleCount} Stale Insight{staleCount !== 1 ? 's' : ''} Detected
            </span>
            <span className="text-[10px] text-amber-600 ml-1">— explanations may have changed</span>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
          <X size={13} />
        </button>
      </div>

      {/* Stale insight list */}
      {drift.stale_insights?.slice(0, 3).map((insight, i) => (
        <div key={i} className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-[10px] space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">
              {insight.region} · {insight.metric}
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <Clock size={9} /> {insight.week_start}
            </span>
          </div>
          <div className="text-amber-700">{insight.stale_reason}</div>
          {insight.old_top_driver !== insight.new_top_driver && (
            <div className="text-slate-500">
              Was: <span className="font-semibold text-slate-700">{insight.top_driver}</span>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={fetchDrift}
        disabled={loading}
        className="w-full text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center justify-center gap-1 py-1"
      >
        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        Re-check now
      </button>
    </div>
  );
}
