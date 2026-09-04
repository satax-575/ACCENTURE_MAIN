import React from 'react';

export default function MethodBadge({ method }) {
  let color = "bg-gray-100 text-gray-700 border-gray-200";
  let label = method;
  let icon = "";

  switch (method) {
    case 'deterministic':
      color = "bg-blue-50 text-blue-700 border-blue-200";
      label = "Deterministic";
      icon = "🔢";
      break;
    case 'statistical':
      color = "bg-purple-50 text-purple-700 border-purple-200";
      label = "Statistical";
      icon = "📊";
      break;
    case 'rule_based':
      color = "bg-slate-50 text-slate-700 border-slate-200";
      label = "Rule-based";
      icon = "📋";
      break;
    case 'llm':
      color = "bg-emerald-50 text-emerald-700 border-emerald-200";
      label = "LLM";
      icon = "🤖";
      break;
    case 'template':
      color = "bg-teal-50 text-teal-700 border-teal-200";
      label = "Template";
      icon = "📝";
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      <span>{icon}</span> {label}
    </span>
  );
}
