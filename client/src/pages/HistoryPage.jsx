import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { alertService } from '../services/alertService.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useMachines } from '../context/MachineContext.jsx';
import {
  Bell,
  Flame,
  RefreshCw,
  ExternalLink,
  Search,
  Download,
  Cpu,
  Activity,
  ShieldAlert,
  Clock,
} from 'lucide-react';

export function HistoryPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const { socket } = useSocket();
  const { setSelectedDeviceId, notifyToast } = useMachines();
  const navigate = useNavigate();

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

  const uniqueDevices = useMemo(() => {
    return Array.from(new Set(alerts.map((a) => a.deviceId).filter(Boolean)));
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (deviceFilter !== 'ALL' && a.deviceId !== deviceFilter) return false;
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        a.deviceId?.toLowerCase().includes(q) ||
        a.message?.toLowerCase().includes(q) ||
        a.workflowName?.toLowerCase().includes(q) ||
        a.workflowId?.toLowerCase().includes(q)
      );
    });
  }, [alerts, deviceFilter, searchTerm]);

  const stats = useMemo(() => {
    if (alerts.length === 0) {
      return { total: 0, peakTemp: '--', deviceCount: 0, latestTime: '--' };
    }
    const temps = alerts.map((a) => Number(a.value)).filter((n) => !isNaN(n));
    const peak = temps.length > 0 ? `${Math.max(...temps)}°C` : '--';
    const latest = alerts[0]?.createdAt
      ? new Date(alerts[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '--';
    return {
      total: alerts.length,
      peakTemp: peak,
      deviceCount: uniqueDevices.length,
      latestTime: latest,
    };
  }, [alerts, uniqueDevices.length]);

  const handleExportCsv = () => {
    if (filteredAlerts.length === 0) return;
    const header = ['Timestamp', 'Device', 'Workflow', 'Triggered Node', 'Value (°C)', 'Message', 'Status'];
    const rows = filteredAlerts.map((a) => [
      new Date(a.createdAt).toISOString(),
      a.deviceId || '',
      a.workflowName || a.workflowId || '',
      a.triggeredNodeId || '',
      a.value ?? '',
      `"${String(a.message || '').replace(/"/g, '""')}"`,
      a.status || 'fired',
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexusflow-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notifyToast({
      title: 'Audit Log Exported',
      message: `Saved ${filteredAlerts.length} alert record(s) to CSV.`,
      type: 'success',
    });
  };

  const handleInspectMachine = (deviceId) => {
    if (!deviceId) return;
    setSelectedDeviceId(deviceId);
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-red-950/30 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">
              Alert Trigger &amp; Execution Audit Log
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable timeline of threshold breaches, sentinel triggers, and SMS alert dispatches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredAlerts.length === 0}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl font-semibold border border-slate-700 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={fetchAlerts}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl font-bold shadow-lg shadow-blue-950/40 border border-blue-400/40 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
        </div>
      </div>

      {/* Audit KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Logged Alerts</span>
            <p className="text-2xl font-black font-mono text-white mt-1">{stats.total}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Peak Recorded Value</span>
            <p className="text-2xl font-black font-mono text-red-400 mt-1">{stats.peakTemp}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Machines Triggered</span>
            <p className="text-2xl font-black font-mono text-blue-400 mt-1">{stats.deviceCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Latest Trigger Time</span>
            <p className="text-xl font-black font-mono text-emerald-400 mt-1">{stats.latestTime}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Alerts Table */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search device ID, workflow, or alert message..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="device-filter" className="text-xs text-slate-400 font-medium">
              Device:
            </label>
            <select
              id="device-filter"
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Machines ({alerts.length})</option>
              {uniqueDevices.map((devId) => (
                <option key={devId} value={devId}>
                  {devId}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto nexus-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Device</th>
                <th className="py-3.5 px-4">Workflow</th>
                <th className="py-3.5 px-4">Triggered Node</th>
                <th className="py-3.5 px-4">Trigger Value</th>
                <th className="py-3.5 px-4">Action Message</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    {alerts.length === 0
                      ? 'No alert history recorded yet. Simulate an anomaly spike to see events populate.'
                      : 'No alerts match your current search or device filter.'}
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id || alert._id} className="hover:bg-slate-800/35 transition-colors">
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-400">{alert.deviceId}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{alert.workflowName || alert.workflowId}</td>
                    <td className="py-3 px-4 text-amber-400">{alert.triggeredNodeId}</td>
                    <td className="py-3 px-4">
                      <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-lg font-bold">
                        {alert.value}°C
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate" title={alert.message}>
                      {alert.message}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold">
                        {alert.status || 'fired'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3 font-sans">
                        <button
                          type="button"
                          onClick={() => handleInspectMachine(alert.deviceId)}
                          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                        >
                          <Activity className="w-3 h-3" />
                          Live Graph
                        </button>
                        <Link
                          to="/builder"
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          Canvas
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
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
