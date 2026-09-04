import { Cpu, Zap, Database, BarChart3, GitBranch, ShieldCheck, MessageSquare, RefreshCw, Clock } from 'lucide-react';

const METHOD_CONFIG = {
  deterministic: { label: 'Deterministic',  color: 'bg-sky-100 text-sky-700 border-sky-200',     dot: 'bg-sky-500'     },
  statistical:   { label: 'Statistical',    color: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  rule_based:    { label: 'Rule-Based',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  llm:           { label: 'LLM',           color: 'bg-amber-100 text-amber-700 border-amber-200',  dot: 'bg-amber-500'   },
  template:      { label: 'Template',      color: 'bg-slate-100 text-slate-600 border-slate-200',  dot: 'bg-slate-400'   },
};

const STEP_ICONS = [Database, GitBranch, BarChart3, BarChart3, BarChart3, BarChart3, ShieldCheck, Zap, MessageSquare, RefreshCw];

export default function PipelineMethodMap({ stages }) {
  if (!stages || stages.length === 0) return null;

  const llmStages   = stages.filter(s => s.method === 'llm').length;
  const totalCost   = stages.reduce((sum, s) => sum + (s.estimated_cost_usd || 0), 0);
  const totalLatency = stages.reduce((sum, s) => sum + (s.latency_ms || 0), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-indigo-500" />
          <span className="text-xs font-bold text-slate-800">Pipeline Method Map</span>
          <span className="text-[9px] text-slate-500 font-medium">LLM vs Non-LLM per stage</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          {totalLatency > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={10} /> {Math.round(totalLatency)}ms
            </span>
          )}
          <span className="font-bold text-amber-600">
            {llmStages} LLM {llmStages === 1 ? 'call' : 'calls'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[9px]">
        {Object.entries(METHOD_CONFIG).slice(0, 4).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <span className="text-slate-500">{cfg.label}</span>
          </span>
        ))}
      </div>

      {/* Stage rows */}
      <div className="space-y-1">
        {stages.map((stage) => {
          const cfg = METHOD_CONFIG[stage.method] || METHOD_CONFIG.deterministic;
          const Icon = STEP_ICONS[(stage.step - 1) % STEP_ICONS.length];
          return (
            <div
              key={stage.step}
              className="flex items-start gap-2.5 py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              {/* Step number */}
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 mt-0.5">
                {stage.step}
              </div>

              {/* Stage info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-800">{stage.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {stage.method === 'llm' && (
                    <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">
                      ⚡ AI
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{stage.description}</p>
              </div>

              {/* Latency / cost */}
              {stage.latency_ms != null && (
                <div className="flex-shrink-0 text-right text-[9px] text-slate-400 mt-0.5">
                  <div>{Math.round(stage.latency_ms)}ms</div>
                  {stage.estimated_cost_usd > 0 && (
                    <div className="text-amber-500">${stage.estimated_cost_usd.toFixed(4)}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Deterministic: {stages.filter(s => s.method === 'deterministic').length} stages
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> Statistical: {stages.filter(s => s.method === 'statistical').length} stages
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> LLM: {llmStages} {llmStages === 1 ? 'stage' : 'stages'}
        </span>
        {totalCost > 0 && (
          <span className="text-amber-600 font-semibold">Cost: ${totalCost.toFixed(4)}</span>
        )}
      </div>
    </div>
  );
}
