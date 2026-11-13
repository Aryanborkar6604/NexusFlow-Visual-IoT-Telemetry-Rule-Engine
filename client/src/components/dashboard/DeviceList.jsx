import React from 'react';
import { Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

export function DeviceList({ devices = [], activeDeviceId, onSelectDevice }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Connected Equipment</h3>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-full">
          {devices.length} Online
        </span>
      </div>

      <div className="space-y-2">
        {devices.map((device) => {
          const isSelected = device.deviceId === activeDeviceId;
          const reading = device.lastReading || {};

          return (
            <div
              key={device.deviceId}
              onClick={() => onSelectDevice && onSelectDevice(device.deviceId)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-950/20'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-xs text-white">{device.name}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {device.deviceId}
                </div>
              </div>

              {/* Latest Telemetry metrics */}
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Temp</span>
                  <span className="font-mono font-bold text-blue-300">
                    {reading.temperature !== undefined ? `${reading.temperature}°C` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Pressure</span>
                  <span className="font-mono font-medium text-slate-300">
                    {reading.pressure !== undefined ? `${reading.pressure} PSI` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Humidity</span>
                  <span className="font-mono font-medium text-slate-300">
                    {reading.humidity !== undefined ? `${reading.humidity}%` : '--'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
