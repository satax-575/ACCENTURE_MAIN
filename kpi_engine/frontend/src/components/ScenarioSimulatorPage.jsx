import { useState, useEffect } from 'react';
import { simulateScenario } from '../api/client';
import { 
  Sliders, TrendingUp, DollarSign, Activity, 
  RotateCcw, Sparkles, ShieldCheck, ArrowRight, BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';

export default function ScenarioSimulatorPage() {
  const [priceChange, setPriceChange] = useState(0); // -20% to +20%
  const [currentErrorRate, setCurrentErrorRate] = useState(12.4);
  const [targetErrorRate, setTargetErrorRate] = useState(0.8);
  const [marketingDelta, setMarketingDelta] = useState(0); // -$5000 to +$5000
  const [baselineRevenue, setBaselineRevenue] = useState(28450);

  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = () => {
    setLoading(true);
    simulateScenario({
      baseline_revenue: baselineRevenue,
      price_change_pct: parseFloat(priceChange),
      checkout_error_pct: parseFloat(currentErrorRate),
      target_checkout_error_pct: parseFloat(targetErrorRate),
      marketing_spend_delta: parseFloat(marketingDelta)
    })
      .then(setSimulationResult)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runSimulation();
  }, [priceChange, targetErrorRate, marketingDelta]);

  const handleReset = () => {
    setPriceChange(0);
    setTargetErrorRate(0.8);
    setMarketingDelta(0);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <Sliders size={12} /> What-If Business Sandbox
            </span>
            <span className="text-xs text-slate-400">Deterministic Elasticity Model</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Executive Scenario & P&L Simulator</h1>
          <p className="text-slate-300 text-sm mt-1">
            Simulate operational levers, pricing decisions, and error resolution to project revenue recovery and ROI.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 flex items-center gap-1.5 transition-all"
        >
          <RotateCcw size={13} /> Reset Levers
        </button>
      </div>

      {/* Main Grid: Control Sliders (5 Cols) + Projected P&L Output (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Interactive Sliders (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sliders size={16} className="text-indigo-600" /> Operational & Pricing Levers
          </h2>

          {/* Lever 1: Checkout Error Resolution */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700">Target Checkout Error Rate:</span>
              <span className="text-indigo-600 font-mono">{targetErrorRate}% (Current: 12.4%)</span>
            </div>
            <input 
              type="range"
              min="0.2"
              max="12.4"
              step="0.2"
              value={targetErrorRate}
              onChange={(e) => setTargetErrorRate(e.target.value)}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.2% (Full Fix)</span>
              <span>12.4% (No Action)</span>
            </div>
          </div>

          {/* Lever 2: Pricing Adjustment */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700">Price Adjustment (%):</span>
              <span className={`font-mono ${priceChange > 0 ? 'text-emerald-600' : priceChange < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                {priceChange > 0 ? '+' : ''}{priceChange}%
              </span>
            </div>
            <input 
              type="range"
              min="-15"
              max="15"
              step="1"
              value={priceChange}
              onChange={(e) => setPriceChange(e.target.value)}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>-15% (Discount)</span>
              <span>+15% (Premium)</span>
            </div>
          </div>

          {/* Lever 3: Marketing Spend Delta */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700">Marketing Spend Adjustment:</span>
              <span className="text-purple-600 font-mono">{marketingDelta > 0 ? '+' : ''}${marketingDelta}/wk</span>
            </div>
            <input 
              type="range"
              min="-3000"
              max="3000"
              step="250"
              value={marketingDelta}
              onChange={(e) => setMarketingDelta(e.target.value)}
              className="w-full accent-purple-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>-$3,000</span>
              <span>+$3,000</span>
            </div>
          </div>

          {/* Lever Rationale Note */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-500" /> Grounded Elasticity Assumptions
            </div>
            <p className="text-[11px] leading-relaxed">
              Based on historical telemetry: 1% checkout error recovery restores ~0.95% lost cart volume. Marketing spend exhibits an elasticity of ~3.2% volume per $1,000 weekly budget.
            </p>
          </div>
        </div>

        {/* Right Projected P&L Output (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Projected KPI Scorecards */}
          {simulationResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase">Projected Weekly Revenue</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  ${simulationResult.projected_revenue?.toLocaleString()}
                </div>
                <div className={`text-xs font-bold mt-1 ${simulationResult.net_revenue_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {simulationResult.net_revenue_delta >= 0 ? '+' : ''}${simulationResult.net_revenue_delta?.toLocaleString()}/wk
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase">Annualized Impact</div>
                <div className={`text-2xl font-bold mt-1 ${simulationResult.annualized_recovery >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {simulationResult.annualized_recovery >= 0 ? '+' : ''}${simulationResult.annualized_recovery?.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">52-week run-rate ROI</div>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase">Net Volume Growth</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">
                  {simulationResult.volume_impact_pct > 0 ? '+' : ''}{simulationResult.volume_impact_pct}%
                </div>
                <div className="text-xs text-slate-400 mt-1">Restored order flow</div>
              </div>
            </div>
          )}

          {/* Waterfall Projection Bar Chart */}
          {simulationResult && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Projected Financial Waterfall Bridge</h3>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Net Delta: {simulationResult.net_revenue_delta >= 0 ? '+' : ''}${simulationResult.net_revenue_delta}
                </span>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={simulationResult.waterfall_projection} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val) => `$${Number(val).toLocaleString()}`} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {simulationResult.waterfall_projection?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? '#64748b' : index === 4 ? '#4f46e5' : entry.value >= 0 ? '#10b981' : '#f43f5e'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
