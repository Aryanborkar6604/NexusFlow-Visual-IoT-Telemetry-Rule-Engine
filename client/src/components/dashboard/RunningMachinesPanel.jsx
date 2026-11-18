import React from 'react';
import { Activity, Thermometer, Gauge, Droplets, Power, Server, Clock } from 'lucide-react';

export function RunningMachinesPanel({
  runningDevices = [],
  capacity = { activeCount: 0, maxCapacity: 4, loadPercent: 0, status: 'idle' },
  activeDeviceId,
  onSelectDevice,
  onTogglePower,
}) {
  const isAtCapacity = capacity.activeCount >= capacity.maxCapacity;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      {/* Header & Server Capacity Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Real-Time Readings — Running Machines
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Live 1Hz sensor readouts strictly for active equipment currently under server load
          </p>
        </div>

        {/* Server Load Capacity Meter */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2">
          <Server className={`w-4 h-4 ${isAtCapacity ? 'text-amber-400' : 'text-emerald-400'}`} />
          <div className="min-w-[155px]">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">Server Load</span>
              <span className={`font-bold ${isAtCapacity ? 'text-amber-400' : 'text-emerald-400'}`}>
                {capacity.activeCount} / {capacity.maxCapacity} Active ({capacity.loadPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isAtCapacity ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, capacity.loadPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Cards for Running Machines */}
      {runningDevices.length === 0 ? (
        <div className="py-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
          <Activity className="w-7 h-7 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Machines Currently Running</p>
          <p className="text-xs text-slate-500 mt-1">
            Toggle ON up to {capacity.maxCapacity} machines in the equipment panel below to begin streaming live readings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {runningDevices.map((device) => {
            const reading = device.lastReading || {};
            const isSelected = device.deviceId === activeDeviceId;
            const lastTime = reading.timestamp
              ? new Date(reading.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '--:--:--';

            return (
              <div
                key={device.deviceId}
                onClick={() => onSelectDevice && onSelectDevice(device.deviceId)}
                className={`rounded-xl border p-4 transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-blue-500 bg-gradient-to-b from-blue-950/30 to-slate-950 shadow-lg shadow-blue-950/30 ring-1 ring-blue-500/40'
                    : 'border-emerald-900/50 bg-slate-950/70 hover:border-emerald-500/50'
                }`}
              >
                {/* Machine Title & Quick Stop */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <h4 className="text-xs font-bold text-white truncate">{device.name}</h4>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400/90 mt-0.5 block">
                      {device.deviceId} • RUNNING
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePower && onTogglePower(device.deviceId);
                    }}
                    title="Turn OFF machine"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/80 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-800/60 transition-colors cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Big Real-Time Readouts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800/80 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Thermometer className="w-3.5 h-3.5 text-blue-400" />
                      Temp
                    </span>
                    <span className="text-base font-black font-mono text-blue-300">
                      {reading.temperature !== undefined ? `${reading.temperature}°C` : '--'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg px-2.5 py-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Gauge className="w-3 h-3 text-amber-400" />
                        Pressure
                      </span>
                      <span className="text-xs font-bold font-mono text-amber-300">
                        {reading.pressure !== undefined ? `${reading.pressure} PSI` : '--'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg px-2.5 py-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Droplets className="w-3 h-3 text-emerald-400" />
                        Humidity
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-300">
                        {reading.humidity !== undefined ? `${reading.humidity}%` : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Timestamp Footer */}
                <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lastTime}
                  </span>
                  <span className={isSelected ? 'text-blue-400 font-semibold' : 'text-slate-500'}>
                    {isSelected ? 'Viewing Chart' : 'Click for Chart'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
