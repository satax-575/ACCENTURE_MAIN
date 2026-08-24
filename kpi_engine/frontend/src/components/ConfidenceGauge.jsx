import { CheckCircle, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';

export default function ConfidenceGauge({ confidence }) {
  if (!confidence) return null;

  let Icon = HelpCircle;
  let colorClass = "text-slate-400";
  let bgClass = "bg-slate-50";

  switch (confidence.level) {
    case 'HIGH':
      Icon = CheckCircle;
      colorClass = "text-emerald-500";
      bgClass = "bg-emerald-50 border-emerald-200";
      break;
    case 'MODERATE':
      Icon = AlertTriangle;
      colorClass = "text-amber-500";
      bgClass = "bg-amber-50 border-amber-200";
      break;
    case 'LOW':
      Icon = HelpCircle;
      colorClass = "text-slate-400";
      bgClass = "bg-slate-50 border-slate-200";
      break;
    case 'ABSTAIN':
      Icon = XCircle;
      colorClass = "text-rose-500";
      bgClass = "bg-rose-50 border-rose-200";
      break;
    default:
      break;
  }

  return (
    <div className="flex flex-col items-center">
      <div className={`p-4 rounded-full mb-4 border ${bgClass}`}>
        <Icon size={48} className={colorClass} />
      </div>
      <h3 className={`text-xl font-bold mb-2 ${colorClass}`}>{confidence.level} CONFIDENCE</h3>
      <p className="text-sm text-slate-600 text-center max-w-xs">{confidence.reason}</p>
      
      {confidence.contradictions && confidence.contradictions.length > 0 && (
        <div className="mt-4 text-xs text-rose-600 bg-rose-50 p-2 rounded w-full text-left">
          <strong>Contradictions:</strong>
          <ul className="list-disc pl-4 mt-1">
            {confidence.contradictions.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
