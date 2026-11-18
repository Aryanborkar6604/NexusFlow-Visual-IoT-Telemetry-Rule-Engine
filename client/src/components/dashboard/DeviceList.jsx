import React from 'react';
import { Cpu, Power, Activity, Thermometer, Gauge, Droplets, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export function DeviceList({
  devices = [],
  capacity = { activeCount: 0, maxCapacity: 4, loadPercent: 0 },
  capacityError = null,
  onClearError,
  activeDeviceId,
  onSelectDevice,
  onTogglePower,
}) {
  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const maxCapacity = capacity?.maxCapacity || 4;
  const isAtCapacity = onlineCount >= maxCapacity;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">All Factory Machines &amp; Power Control</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Server handles up to {maxCapacity} concurrent running machines. Toggle ON/OFF to manage active load.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
              isAtCapacity
                ? 'bg-amber-950/60 text-amber-300 border-amber-800/70'
                : 'bg-slate-950 text-slate-300 border-slate-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isAtCapacity ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span className={`font-bold ${isAtCapacity ? 'text-amber-300' : 'text-emerald-400'}`}>
              {onlineCount} / {maxCapacity}
            </span>{' '}
            Server Capacity
          </span>
        </div>
      </div>

      {capacityError && (
        <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-amber-950/60 border border-amber-700/70 text-xs text-amber-200 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            {capacityError}
          </span>
          {onClearError && (
            <button onClick={onClearError} className="text-amber-400 hover:text-white font-bold ml-2">
              ✕
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {devices.map((device) => {
          const isSelected = device.deviceId === activeDeviceId;
          const isOnline = device.status === 'online';
          const reading = device.lastReading || {};

          return (
            <div
              key={device.deviceId}
              onClick={() => onSelectDevice && onSelectDevice(device.deviceId)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'border-blue-500 bg-blue-950/20 shadow-md ring-1 ring-blue-500/50'
                  : isOnline
                  ? 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                  : 'border-slate-800/60 bg-slate-950/30 opacity-75 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              {/* Header: Name, Device ID, and Power Toggle Switch */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-white truncate">{device.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
                      {device.deviceId}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                    <span className="text-slate-500 capitalize">{device.type}</span>
                    <span>•</span>
                    <span className="text-[10px] text-blue-400/90 font-mono">Sensors: Temp, Press, Hum</span>
                  </div>
                </div>

                {/* ON / OFF Power Switch Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Don't trigger card selection
                    onTogglePower && onTogglePower(device.deviceId);
                  }}
                  title={isOnline ? 'Click to turn machine OFF' : 'Click to turn machine ON'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${
                    isOnline
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 border border-emerald-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  <Power className={`w-3.5 h-3.5 ${isOnline ? 'text-white' : 'text-slate-400'}`} />
                  <span>{isOnline ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* Status Badge & Sensor Readings */}
              {isOnline ? (
                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-800/80 text-xs">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 text-[10px] block flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-blue-400" />
                      Temp
                    </span>
                    <span className="font-mono font-bold text-blue-300 text-sm">
                      {reading.temperature !== undefined ? `${reading.temperature}°C` : '--'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 text-[10px] block flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-amber-400" />
                      Pressure
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-sm">
                      {reading.pressure !== undefined ? `${reading.pressure} PSI` : '--'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 text-[10px] block flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-emerald-400" />
                      Humidity
                    </span>
                    <span className="font-mono font-bold text-emerald-300 text-sm">
                      {reading.humidity !== undefined ? `${reading.humidity}%` : '--'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs bg-slate-950/60 -mx-4 -mb-4 p-3 rounded-b-xl">
                  <span className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    Machine Powered Down (Standby)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Ambient: {reading.temperature !== undefined ? `${reading.temperature}°C` : '24°C'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
