import React from 'react';
import {
  Activity,
  Thermometer,
  Gauge,
  Droplets,
  Power,
  Server,
  Clock,
  Wind,
  Bot,
  Layers,
  Flame,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react';

const MACHINE_ICONS = {
  Turbine: Wind,
  Pump: Activity,
  Boiler: Flame,
  Conveyor: Layers,
  'Robotic Arm': Bot,
  Compressor: Gauge,
  Generator: Zap,
};

export function RunningMachinesPanel({
  runningDevices = [],
  standbyDevices = [],
  capacity = { activeCount: 0, maxCapacity: 4, loadPercent: 0, status: 'idle' },
  activeDeviceId,
  onSelectDevice,
  onTogglePower,
}) {
  const isAtCapacity = capacity.activeCount >= capacity.maxCapacity;

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Header & Server Capacity Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Live Equipment Telemetry Stream
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                1Hz Streaming
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly real-time high-throughput sensor readouts for active machines under server load
            </p>
          </div>
        </div>

        {/* Server Load Capacity Meter */}
        <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-800/90 rounded-xl px-4 py-2.5 shadow-inner">
          <Server className={`w-4 h-4 ${isAtCapacity ? 'text-amber-400' : 'text-emerald-400'}`} />
          <div className="min-w-[170px]">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-slate-400">Server Active Load</span>
              <span className={`font-bold ${isAtCapacity ? 'text-amber-400' : 'text-emerald-400'}`}>
                {capacity.activeCount} / {capacity.maxCapacity} Active ({capacity.loadPercent}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800/90 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isAtCapacity ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${Math.min(100, capacity.loadPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Cards for Running Machines */}
      {runningDevices.length === 0 ? (
        <div className="py-10 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/50">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-300">All Industrial Machines in Standby</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Click "+ Start Machine" below or in the equipment panel to spin up physical unit simulators and stream live sensor telemetry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {runningDevices.map((device) => {
            const reading = device.lastReading || {};
            const isSelected = device.deviceId === activeDeviceId;
            const Icon = MACHINE_ICONS[device.type] || Activity;
            const temp = Number(reading.temperature ?? 0);
            const isOverheat = temp > 80;
            const isWarm = temp >= 70 && temp <= 80;
            const lastTime = reading.timestamp
              ? new Date(reading.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'Streaming';

            return (
              <div
                key={device.deviceId}
                onClick={() => onSelectDevice && onSelectDevice(device.deviceId)}
                className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer relative group ${
                  isSelected
                    ? 'border-blue-500 bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 shadow-xl shadow-blue-950/40 ring-1 ring-blue-500/50'
                    : 'border-slate-800/80 bg-slate-950/70 hover:border-emerald-500/50 hover:bg-slate-950'
                }`}
              >
                {/* Machine Header & Quick Stop */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isOverheat
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : isSelected
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {device.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {device.deviceId}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                          isOverheat
                            ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                            : isWarm
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-emerald-950 text-emerald-400'
                        }`}>
                          {isOverheat ? 'OVERHEAT' : isWarm ? 'ELEVATED' : 'NOMINAL'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePower && onTogglePower(device.deviceId);
                    }}
                    title="Stop machine (Return to Standby)"
                    className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-red-950/80 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-800/60 transition-colors cursor-pointer shrink-0"
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Big Real-Time Readouts */}
                <div className="space-y-2">
                  <div className={`flex items-center justify-between rounded-xl px-3 py-2 border transition-all ${
                    isOverheat
                      ? 'bg-red-950/30 border-red-900/50'
                      : 'bg-slate-900/90 border-slate-800/80'
                  }`}>
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Thermometer className={`w-3.5 h-3.5 ${isOverheat ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
                      Temperature
                    </span>
                    <span className={`text-base font-black font-mono tracking-tight ${
                      isOverheat ? 'text-red-400 animate-pulse' : 'text-blue-300'
                    }`}>
                      {reading.temperature !== undefined ? `${reading.temperature}°C` : '--'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-2.5 py-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <Gauge className="w-3 h-3 text-amber-400" />
                        Pressure
                      </span>
                      <span className="text-xs font-bold font-mono text-amber-300 mt-0.5 block">
                        {reading.pressure !== undefined ? `${reading.pressure} PSI` : '--'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-2.5 py-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <Droplets className="w-3 h-3 text-emerald-400" />
                        Humidity
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-300 mt-0.5 block">
                        {reading.humidity !== undefined ? `${reading.humidity}%` : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Timestamp & Chart Action Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {lastTime}
                  </span>
                  <span className={`font-semibold flex items-center gap-1 ${isSelected ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`}>
                    {isSelected ? '● In Focus' : 'Focus Graph →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Start Standby Machines Bar */}
      {standbyDevices && standbyDevices.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-xs font-semibold text-slate-400">
              Standby Units ({standbyDevices.length} available to run):
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {standbyDevices.map((d) => {
              const Icon = MACHINE_ICONS[d.type] || Activity;
              return (
                <button
                  key={d.deviceId}
                  onClick={() => onTogglePower && onTogglePower(d.deviceId)}
                  title={`Click to turn ON ${d.name} (${d.deviceId})`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-950/70 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-800/60 hover:border-emerald-500 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Icon className="w-3 h-3 text-emerald-400 group-hover:text-white" />
                  <span>+ Start {d.name.split('#')[0].replace('Main ', '')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
