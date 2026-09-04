import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function EvidenceTrail({ freshness }) {
  if (!freshness) return null;

  return (
    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {Object.entries(freshness).map(([source, data], idx) => {
        let Icon = CheckCircle2;
        let iconColor = "text-emerald-500";
        let status = "Fresh";
        
        if (!data.present) {
          Icon = XCircle;
          iconColor = "text-slate-400";
          status = "Missing";
        } else if (data.stale) {
          Icon = Clock;
          iconColor = "text-rose-500";
          status = "Stale";
        }

        return (
          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
               <Icon size={14} className={iconColor} />
            </div>
            
            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-sm font-semibold text-slate-800 capitalize">{source.replace('_', ' ')}</h4>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                  status === 'Fresh' ? 'bg-emerald-100 text-emerald-700' :
                  status === 'Stale' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {status}
                </span>
              </div>
              {data.present && (
                <p className="text-xs text-slate-500">Last seen: {data.last_seen}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
