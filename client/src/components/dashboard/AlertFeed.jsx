import React from 'react';
import { BellRing, ShieldAlert, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AlertFeed({ alerts = [] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-red-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Alert Stream</h3>
        </div>
        <Link to="/history" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
          View All &rarr;
        </Link>
      </div>

      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[360px] pr-1">
        {alerts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-slate-500">
            <ShieldAlert className="w-6 h-6 mb-1 text-slate-600" />
            <p className="text-xs">No alerts triggered yet</p>
            <p className="text-[11px] text-slate-600">Simulate a temperature spike to test live alerts</p>
          </div>
        ) : (
          alerts.slice(0, 10).map((alert) => {
            const time = new Date(alert.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={alert.id || alert._id}
                className="p-2.5 rounded-lg border border-red-900/40 bg-red-950/20 text-xs transition-all hover:border-red-700/60"
              >
                <div className="flex items-center justify-between font-semibold text-red-300 mb-1">
                  <span>{alert.deviceId}</span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400 font-normal">
                    <Clock className="w-3 h-3" />
                    {time}
                  </span>
                </div>
                <p className="text-slate-300 font-medium text-[11px]">{alert.message}</p>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Workflow: {alert.workflowName || alert.workflowId}</span>
                  <span className="bg-red-900/60 text-red-200 px-1.5 py-0.5 rounded">
                    Val: {alert.value}°C
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
