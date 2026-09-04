import { useState, useEffect } from 'react';
import { getCalibration } from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { 
  CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, 
  Sliders, RefreshCw, Sparkles, TrendingUp, UserCheck, Layers
} from 'lucide-react';

export default function CalibrationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appliedSuggestions, setAppliedSuggestions] = useState(false);

  useEffect(() => {
    setLoading(true);
    getCalibration()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center space-x-3">
        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-600 font-medium">Calculating Calibration Matrix & Weight Adjustments...</span>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-slate-500">No calibration data available.</div>;

  const perDriver = data.per_driver || {};
  const weightSuggestions = data.weight_suggestions || {};
  const stats = data.stats || { total_feedback: 0, confirmed: 0, overall_accuracy: 1.0 };

  const chartData = Object.entries(perDriver).map(([driver, s]) => ({
    name: driver,
    accuracy: s.accuracy !== null ? s.accuracy * 100 : 100,
    total: s.total,
    confirmed: s.confirmed
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 size={12} /> Human-In-The-Loop Calibration
            </span>
            <span className="text-xs text-slate-400">Self-Calibrating Learning Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Root Cause Accuracy & Calibration</h1>
          <p className="text-slate-300 text-sm mt-1">
            Continuous verification against analyst verdicts with automated weight adjustment recommendations.
          </p>
        </div>

        {/* Global Accuracy Metric */}
        <div className="bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/10 text-right">
          <div className="text-xs text-slate-300 uppercase font-semibold">Overall Engine Accuracy</div>
          <div className="text-2xl font-bold text-emerald-400">
            {(stats.overall_accuracy * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Accuracy Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Logged Reviews</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total_feedback}</div>
          <div className="text-xs text-slate-400 mt-1">Across all business units</div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs text-slate-500 font-semibold uppercase">Confirmed Attributions</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.confirmed}</div>
          <div className="text-xs text-slate-400 mt-1">Analyst confirmed top driver</div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs text-slate-500 font-semibold uppercase">Rejected / Corrected</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.rejected + stats.corrected}</div>
          <div className="text-xs text-slate-400 mt-1">Feedback triggers weight updates</div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs text-slate-500 font-semibold uppercase">Average Severity</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.avg_severity || 4.0} / 5.0</div>
          <div className="text-xs text-slate-400 mt-1">Analyst business impact rating</div>
        </div>
      </div>

      {/* Main Grid: Chart + Automated Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Accuracy Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Per-Driver Confirmation Accuracy</h2>
              <p className="text-xs text-slate-500">Historical percentage of cases where analyst verified system's top driver</p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg">
              Historical Track Record
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Bar dataKey="accuracy" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={22}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.accuracy >= 80 ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Automated Weight Suggestions (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-900/50 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              <h2 className="text-base font-bold">Feedback-Driven Weight Calibration</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When driver accuracy consistently surpasses 80%, the engine proposes weight reinforcement in the root-cause matrix.
            </p>

            {Object.keys(weightSuggestions).length > 0 ? (
              <div className="space-y-2.5 pt-2">
                {Object.entries(weightSuggestions).map(([drv, sug], idx) => (
                  <div key={idx} className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{drv}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {sug.suggestion}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{sug.reason}</p>
                    <div className="text-[10px] text-slate-400 font-mono pt-1">
                      Accuracy: {(sug.current_accuracy * 100).toFixed(0)}% • Reviews: {sug.total_feedback}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 text-xs text-slate-400 text-center">
                Collecting additional review samples before suggesting automated weight rebalancing.
              </div>
            )}
          </div>

          <button
            onClick={() => setAppliedSuggestions(true)}
            disabled={appliedSuggestions}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
              appliedSuggestions 
                ? 'bg-emerald-600 text-white cursor-default' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {appliedSuggestions ? (
              <>
                <CheckCircle2 size={14} /> Calibration Weights Synchronized
              </>
            ) : (
              <>
                <Sliders size={14} /> Apply Calibration Weights
              </>
            )}
          </button>
        </div>

      </div>

      {/* Historical Feedback Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-base">Driver Accuracy Summary</h3>
          <span className="text-xs text-slate-500">Live Calibration Log</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Candidate Driver</th>
                <th className="px-6 py-4">Total Reviews</th>
                <th className="px-6 py-4">Confirmed</th>
                <th className="px-6 py-4">Accuracy %</th>
                <th className="px-6 py-4">Calibration Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(perDriver).map(([driver, s], i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{driver}</td>
                  <td className="px-6 py-4">{s.total}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">{s.confirmed}</td>
                  <td className="px-6 py-4 font-mono font-bold">
                    {s.accuracy !== null ? `${(s.accuracy * 100).toFixed(0)}%` : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      (s.accuracy || 1.0) >= 0.8 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {(s.accuracy || 1.0) >= 0.8 ? 'Well Calibrated' : 'Needs Tuning'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
