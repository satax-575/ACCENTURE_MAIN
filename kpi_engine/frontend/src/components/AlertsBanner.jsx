import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';

export default function AlertsBanner({ alert }) {
  if (!alert) return null;

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-rose-100 p-2 rounded-lg">
          <AlertTriangle className="text-rose-600" size={24} />
        </div>
        <div>
          <h3 className="text-rose-900 font-semibold">Priority Alert: {alert.kpi} in {alert.region}</h3>
          <p className="text-rose-700 text-sm">
            Dropped {alert.pct_change}% (Score: {alert.priority_score})
          </p>
        </div>
      </div>
      <Link 
        to={`/case/${encodeURIComponent(alert.region)}/${encodeURIComponent(alert.week_start)}?metric=${encodeURIComponent(alert.kpi.toLowerCase())}`}
        className="flex items-center gap-1 bg-white border border-rose-200 text-rose-700 px-4 py-2 rounded-lg font-medium hover:bg-rose-50 transition-colors"
      >
        View Details <ChevronRight size={16} />
      </Link>
    </div>
  );
}
