import { useState } from 'react';
import { createCustomKPI } from '../api/client';
import { 
  X, Plus, ShieldCheck, CheckCircle2, Sparkles, 
  Layers, Database, Sliders, Loader2
} from 'lucide-react';

export default function CustomKpiModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [formula, setFormula] = useState('');
  const [owner, setOwner] = useState('VP Product');
  const [threshold, setThreshold] = useState(5.0);
  const [weight, setWeight] = useState(0.8);
  const [drivers, setDrivers] = useState('Checkout Error Rate, Marketing Spend');
  const [loading, setLoading] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !formula.trim()) return;
    setLoading(true);
    try {
      const driverList = drivers.split(',').map(d => d.trim()).filter(Boolean);
      const res = await createCustomKPI({
        kpi_name: name,
        formula,
        owner,
        threshold_pct: parseFloat(threshold),
        business_weight: parseFloat(weight),
        drivers: driverList
      });
      setCreatedResult(res);
      if (onCreated) onCreated(res.kpi);
    } catch (err) {
      alert('Failed to register KPI: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h2 className="text-base font-bold">Semantic KPI & Metric Studio</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {createdResult ? (
            <div className="space-y-4">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-emerald-900 text-sm">{createdResult.message}</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Arithmetic contract bound to DAG topology with business weight {createdResult.kpi?.business_weight}.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl text-xs font-mono">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Generated Semantic Contract</div>
                <pre className="text-indigo-300 whitespace-pre-wrap">{JSON.stringify(createdResult.kpi, null, 2)}</pre>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={onClose} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">
                  Close & View Graph
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">KPI Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Net ARR Expansion, Customer Churn Rate"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Arithmetic Formula</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Active Subscribers * Average ARPU - Churn Loss"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Assigned Owner</label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Materiality Threshold (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Connected Upstream Drivers (Comma-separated)</label>
                <input
                  type="text"
                  value={drivers}
                  onChange={(e) => setDrivers(e.target.value)}
                  placeholder="Driver 1, Driver 2, Driver 3"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Register KPI in Ontology</span>
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
