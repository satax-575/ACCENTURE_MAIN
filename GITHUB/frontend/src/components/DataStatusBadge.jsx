/**
 * DataStatusBadge — Live data freshness indicator for the Dashboard header.
 * Fetches /api/data/status and shows:
 *   - Date range of loaded data
 *   - Last updated timestamp
 *   - External enrichment status (Weather API, Alpha Vantage)
 *   - A "Update Now" button that triggers /api/data/update
 */
import { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle2, Clock, CloudRain, TrendingUp } from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export default function DataStatusBadge() {
  const [status, setStatus] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${BASE}/data/status`);
      if (r.ok) setStatus(await r.json());
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    // Refresh status every 60 seconds
    const id = setInterval(fetchStatus, 60000);
    return () => clearInterval(id);
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const r = await fetch(`${BASE}/data/update`, { method: 'POST' });
      const data = await r.json();
      await fetchStatus();
      alert(data.message || 'Update complete');
    } catch (e) {
      alert('Update error: ' + e.message);
    } finally {
      setUpdating(false);
    }
  };

  if (!status) return null;

  const txMax = status.transactions?.date_max;
  const txMin = status.transactions?.date_min;
  const txRows = status.transactions?.rows?.toLocaleString();
  const lastRun = status.ledger_last_run
    ? new Date(status.ledger_last_run).toLocaleString()
    : 'Never';
  const weatherActive = status.external_enrichment?.find(e => e.source.includes('Open-Meteo'))?.status === 'active';
  const avActive = status.external_enrichment?.find(e => e.source.includes('Alpha'))?.status === 'active';

  return (
    <div className="relative">
      {/* Compact badge */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-indigo-500/50 transition-all text-xs text-slate-300"
      >
        <Database size={12} className="text-emerald-400" />
        <span className="font-mono">{txMin} → {txMax}</span>
        <span className="text-slate-500">|</span>
        <span className="text-emerald-400 font-semibold">{txRows} rows</span>
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${weatherActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database size={12} className="text-indigo-400" /> Data Sources
            </div>
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold disabled:opacity-50 transition-all"
            >
              <RefreshCw size={10} className={updating ? 'animate-spin' : ''} />
              {updating ? 'Updating...' : 'Append New Data'}
            </button>
          </div>

          {/* Sources */}
          {status.data_sources?.map(src => (
            <div key={src.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">{src.name}</span>
                <span className="text-slate-500 text-[10px]">({src.grain})</span>
              </div>
              <span className="text-slate-400 text-[10px] font-mono">{src.latency}</span>
            </div>
          ))}

          <div className="border-t border-slate-800 pt-3 space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">External Enrichment</div>
            <div className="flex items-center gap-2 text-xs">
              <CloudRain size={11} className={weatherActive ? 'text-sky-400' : 'text-slate-500'} />
              <span className={weatherActive ? 'text-slate-300' : 'text-slate-500'}>Open-Meteo Weather API</span>
              <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full ${weatherActive ? 'bg-emerald-900 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {weatherActive ? 'LIVE' : 'NO KEY'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp size={11} className={avActive ? 'text-amber-400' : 'text-slate-500'} />
              <span className={avActive ? 'text-slate-300' : 'text-slate-500'}>Alpha Vantage (TGT proxy)</span>
              <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full ${avActive ? 'bg-emerald-900 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {avActive ? 'LIVE' : 'NO KEY'}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
            <Clock size={10} />
            <span>Last updated: {lastRun}</span>
          </div>
        </div>
      )}
    </div>
  );
}
