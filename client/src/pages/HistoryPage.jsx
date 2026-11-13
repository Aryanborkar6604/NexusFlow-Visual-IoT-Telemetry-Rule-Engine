import React, { useState, useEffect } from 'react';
import { alertService } from '../../src/services/alertService.js';
import { useSocket } from '../context/SocketContext.jsx';
import { Bell, Flame, Clock, RefreshCw } from 'lucide-react';

export function HistoryPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertService.getAlerts(100);
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alert history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Listen to new alerts real-time
  useEffect(() => {
    if (!socket) return;
    const handleNew = (alt) => {
      setAlerts((prev) => [alt, ...prev]);
    };
    socket.on('alert:new', handleNew);
    return () => socket.off('alert:new', handleNew);
  }, [socket]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Alert Trigger &amp; Execution History</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Audit log of all condition violations and SMS action dispatches</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md font-medium border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Workflow</th>
                <th className="py-3 px-4">Triggered Node</th>
                <th className="py-3 px-4">Trigger Value</th>
                <th className="py-3 px-4">Action Message</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No alert history recorded yet. Simulate an anomaly spike to see events populate.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id || alert._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-400">{alert.deviceId}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{alert.workflowName || alert.workflowId}</td>
                    <td className="py-3 px-4 text-amber-400">{alert.triggeredNodeId}</td>
                    <td className="py-3 px-4">
                      <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold">
                        {alert.value}°C
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate" title={alert.message}>
                      {alert.message}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold">
                        {alert.status || 'fired'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
