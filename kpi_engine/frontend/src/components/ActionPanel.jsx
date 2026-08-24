import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldCheck, Zap, Sliders, ChevronRight, AlertTriangle } from 'lucide-react';
import DispatchActionModal from './DispatchActionModal';

export default function ActionPanel({ actions, confidenceLevel, caseData }) {
  const [selectedActionToDispatch, setSelectedActionToDispatch] = useState(null);

  if (confidenceLevel === 'ABSTAIN') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs leading-relaxed">
        <strong>Engine Abstaining:</strong> No operational actions recommended until data feeds are reconciled.
      </div>
    );
  }

  if (!actions || actions.length === 0) {
    return <p className="text-slate-500 italic text-xs">No actions recommended.</p>;
  }

  return (
    <div className="space-y-3">
      {actions.map((act, idx) => (
        <div key={idx} className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/70 hover:bg-slate-50 transition-all space-y-3">
          <div className="flex justify-between items-start">
            <span className="font-bold text-xs text-slate-900">{act.driver}</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
              {act.owner}
            </span>
          </div>

          <div className="text-xs space-y-1">
            <p className="font-semibold text-slate-800 text-xs">{act.action}</p>
            <p className="text-[11px] text-slate-500">
              Expected Impact: <span className="font-semibold text-slate-700">{act.expected_impact}</span>
            </p>
          </div>

          {/* Real-world Operational Decision & Dispatch Rights */}
          <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1.5">
              {act.decision_rights?.can_approve ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <ShieldCheck size={11} /> Authorized ({Object.keys(act.decision_rights.available_rights).join(', ')})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                  <AlertTriangle size={11} /> Escalate (No rights)
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedActionToDispatch(act)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                act.decision_rights?.can_approve
                  ? 'bg-slate-900 hover:bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700'
              }`}
            >
              <Zap size={12} className={act.decision_rights?.can_approve ? 'text-amber-400' : 'text-slate-400'} />
              <span>{act.decision_rights?.can_approve ? 'Execute via Slack/Jira' : 'File Escalation Draft'}</span>
            </button>
          </div>
        </div>
      ))}

      {/* Dispatch Action Modal */}
      {selectedActionToDispatch && (
        <DispatchActionModal
          action={selectedActionToDispatch}
          caseData={caseData}
          onClose={() => setSelectedActionToDispatch(null)}
        />
      )}
    </div>
  );
}
