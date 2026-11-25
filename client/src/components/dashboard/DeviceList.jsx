import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Power,
  Thermometer,
  Gauge,
  Droplets,
  XCircle,
  AlertTriangle,
  Search,
  PlaySquare,
  Square,
} from 'lucide-react';
import { getMachineIcon } from '../../utils/machineIcons.js';

export function DeviceList({
  devices = [],
  capacity = { activeCount: 0, maxCapacity: 4, loadPercent: 0 },
  capacityError = null,
  onClearError,
  activeDeviceId,
  onSelectDevice,
  onTogglePower,
  onBulkToggle,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'running' | 'standby' | 'overheat'
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const maxCapacity = capacity?.maxCapacity || 4;
  const isAtCapacity = onlineCount >= maxCapacity;

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.type.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterMode === 'running') return d.status === 'online';
      if (filterMode === 'standby') return d.status !== 'online';
      if (filterMode === 'overheat') return d.status === 'online' && Number(d.lastReading?.temperature || 0) > 80;

      return true;
    });
  }, [devices, searchTerm, filterMode]);

  const handleBulkAction = async (action) => {
    if (!onBulkToggle) return;
    setIsBulkProcessing(true);
    try {
      await onBulkToggle(action);
    } catch (err) {
      console.warn('Bulk toggle error:', err);
    } finally {
      setTimeout(() => setIsBulkProcessing(false), 800);
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Header & Fleet Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3.5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Factory Machine Fleet Control</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual telemetry actuators &amp; real-time operational state management ({onlineCount} of {devices.length} running)
          </p>
        </div>

        {/* Global Bulk Power Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleBulkAction('start_all')}
            disabled={isBulkProcessing || onlineCount === devices.length}
            title="Start all 7 factory machines simultaneously"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-950/80 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-800/80 hover:border-emerald-500 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlaySquare className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white" />
            <span>Start All Fleet</span>
          </button>

          <button
            onClick={() => handleBulkAction('stop_all')}
            disabled={isBulkProcessing || onlineCount === 0}
            title="Emergency Power Down all machines to standby"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950/80 hover:bg-red-950/90 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-800/80 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Square className="w-3.5 h-3.5 text-red-400" />
            <span>Standby All</span>
          </button>

          <div
            className={`text-xs font-mono px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
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
            Active Load
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search machines by name, ID or type..."
            className="w-full bg-slate-950/90 border border-slate-800/90 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'all', label: `All (${devices.length})` },
            { id: 'running', label: `Running (${onlineCount})` },
            { id: 'standby', label: `Standby (${devices.length - onlineCount})` },
            {
              id: 'overheat',
              label: `Alerts (${devices.filter((d) => d.status === 'online' && Number(d.lastReading?.temperature || 0) > 80).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-slate-800 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {capacityError && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-950/60 border border-amber-700/70 text-xs text-amber-200 flex items-center justify-between gap-2 shadow-md">
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

      {/* Grid of Equipment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredDevices.map((device) => {
          const isSelected = device.deviceId === activeDeviceId;
          const isOnline = device.status === 'online';
          const reading = device.lastReading || {};
          const Icon = getMachineIcon(device.type);
          const temp = Number(reading.temperature ?? 0);
          const isOverheat = isOnline && temp > 80;

          return (
            <div
              key={device.deviceId}
              onClick={() => onSelectDevice && onSelectDevice(device.deviceId)}
              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'border-blue-500 bg-gradient-to-b from-blue-950/30 to-slate-900/90 shadow-lg ring-1 ring-blue-500/50'
                  : isOnline
                  ? 'border-slate-800 hover:border-slate-700 bg-slate-950/70 hover:bg-slate-950'
                  : 'border-slate-800/60 bg-slate-950/30 opacity-75 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              {/* Header: Name, Device ID, and Power Toggle Switch */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    isOverheat
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                        {device.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                        {device.deviceId}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span className="text-slate-400 capitalize">{device.type}</span>
                      <span>•</span>
                      <span className="text-[10px] text-blue-400/90 font-mono">Sensors: Temp, Press, Hum</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge & Power Switch Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isOverheat
                        ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                        : isOnline
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                    {isOverheat ? 'OVERHEAT' : isOnline ? 'RUNNING' : 'STANDBY'}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Don't trigger card selection
                      onTogglePower && onTogglePower(device.deviceId);
                    }}
                    title={isOnline ? 'Click to turn machine OFF' : 'Click to turn machine ON'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
                      isOnline
                        ? 'bg-slate-800 hover:bg-red-950/90 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/80'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 shadow-md shadow-emerald-950/60'
                    }`}
                  >
                    <Power className={`w-3.5 h-3.5 ${isOnline ? 'text-red-400' : 'text-white'}`} />
                    <span>{isOnline ? 'STOP' : 'START'}</span>
                  </button>
                </div>
              </div>

              {/* Status Badge & Sensor Readings */}
              {isOnline ? (
                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-800/80 text-xs">
                  <div className={`p-2 rounded-xl border ${
                    isOverheat
                      ? 'bg-red-950/30 border-red-900/50'
                      : 'bg-slate-900/80 border-slate-800/60'
                  }`}>
                    <span className="text-slate-400 text-[10px] block flex items-center gap-1">
                      <Thermometer className={`w-3 h-3 ${isOverheat ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
                      Temp
                    </span>
                    <span className={`font-mono font-bold text-sm ${isOverheat ? 'text-red-400 animate-pulse' : 'text-blue-300'}`}>
                      {reading.temperature !== undefined ? `${reading.temperature}°C` : '--'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 text-[10px] block flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-amber-400" />
                      Pressure
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-sm">
                      {reading.pressure !== undefined ? `${reading.pressure} PSI` : '--'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
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
                <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs bg-slate-950/60 -mx-4 -mb-4 p-3 rounded-b-2xl">
                  <span className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    Machine in Standby (Ambient: {reading.temperature !== undefined ? `${reading.temperature}°C` : '24°C'})
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePower && onTogglePower(device.deviceId);
                    }}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer flex items-center gap-1"
                  >
                    <Power className="w-3 h-3" />
                    Click to Start
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
