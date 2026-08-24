import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, AlertCircle } from 'lucide-react';

export default function KpiCard({ data }) {
  const isNegative = data.pct_change < 0;
  const isAlert = data.status === 'alert';
  const isWarning = data.status === 'warning';
  
  let statusClasses = "border-l-4 border-emerald-500";
  if (isAlert) statusClasses = "border-l-4 border-rose-500 bg-rose-50/30";
  else if (isWarning) statusClasses = "border-l-4 border-amber-500 bg-amber-50/30";

  const content = (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer ${statusClasses}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">{data.kpi}</h3>
          <p className="text-sm text-slate-500">{data.region} • {data.week_start}</p>
        </div>
        {isAlert && <AlertCircle className="text-rose-500" size={20} />}
      </div>
      
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-slate-900">
          {typeof data.current_value === 'number' ? data.current_value.toLocaleString() : data.current_value}
        </span>
        <div className={`flex items-center gap-1 font-medium text-sm mb-1 ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}>
          {isNegative ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
          {Math.abs(data.pct_change)}%
        </div>
      </div>
    </div>
  );

  if (isAlert || isWarning) {
    return (
      <Link to={`/case/${encodeURIComponent(data.region)}/${encodeURIComponent(data.week_start)}?metric=${encodeURIComponent(data.kpi.toLowerCase())}`}>
        {content}
      </Link>
    );
  }

  return content;
}
