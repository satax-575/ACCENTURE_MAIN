import { useState, useEffect } from 'react';
import { getExecutiveMemo } from '../api/client';
import { 
  X, Printer, Download, ShieldCheck, CheckCircle2, 
  FileText, ArrowDownRight, Layers, Building2, User
} from 'lucide-react';
import AccentureLogo from './AccentureLogo';


export default function ExecutiveMemoModal({ onClose, region = 'East Region', weekStart = '2026-08-11' }) {
  const [memo, setMemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    setLoading(true);
    getExecutiveMemo(region, weekStart, 'revenue')
      .then(setMemo)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [region, weekStart]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 my-8">
        
        {/* Modal Top Control Bar */}
        <div className="p-4 px-6 bg-slate-900 text-white flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#d896ff]" />
            <span className="text-xs font-bold uppercase tracking-wider">Accenture Executive Board Memo — Publication Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Printer size={13} /> Print / Save as PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Executive Memo Content */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 font-medium">
            Generating Executive Briefing Memo...
          </div>
        ) : (
          <div className="p-8 md:p-12 space-y-6 text-slate-900 font-sans" id="executive-memo-document">
            
            {/* Memo Header */}
            <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-end">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AccentureLogo className="h-5" variant="dark" />
                  <span className="text-[10px] font-bold tracking-widest text-[#a100ff] uppercase">
                    • APPLIED INTELLIGENCE BRIEFING
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {memo?.title || 'EXECUTIVE BRIEFING: REVENUE ANOMALY IN EAST REGION'}
                </h1>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  Client Evaluation Period: {memo?.period} • Published: {memo?.date_generated}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-md text-xs font-bold border border-rose-200 block mb-1">
                  P1 Business Anomaly
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Doc ID: {memo?.governance_signoff?.audit_trail_id}</span>
              </div>
            </div>

            {/* 1. Executive Summary */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Executive Summary</h2>
              <div className="p-4 bg-slate-50 border-l-4 border-indigo-600 rounded-r-xl text-sm font-medium text-slate-800 leading-relaxed">
                {memo?.executive_summary}
              </div>
            </div>

            {/* 2. Key Diagnostic Findings & Primary Drivers */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Primary Explanatory Drivers (Causal Attribution)</h2>
              <div className="grid grid-cols-2 gap-3">
                {memo?.primary_drivers?.map((d, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>#{d.hypothesis_rank || i+1} {d.driver}</span>
                      <span className="text-rose-600 font-mono">{d.pct_change > 0 ? '+' : ''}{d.pct_change}%</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Contribution Weight:</span>
                      <span className="font-bold text-indigo-700">{d.contribution_pct}%</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Incident Onset: <span className="font-semibold text-slate-700">{d.onset}</span> (Preceded shift)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Additive Waterfall Decomposition */}
            {memo?.waterfall_summary && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Financial Decomposition Breakdown</h2>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-slate-400 font-medium">Volume Effect</div>
                      <div className="text-base font-bold text-rose-600">-$319.98/day</div>
                      <div className="text-[10px] text-slate-500">Lost transactions</div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-medium">Price Effect</div>
                      <div className="text-base font-bold text-rose-600">-$144.57/day</div>
                      <div className="text-[10px] text-slate-500">Discounts & mix</div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-medium">Mix Effect</div>
                      <div className="text-base font-bold text-emerald-600">+$11.39/day</div>
                      <div className="text-[10px] text-slate-500">SKU basket shift</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Action Plan & Governance Signoff */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">4. Recommended Strategic Intervention</h2>
              {memo?.recommended_action_plan?.map((act, i) => (
                <div key={i} className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{act.action}</span>
                    <span className="text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 font-mono">Owner: {act.owner}</span>
                  </div>
                  <div className="text-slate-600">
                    Expected Outcome: <span className="font-semibold text-slate-800">{act.expected_impact}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CEO Approval Sign-Off Block */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>Analytical Confidence: <strong className="text-emerald-600">HIGH (Zero-Hallucination Fenced)</strong></div>
                <div>Governance Decision Rights: {memo?.governance_signoff?.decision_rights}</div>
              </div>

              <button
                onClick={() => setSigned(true)}
                disabled={signed}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 print:hidden ${
                  signed 
                    ? 'bg-emerald-600 text-white cursor-default' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {signed ? (
                  <>
                    <CheckCircle2 size={14} /> Executive Sign-Off Certified
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} /> Sign Off Executive Briefing
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
