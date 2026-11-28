
import React from 'react';

import {
  BellRing,
  ShieldAlert,
  Clock,
  AlertTriangle,
} from 'lucide-react';

import { Link } from 'react-router-dom';

export function AlertFeed({ alerts = [] }) {
  const visibleAlerts = alerts.slice(0, 10);

  const formatTime = (dateValue) => {
    if (!dateValue) return 'Time unavailable';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return 'Time unavailable';
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">

        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-red-400" />

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Live Alert Stream
          </h3>
        </div>

        <Link
          to="/history"
          className="text-xs text-blue-400 hover:text-blue-300 font-medium"
        >
          View All →
        </Link>

      </div>

      {/* Alert List */}
      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[360px] pr-1">

        {visibleAlerts.length === 0 ? (

          <div className="h-40 flex flex-col items-center justify-center text-center text-slate-500">

            <ShieldAlert className="w-6 h-6 mb-1 text-slate-600" />

            <p className="text-xs">
              No alerts triggered yet
            </p>

            <p className="text-[11px] text-slate-600 mt-1">
              Alerts will appear here when a configured rule is triggered.
            </p>

          </div>

        ) : (

          visibleAlerts.map((alert, index) => {
            const alertId = alert.id || alert._id || `${alert.deviceId}-${index}`;

            const time = formatTime(
              alert.createdAt || alert.timestamp
            );

            const deviceName =
              alert.deviceId || 'Unknown Device';

            const message =
              alert.message || 'An alert was triggered';

            const workflow =
              alert.workflowName || alert.workflowId || 'N/A';

            const value =
              alert.value ?? alert.temperature;

            const unit =
              alert.unit ||
              (alert.metric === 'pressure'
                ? 'PSI'
                : alert.metric === 'humidity'
                  ? '%'
                  : '°C');

            return (
              <div
                key={alertId}
                className="p-2.5 rounded-lg border border-red-900/40 bg-red-950/20 text-xs transition-all hover:border-red-700/60"
              >

                {/* Device and Time */}
                <div className="flex items-center justify-between gap-2 font-semibold text-red-300 mb-1">

                  <span className="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />

                    <span className="truncate">
                      {deviceName}
                    </span>
                  </span>

                  <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400 font-normal shrink-0">
                    <Clock className="w-3 h-3" />
                    {time}
                  </span>

                </div>

                {/* Alert Message */}
                <p className="text-slate-300 font-medium text-[11px]">
                  {message}
                </p>

                {/* Alert Details */}
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">

                  <span className="truncate">
                    Workflow: {workflow}
                  </span>

                  {value != null && (
                    <span className="bg-red-900/60 text-red-200 px-1.5 py-0.5 rounded shrink-0">
                      Value: {value} {unit}
                    </span>
                  )}

                </div>

              </div>
            );
          })

        )}

      </div>
    </div>
  );
}
