import React, { useState } from 'react';
import { BellRing, ShieldAlert, Clock, Activity, Zap, Flame, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { alertService } from '../../services/alertService.js';
import { useMachines } from '../../context/MachineContext.jsx';
import { unlockAlertAudio } from '../../utils/alertSound.js';

export function AlertFeed({ alerts = [], runningDevices = [], activeDeviceId, onSelectDevice }) {
  const [activeTab, setActiveTab] = useState('running'); // 'running' | 'alerts'
  const [isSpiking, setIsSpiking] = useState(false);
  const { notifyToast, soundEnabled, toggleSound, isAlertRinging } = useMachines();

  const handleTriggerSpike = async (e) => {
    e.stopPropagation();
    const target = activeDeviceId || 'TURBINE_001';
    setIsSpiking(true);
    await unlockAlertAudio();
    try {
      await alertService.triggerTestSpike(target, 93.5);
      notifyToast({
        title: `Spike Test Fired on ${target}`,
        message: '93.5°C reading dispatched to Alert Sentinel.',
        type: 'warning',
      });
    } catch (err) {
      console.warn('Failed to trigger spike:', err.message);
    } finally {
      setTimeout(() => setIsSpiking(false), 1200);
    }
  };

  return (
    <div
      className={`bg-gradient-to-b from-slate-900 to-slate-900/90 border rounded-2xl p-4 shadow-xl flex flex-col lg:sticky lg:top-[82px] lg:max-h-[calc(100vh-106px)] transition-all duration-300 ${
        isAlertRinging ? 'border-red-500/80 ring-1 ring-red-500/40' : 'border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BellRing
            className={`w-4 h-4 shrink-0 ${
              isAlertRinging ? 'text-red-400 animate-bounce' : 'text-red-400'
            }`}
          />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 truncate">
            Live Stream &amp; Alerts
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? 'Mute alert beep sound' : 'Enable alert beep sound'}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-all cursor-pointer ${
              soundEnabled
                ? isAlertRinging
                  ? 'bg-red-950/90 text-red-300 border-red-500/70 animate-pulse'
                  : 'bg-blue-950/80 text-blue-300 border-blue-800/70 hover:bg-blue-900/80'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            <span>{soundEnabled ? 'Beep ON' : 'Muted'}</span>
          </button>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/70 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {runningDevices.length} ON
          </span>
          <Link to="/history" className="text-[11px] text-blue-400 hover:text-blue-300 font-medium ml-0.5">
            History &rarr;
          </Link>
        </div>
      </div>

      {/* Tabs: Running Machines vs Critical Alerts */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 mb-3 text-xs font-medium">
        <button
          onClick={() => setActiveTab('running')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
            activeTab === 'running'
              ? 'bg-slate-800 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Active Machines ({runningDevices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
            activeTab === 'alerts'
              ? 'bg-slate-800 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>Threshold Alerts ({alerts.length})</span>
        </button>
      </div>

      {/* Quick Demo Spike Trigger */}
      <div className="mb-3 px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Test Sentinel Alert:
        </span>
        <button
          onClick={handleTriggerSpike}
          disabled={isSpiking}
          className="px-2 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[11px] font-bold font-mono transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {isSpiking ? 'Spiking...' : '⚡ Trigger Spike'}
        </button>
      </div>

      {/* Body Content */}
      <div className="space-y-2 flex-1 overflow-y-auto nexus-scrollbar max-h-[520px] lg:max-h-none pr-1">
        {activeTab === 'running' ? (
          /* Running Machines Live Readout Stream */
          runningDevices.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center text-slate-500">
              <Activity className="w-6 h-6 mb-1 text-slate-600" />
              <p className="text-xs font-semibold text-slate-400">No Machines Currently Running</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Toggle ON a machine to view its live readings stream</p>
            </div>
          ) : (
            runningDevices.map((device) => {
              const reading = device.lastReading || {};
              const isSelected = device.deviceId === activeDeviceId;
              const isOverheat = reading.temperature > 80;
              const time = reading.timestamp
                ? new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Live';

              return (
                <div
                  key={device.deviceId}
                  onClick={() => onSelectDevice && onSelectDevice(device.deviceId)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/30 shadow-md ring-1 ring-blue-500/40'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="font-bold text-xs text-white truncate">{device.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0 ml-1">
                      {device.deviceId}
                    </span>
                  </div>

                  {/* 3 Real-time Live Sensor Readouts */}
                  <div className="grid grid-cols-3 gap-1.5 text-center my-1.5 tabular-nums">
                    <div className="bg-slate-900/90 py-1 px-1 rounded border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 block font-mono">TEMP</span>
                      <span className={`text-xs font-mono font-bold ${isOverheat ? 'text-red-400 animate-pulse' : 'text-blue-300'}`}>
                        {reading.temperature !== undefined ? `${reading.temperature}°C` : '--'}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 py-1 px-1 rounded border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 block font-mono">PRESS</span>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {reading.pressure !== undefined ? `${reading.pressure} PSI` : '--'}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 py-1 px-1 rounded border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 block font-mono">HUM</span>
                      <span className="text-xs font-mono font-bold text-emerald-300">
                        {reading.humidity !== undefined ? `${reading.humidity}%` : '--'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {time}
                    </span>
                    <span className={isSelected ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-blue-300'}>
                      {isSelected ? 'Viewing Graph' : 'View Graph →'}
                    </span>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Threshold Alerts Feed */
          alerts.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center text-slate-500">
              <ShieldAlert className="w-6 h-6 mb-1 text-slate-600" />
              <p className="text-xs font-semibold text-slate-400">No Critical Alerts Fired</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Click "Trigger Spike" above to test sentinel alerts</p>
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
                  onClick={() => onSelectDevice && alert.deviceId && onSelectDevice(alert.deviceId)}
                  className="p-2.5 rounded-lg border border-red-900/40 bg-red-950/20 text-xs transition-all hover:border-red-700/60 cursor-pointer"
                >
                  <div className="flex items-center justify-between font-semibold text-red-300 mb-1">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      {alert.deviceId}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400 font-normal">
                      <Clock className="w-3 h-3" />
                      {time}
                    </span>
                  </div>
                  <p className="text-slate-300 font-medium text-[11px]">{alert.message}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[170px]">{alert.workflowName || alert.workflowId}</span>
                    <span className="bg-red-900/60 text-red-200 px-1.5 py-0.5 rounded font-bold">
                      Val: {alert.value}°C
                    </span>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
