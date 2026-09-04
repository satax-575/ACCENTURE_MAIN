import { useState, useEffect, useMemo } from 'react';
import { getAlerts } from '../api/client';
import { usePersona } from '../context/PersonaContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Search, Filter, AlertTriangle, ArrowRight, 
  CheckCircle2, Clock, ShieldCheck, ChevronRight, User
} from 'lucide-react';

export default function AlertsPage() {
  const { persona, role } = usePersona();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getAlerts(persona, role)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [persona, role]);

  const handleAcknowledge = (e, key) => {
    e.stopPropagation();
    setAcknowledgedAlerts(prev => new Set([...prev, key]));
  };

  const filteredAlerts = useMemo(() => {
    if (!data?.alerts) return [];
    return data.alerts.filter(alert => {
      const key = `${alert.kpi}-${alert.region}-${alert.week_start}`;
      const matchesSearch = alert.kpi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            alert.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            alert.routed_to.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const matchesRegion = regionFilter === 'all' || alert.region === regionFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [data, searchQuery, severityFilter, regionFilter]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center space-x-3">
        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-600 font-medium">Scanning Proactive Alert Subsystem...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <Bell size={12} /> Proactive Alerting
            </span>
            <span className="text-xs text-slate-400">Owner-Routed Inbound Stream</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Active Anomaly Alerts</h1>
          <p className="text-slate-300 text-sm mt-1">
            Prioritized by statistical deviation (|z| &times; business weight &times; recency) and auto-routed to KPI owners.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur px-4 py-2.5 rounded-2xl border border-white/10 text-right">
          <div className="text-xs text-slate-300 font-medium uppercase">Active Queue</div>
          <div className="text-xl font-bold text-amber-400">{filteredAlerts.length} Alerts</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search by KPI, region, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1"><Filter size={13} /> Severity:</span>
          {['all', 'high', 'medium', 'low'].map(s => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                severityFilter === s 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">KPI & Metric</th>
                <th className="px-6 py-4">Region</th>
                <th className="px-6 py-4">Priority Score</th>
                <th className="px-6 py-4">% Change & Z-Score</th>
                <th className="px-6 py-4">Assigned Owner</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAlerts.map((alert, i) => {
                const key = `${alert.kpi}-${alert.region}-${alert.week_start}`;
                const isAck = acknowledgedAlerts.has(key);

                return (
                  <tr 
                    key={i} 
                    onClick={() => navigate(`/case/${encodeURIComponent(alert.region)}/${encodeURIComponent(alert.week_start)}?metric=${encodeURIComponent(alert.metric_col || 'revenue')}`)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        alert.severity === 'high' 
                          ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                          : alert.severity === 'medium'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        <AlertTriangle size={12} />
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {alert.kpi}
                      </div>
                      <div className="text-[11px] text-slate-400">Week of {alert.week_start}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {alert.region}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-sm">
                      {alert.priority_score?.toFixed(1)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${alert.pct_change < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {alert.pct_change > 0 ? '+' : ''}{alert.pct_change}%
                      </span>
                      <span className="text-[11px] text-slate-400 block font-mono">
                        z = {alert.z_score}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded-xl text-xs border border-slate-200">
                        <User size={12} className="text-slate-400" />
                        {alert.routed_to}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleAcknowledge(e, key)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                            isAck 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isAck ? '✓ Acknowledged' : 'Acknowledge'}
                        </button>
                        <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
