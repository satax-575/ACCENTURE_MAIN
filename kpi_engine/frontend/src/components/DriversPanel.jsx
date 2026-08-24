import React from 'react';

export default function DriversPanel({ drivers }) {
  if (!drivers || drivers.length === 0) return <p className="text-slate-500 italic">No drivers identified.</p>;

  return (
    <div className="space-y-4">
      {drivers.map((driver, idx) => {
        let barColor = "bg-slate-300";
        if (driver.confidence === 'HIGH') barColor = "bg-indigo-600";
        else if (driver.confidence === 'MODERATE') barColor = "bg-amber-500";

        return (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-800">{driver.driver}</span>
              <span className="text-slate-600 font-semibold">{driver.contribution_pct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${driver.contribution_pct}%` }}></div>
            </div>
            <div className="text-xs text-slate-500 flex justify-between">
              <span>Change: {driver.pct_change}%</span>
              <span>Onset: {driver.onset}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
