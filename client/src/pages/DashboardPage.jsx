import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../hooks/useTelemetry.js';
import { useSocket } from '../context/SocketContext.jsx';
import { alertService } from '../services/alertService.js';
import { DeviceList } from '../components/dashboard/DeviceList.jsx';
import { LiveChart } from '../components/dashboard/LiveChart.jsx';
import { AlertFeed } from '../components/dashboard/AlertFeed.jsx';
import { Activity, ShieldCheck, Cpu, Flame } from 'lucide-react';

export function DashboardPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState('TURBINE_001');
  const [alerts, setAlerts] = useState([]);
  const { dataPoints, currentReading, devices } = useTelemetry(selectedDeviceId, 30);
  const { socket } = useSocket();

  // Load initial alerts
  useEffect(() => {
    async function loadAlerts() {
      try {
        const list = await alertService.getAlerts(20);
        setAlerts(list);
      } catch (err) {
        console.warn('Failed to fetch initial alerts:', err.message);
      }
    }
    loadAlerts();
  }, []);

  // Listen to new live alerts via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    };

    socket.on('alert:new', handleNewAlert);

    return () => {
      socket.off('alert:new', handleNewAlert);
    };
  }, [socket]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner & KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Monitored Equipment</p>
            <p className="text-xl font-bold font-mono text-white">{devices.length || 4} Units</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Pipeline Status</p>
            <p className="text-xl font-bold text-emerald-400">Active (RxJS)</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Alerts Triggered</p>
            <p className="text-xl font-bold font-mono text-red-400">{alerts.length}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Compiler Security</p>
            <p className="text-xl font-bold text-purple-400">Zero-Eval Safe</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Chart + Alert Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LiveChart
            dataPoints={dataPoints}
            currentReading={currentReading}
            deviceId={selectedDeviceId}
            threshold={80}
          />
          <DeviceList
            devices={devices}
            activeDeviceId={selectedDeviceId}
            onSelectDevice={(id) => setSelectedDeviceId(id)}
          />
        </div>

        <div className="lg:col-span-1">
          <AlertFeed alerts={alerts} />
        </div>
      </div>
    </div>
  );
}
