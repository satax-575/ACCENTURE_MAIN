import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldCheck, Zap, Sliders, ChevronRight, AlertTriangle, Target, Eye, EyeOff, Clock, User, TrendingUp } from 'lucide-react';
import DispatchActionModal from './DispatchActionModal';

export default function ActionPanel({ actions, confidenceLevel, caseData }) {
  const [selectedActionToDispatch, setSelectedActionToDispatch] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(0); // first action expanded by default

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
      {actions.map((act, idx) => {
        const isExpanded = expandedIdx === idx;
        return (
          <div
            key={idx}
            className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/70 hover:bg-slate-50 transition-all"
          >
            {/* Action header — always visible */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 flex-1">
                  {/* Driver → Lever chain */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 font-semibold">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                      Driver: {act.driver}
                    </span>
                    <ChevronRight size={10} />
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      Lever: {act.lever}
                    </span>
                  </div>

                  {/* Action text */}
                  <p className="font-semibold text-slate-800 text-xs leading-relaxed">{act.action}</p>
                </div>

                {/* Confidence + expand toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    act.confidence === 'HIGH'     ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                    act.confidence === 'MODERATE' ? 'bg-amber-100   text-amber-700   border-amber-200'   :
                    act.confidence === 'ABSTAIN'  ? 'bg-rose-100    text-rose-700    border-rose-200'    :
                                                    'bg-slate-100   text-slate-600   border-slate-200'
                  }`}>
                    {act.confidence}
                  </span>
                  {isExpanded ? <EyeOff size={13} className="text-slate-400" /> : <Eye size={13} className="text-slate-400" />}
                </div>
              </div>
            </div>

            {/* Expanded detail — full driver→lever→action→impact→owner→monitoring structure */}
            {isExpanded && (
              <div className="border-t border-slate-200/60 bg-white px-4 pb-4 pt-3 space-y-3">
                {/* Structured action grid */}
                <div className="grid grid-cols-2 gap-2">
                  <StructuredField icon={<TrendingUp size={10} />} label="Expected Impact" value={act.expected_impact} highlight />
                  <StructuredField icon={<User size={10} />} label="Owner" value={act.owner} />
                  <StructuredField icon={<Clock size={10} />} label="Monitoring Plan" value={act.monitoring || act.monitoring_plan || 'Track KPI daily'} />
                  <StructuredField icon={<Target size={10} />} label="Confidence" value={act.confidence} />
                </div>

                {/* Constraint warnings */}
                {act.constraints?.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                    {act.constraints.map((c, ci) => (
                      <div key={ci} className="text-[10px] text-orange-700 font-medium flex items-center gap-1.5">
                        <AlertTriangle size={10} /> {c}
                      </div>
                    ))}
                  </div>
                )}

                {/* Decision rights & dispatch */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    {act.decision_rights?.can_approve ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        <ShieldCheck size={11} /> Authorized ({Object.keys(act.decision_rights.available_rights || {}).join(', ')})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                        <AlertTriangle size={11} /> Escalate Required
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedActionToDispatch(act); }}
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
            )}
          </div>
        );
      })}

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

function StructuredField({ icon, label, value, highlight }) {
  return (
    <div className={`rounded-xl px-3 py-2 space-y-0.5 ${highlight ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50 border border-slate-100'}`}>
      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className={`text-[11px] font-semibold ${highlight ? 'text-indigo-800' : 'text-slate-700'}`}>{value}</div>
    </div>
  );
}
