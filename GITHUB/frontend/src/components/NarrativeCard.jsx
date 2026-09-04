import { Brain, FileCode2, AlertOctagon } from 'lucide-react';

const CONF_STYLES = {
  HIGH:     { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  MODERATE: { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'  },
  LOW:      { bg: 'bg-rose-50',     text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500'   },
  ABSTAIN:  { bg: 'bg-yellow-50',   text: 'text-yellow-700',  border: 'border-yellow-200',  dot: 'bg-yellow-500' },
  'N/A':    { bg: 'bg-slate-50',    text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-400'  },
};

/**
 * Renders the AI-generated or template narrative with proper formatting.
 * Supports markdown-style bold (**text**) and line breaks.
 */
function renderNarrative(text) {
  if (!text) return null;
  return text
    .split('\n')
    .filter(line => line.trim() !== '')
    .map((line, i) => {
      // Bold **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-sm text-slate-700 leading-relaxed">
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      );
    });
}

export default function NarrativeCard({ narrative, confidence, method }) {
  if (!narrative) {
    return (
      <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-400 italic">
        No narrative generated.
      </div>
    );
  }

  const confKey = confidence?.level || 'N/A';
  const confStyle = CONF_STYLES[confKey] || CONF_STYLES['N/A'];
  const isAbstain = confKey === 'ABSTAIN';
  const isLlm = method === 'llm';

  return (
    <div className="space-y-3">
      {/* Method + Confidence badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${confStyle.bg} ${confStyle.text} ${confStyle.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${confStyle.dot}`} />
          Confidence: {confKey}
        </span>

        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
          isLlm
            ? 'bg-purple-50 text-purple-700 border-purple-200'
            : 'bg-slate-50 text-slate-600 border-slate-200'
        }`}>
          {isLlm
            ? <><Brain size={11} /> AI Narrative</>
            : <><FileCode2 size={11} /> Template Narrative</>
          }
        </span>
      </div>

      {/* Narrative text block */}
      <div className={`p-4 rounded-2xl border space-y-1.5 ${
        isAbstain
          ? 'bg-yellow-50/60 border-yellow-200'
          : 'bg-slate-50/80 border-slate-100'
      }`}>
        {isAbstain && (
          <div className="flex items-center gap-2 text-yellow-700 font-semibold text-xs mb-2">
            <AlertOctagon size={14} />
            Engine Abstention — Insufficient Evidence
          </div>
        )}
        {renderNarrative(narrative)}
      </div>

      {/* Confidence reason */}
      {confidence?.reason && (
        <p className="text-[11px] text-slate-400 italic px-1">
          Confidence rationale: {confidence.reason}
        </p>
      )}
    </div>
  );
}
