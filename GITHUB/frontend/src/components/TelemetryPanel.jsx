import React from 'react';
import MethodBadge from './MethodBadge';

export default function TelemetryPanel({ telemetry }) {
  if (!telemetry || !telemetry.stages) return null;

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 p-3 rounded-lg">
        <div>
          <span className="block text-xs text-slate-500 uppercase">Total Latency</span>
          <span className="font-semibold text-slate-800">{telemetry.total_latency_ms} ms</span>
        </div>
        <div>
          <span className="block text-xs text-slate-500 uppercase">Est. Cost</span>
          <span className="font-semibold text-slate-800">${telemetry.estimated_cost_usd}</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {telemetry.stages.map((stage, i) => (
          <div key={i} className="flex justify-between items-center text-slate-600 border-b border-slate-100 pb-2 last:border-0">
            <div className="flex items-center gap-2">
              <span className="w-20 capitalize text-xs font-medium">{stage.stage}</span>
              <MethodBadge method={stage.method} />
            </div>
            <span className="text-xs font-mono">{stage.latency_ms}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
