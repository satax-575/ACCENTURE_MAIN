import { useState, useEffect } from 'react';
import { getSparseHistory } from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell 
} from 'recharts';
import { 
  Rocket, AlertTriangle, ShieldCheck, CheckCircle2, 
  Clock, TrendingDown, Info, ArrowRight, HelpCircle
} from 'lucide-react';
import ConfidenceGauge from './ConfidenceGauge';

export default function SparseHistoryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSparseHistory('New Product X', 'East Region')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center space-x-3">
        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-600 font-medium">Evaluating Sparse-History Launch Metrics...</span>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-slate-500">No sparse history case found.</div>;

  const chartData = [
    {
      name: 'Daily Run Rate',
      Actual: data.actual_orders_per_day,
      Benchmark: data.cohort_benchmark_orders_per_day
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <Rocket size={12} /> Sparse-History Subsystem
            </span>
            <span className="text-xs text-slate-400">&lt; 14-Day Statistical Baseline Handling</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {data.product} — Launch Cohort Benchmark
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Evaluating early-stage product performance against cohort benchmarks rather than trailing baselines.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/10 text-right">
          <div className="text-xs text-slate-300 uppercase font-semibold">Days Active</div>
          <div className="text-2xl font-bold text-amber-400">{data.days_live} Days</div>
        </div>
      </div>

      {/* Sparse History Advisory Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 p-5 rounded-3xl flex items-start gap-3.5 text-indigo-950 shadow-xs">
        <div className="p-2 bg-indigo-600 text-white rounded-2xl shrink-0 mt-0.5">
          <Info size={20} />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-sm">Automated Sparse History Guardrail</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Entities with fewer than 14 days of historical data cannot support standard rolling z-score volatility baselines. 
            The engine automatically switches to <strong>Cohort Benchmark Mode</strong> and caps analytical confidence at <strong>MODERATE</strong> to prevent premature executive overreactions.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Visual Analytics (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Launch Narrative & Status Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
                {data.pct_vs_benchmark}% vs. Launch Benchmark
              </span>
              <span className="text-xs text-slate-500 font-medium">Launched on {data.launch_date}</span>
            </div>

            <p className="text-base text-slate-800 font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed">
              {data.narrative}
            </p>

            {/* Run Rate Bar Chart */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Actual Orders/Day vs. Cohort Standard</h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(val) => `${val} orders/day`} />
                    <Legend />
                    <Bar dataKey="Actual" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Actual Run Rate" />
                    <Bar dataKey="Benchmark" fill="#94a3b8" radius={[6, 6, 0, 0]} name="Comparable Launch Cohort Standard" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recommended Operational Action */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} className="text-indigo-600" /> Prescribed Governance Action
            </h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 text-sm leading-relaxed font-medium">
              {data.action}
            </div>
          </div>

        </div>

        {/* Right Info Cards (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Confidence Scorecard */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 self-start">
              Confidence Assessment
            </h3>
            <ConfidenceGauge confidence={data.confidence} />
          </div>

          {/* Launch Metrics Breakdown */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Launch Diagnostic
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500">Days Live:</span>
                <span className="font-bold text-slate-800">{data.days_live} / 14 required</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500">Actual Run Rate:</span>
                <span className="font-bold text-rose-600">{data.actual_orders_per_day} orders/day</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500">Cohort Benchmark:</span>
                <span className="font-bold text-slate-800">{data.cohort_benchmark_orders_per_day} orders/day</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500">Benchmark Gap:</span>
                <span className="font-bold text-rose-600">{data.pct_vs_benchmark}%</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
