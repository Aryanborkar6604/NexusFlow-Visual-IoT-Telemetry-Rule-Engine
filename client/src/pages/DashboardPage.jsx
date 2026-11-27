import React, { useState } from 'react';
import { useTelemetry } from '../hooks/useTelemetry.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useMachines } from '../context/MachineContext.jsx';
import { alertService } from '../services/alertService.js';
import { unlockAlertAudio } from '../utils/alertSound.js';
import { DeviceList } from '../components/dashboard/DeviceList.jsx';
import { LiveChart } from '../components/dashboard/LiveChart.jsx';
import { AlertFeed } from '../components/dashboard/AlertFeed.jsx';
import { RunningMachinesPanel } from '../components/dashboard/RunningMachinesPanel.jsx';
import {
  ShieldCheck,
  Server,
  Flame,
  Gauge,
  Thermometer,
  PlaySquare,
  Square,
  Building2,
  SlidersHorizontal,
} from 'lucide-react';

export function DashboardPage() {
  const { selectedDeviceId, setSelectedDeviceId, toggleMenu, isMenuOpen, notifyToast, alerts } = useMachines();
  const [isSpiking, setIsSpiking] = useState(false);

  const {
    dataPoints,
    currentReading,
    devices,
    runningDevices,
    standbyDevices,
    capacity,
    fleetStats,
    capacityError,
    clearCapacityError,
    togglePower,
    bulkTogglePower,
  } = useTelemetry(selectedDeviceId, 30);
  const { isConnected } = useSocket();

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);
  const isSelectedOnline = selectedDevice ? selectedDevice.status === 'online' : true;

  const handleTogglePower = async (deviceId) => {
    await togglePower(deviceId);
  };

  const handleDemoSpike = async () => {
    setIsSpiking(true);
    await unlockAlertAudio();
    try {
      await alertService.triggerTestSpike(selectedDeviceId, 94.2);
      notifyToast({
        title: `Thermal Spike Injected (${selectedDeviceId})`,
        message: 'Simulated 94.2°C reading triggered threshold sentinel.',
        type: 'warning',
      });
    } catch (err) {
      console.warn('Spike trigger error:', err);
    } finally {
      setTimeout(() => setIsSpiking(false), 1200);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Executive Command Center Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-white tracking-tight">
                NexusFlow Industrial Plant 01
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950/80 text-blue-400 border border-blue-800/80">
                FACTORY_01
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isConnected ? 'CYBER-PHYSICAL SYNC ACTIVE' : 'RECONNECTING'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Zero-Eval RxJS Stream Engine • High-Performance Micro-Batch Ingestion • 1Hz Volatile Telemetry
            </p>
          </div>
        </div>

        {/* Global Quick Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={toggleMenu}
            title="Slide open quick machines ON/OFF menu bar"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
              isMenuOpen
                ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-950/50'
                : 'bg-blue-950/60 hover:bg-blue-600 text-blue-300 hover:text-white border-blue-700/70'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Machines Slide Menu</span>
          </button>

          <button
            onClick={() => bulkTogglePower && bulkTogglePower('start_all')}
            title="Start all factory equipment simultaneously"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 border border-emerald-400/50 transition-all active:scale-95 cursor-pointer"
          >
            <PlaySquare className="w-4 h-4" />
            <span>Start All Fleet</span>
          </button>

          <button
            onClick={() => bulkTogglePower && bulkTogglePower('stop_all')}
            title="Emergency Power Down all equipment to standby"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/80 transition-all active:scale-95 cursor-pointer"
          >
            <Square className="w-4 h-4 text-red-400" />
            <span>Emergency Standby</span>
          </button>

          <button
            onClick={handleDemoSpike}
            disabled={isSpiking}
            title="Simulate sudden overheat spike to test sentinel alerts"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 border border-amber-800/80 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{isSpiking ? 'Spiking...' : 'Simulate Spike'}</span>
          </button>
        </div>
      </div>

      {/* Top Banner & KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        {/* KPI 1: Fleet Capacity & Running Count */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 hover:border-slate-700/90 transition-colors p-4 rounded-2xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Fleet Online Capacity</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {fleetStats.activeCount} <span className="text-sm text-slate-500 font-normal">/ {devices.length} Units</span>
              </span>
              <span className="text-xs font-bold font-mono text-blue-400">
                {capacity.loadPercent}% Load
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  capacity.loadPercent > 100
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, capacity.loadPercent)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Nominal: {capacity.maxCapacity} Units</span>
              <span className="text-emerald-400 font-semibold uppercase text-[10px]">
                {capacity.status.replace('_', ' ')}
              </span>
            </p>
          </div>
        </div>

        {/* KPI 2: Fleet Mean Temperature */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Fleet Mean Temperature</span>
            <div className={`p-2 rounded-xl border ${
              fleetStats.hasOverheat
                ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono tracking-tight ${
                fleetStats.hasOverheat ? 'text-red-400' : 'text-white'
              }`}>
                {fleetStats.activeCount > 0 ? `${fleetStats.avgTemp}°C` : '--'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Across {fleetStats.activeCount} running
              </span>
            </div>
            <p className={`text-[11px] mt-2 flex items-center gap-1 font-medium ${
              fleetStats.hasOverheat ? 'text-red-300 font-semibold' : 'text-emerald-400'
            }`}>
              {fleetStats.hasOverheat
                ? '⚠️ Unit exceeding 80°C threshold'
                : 'All running equipment within thermal specs'}
            </p>
          </div>
        </div>

        {/* KPI 3: Fleet Mean Pneumatics & Humidity */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Fleet Pneumatics &amp; Humidity</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {fleetStats.activeCount > 0 ? `${fleetStats.avgPressure} PSI` : '--'}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {fleetStats.activeCount > 0 ? `${fleetStats.avgHumidity}% Hum` : '--'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Atmospheric Equilibrium</span>
              <span className="text-amber-400 font-mono text-[10px]">1Hz Sampling</span>
            </p>
          </div>
        </div>

        {/* KPI 4: Security Sentinel & Live Alarms */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Sentinel Alarms &amp; Security</span>
            <div className={`p-2 rounded-xl border ${
              alerts.length > 0
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono tracking-tight ${
                alerts.length > 0 ? 'text-red-400' : 'text-purple-300'
              }`}>
                {alerts.length} Alarms
              </span>
              <span className="text-xs font-mono text-purple-400 font-bold">
                Zero-Eval
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
              <span>AST Stream Sanitized</span>
              <span className="text-purple-400 font-semibold text-[10px]">Deterministic</span>
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Panel: Live Real-Time Readings of Currently Running Machines */}
      <RunningMachinesPanel
        runningDevices={runningDevices}
        standbyDevices={standbyDevices}
        capacity={capacity}
        activeDeviceId={selectedDeviceId}
        onSelectDevice={(id) => setSelectedDeviceId(id)}
        onTogglePower={handleTogglePower}
      />

      {/* Main Grid: Live Chart + Alert Stream + Full Equipment Control */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LiveChart
            dataPoints={dataPoints}
            currentReading={currentReading}
            deviceId={selectedDeviceId}
            devices={devices}
            runningDevices={runningDevices}
            onSelectDevice={(id) => setSelectedDeviceId(id)}
            isOnline={isSelectedOnline}
            threshold={80}
          />
          <DeviceList
            devices={devices}
            capacity={capacity}
            capacityError={capacityError}
            onClearError={clearCapacityError}
            activeDeviceId={selectedDeviceId}
            onSelectDevice={(id) => setSelectedDeviceId(id)}
            onTogglePower={handleTogglePower}
            onBulkToggle={bulkTogglePower}
          />
        </div>

        <div className="lg:col-span-1">
          <AlertFeed
            alerts={alerts}
            runningDevices={runningDevices}
            activeDeviceId={selectedDeviceId}
            onSelectDevice={(id) => setSelectedDeviceId(id)}
          />
        </div>
      </div>
    </div>
  );
}
