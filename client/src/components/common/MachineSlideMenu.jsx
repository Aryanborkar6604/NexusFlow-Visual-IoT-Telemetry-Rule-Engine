import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronsLeft,
  ChevronRight,
  Cpu,
  Pin,
  PinOff,
  Search,
  X,
  Thermometer,
  Gauge,
  Droplets,
  Power,
  Loader2,
  PlaySquare,
  Square,
  SlidersHorizontal,
} from 'lucide-react';
import { useMachines } from '../../context/MachineContext.jsx';
import { getMachineIcon } from '../../utils/machineIcons.js';

export function MachineSlideMenu() {
  const {
    devices,
    runningDevices,
    capacity,
    selectedDeviceId,
    setSelectedDeviceId,
    togglingMap,
    togglePower,
    bulkTogglePower,
    isMenuOpen,
    openMenu,
    closeMenu,
    isMenuPinned,
    toggleMenuPin,
  } = useMachines();

  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'on' | 'off'
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Close drawer with Escape key when not pinned
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMenuOpen && !isMenuPinned) {
        closeMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen, isMenuPinned, closeMenu]);

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.deviceId.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (filterMode === 'on') return d.status === 'online';
      if (filterMode === 'off') return d.status !== 'online';
      return true;
    });
  }, [devices, searchTerm, filterMode]);

  const handleSelectMachine = (deviceId) => {
    setSelectedDeviceId(deviceId);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const isBulkBusy = !!togglingMap.__bulk__;
  const onlineCount = runningDevices.length;
  const offlineCount = Math.max(0, devices.length - onlineCount);
  const nominalMax = capacity?.maxCapacity || 4;
  const isHighLoad = onlineCount > nominalMax;

  return (
    <>
      {/* Floating Edge Slide Handle (visible when menu bar is closed) */}
      <button
        type="button"
        onClick={openMenu}
        aria-label="Open machines slide menu"
        title="Slide open Machines ON/OFF menu bar"
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5 pl-2 pr-2.5 py-3.5 rounded-r-2xl bg-slate-900/95 hover:bg-slate-800 border border-l-0 border-slate-700/80 hover:border-blue-500/60 shadow-2xl shadow-black/60 backdrop-blur-md text-slate-200 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:pl-3.5 cursor-pointer group ${
          isMenuOpen ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <SlidersHorizontal className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
            {onlineCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <span
            className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-300 group-hover:text-white"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            MACHINES ({onlineCount}/{devices.length})
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </button>

      {/* Smooth Faded Backdrop (shown when open & unpinned, or on smaller viewports) */}
      <div
        onClick={closeMenu}
        aria-hidden="true"
        className={`fixed inset-0 top-[61px] z-30 bg-slate-950/60 backdrop-blur-[2px] transition-opacity duration-300 ${
          isMenuOpen
            ? isMenuPinned
              ? 'lg:hidden opacity-100'
              : 'opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slideable Machines Menu Bar Drawer */}
      <aside
        aria-label="Machines Control Slide Menu"
        className={`fixed top-[61px] bottom-0 left-0 z-40 w-[332px] sm:w-[360px] bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/90 shadow-2xl shadow-black/70 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer Header */}
        <div className="px-4 py-3.5 border-b border-slate-800/90 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/30 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                Machines Control Bar
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-emerald-400 font-bold">{onlineCount} ON</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{offlineCount} OFF</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleMenuPin}
              title={isMenuPinned ? 'Unpin drawer (overlay mode)' : 'Pin drawer side-by-side'}
              className={`hidden lg:flex items-center justify-center p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isMenuPinned
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                  : 'bg-slate-800/70 text-slate-400 hover:text-white border-slate-700/70'
              }`}
            >
              {isMenuPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={closeMenu}
              title="Slide close menu bar"
              aria-label="Close machines menu bar"
              className="flex items-center justify-center p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Capacity Strip + Search + Filter Tabs */}
        <div className="px-4 py-3 border-b border-slate-800/80 space-y-2.5 bg-slate-950/40 shrink-0">
          {/* Mini Load Progress */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="text-slate-400 uppercase tracking-wider">Active Server Load</span>
              <span className={`font-bold ${isHighLoad ? 'text-amber-400' : 'text-emerald-400'}`}>
                {onlineCount} / {nominalMax} Nominal ({capacity.loadPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isHighLoad
                    ? 'bg-gradient-to-r from-amber-500 to-red-500'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                }`}
                style={{ width: `${Math.min(100, capacity.loadPercent)}%` }}
              />
            </div>
          </div>

          {/* Compact Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter machines..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-semibold">
            {[
              { id: 'all', label: `All (${devices.length})` },
              { id: 'on', label: `ON (${onlineCount})` },
              { id: 'off', label: `OFF (${offlineCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`py-1 rounded-md transition-all cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Machine Items with Sliding ON/OFF Switches */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 nexus-scrollbar">
          {filteredDevices.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No machines match "{searchTerm || filterMode}".
            </div>
          ) : (
            filteredDevices.map((device) => {
              const isOnline = device.status === 'online';
              const isSelected = device.deviceId === selectedDeviceId;
              const isBusy = !!togglingMap[device.deviceId] || isBulkBusy;
              const reading = device.lastReading || {};
              const temp = Number(reading.temperature ?? 24);
              const isOverheat = isOnline && temp > 80;
              const Icon = getMachineIcon(device.type);

              return (
                <div
                  key={device.deviceId}
                  onClick={() => handleSelectMachine(device.deviceId)}
                  className={`group rounded-xl border p-3 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-blue-500/80 bg-gradient-to-r from-blue-950/40 to-slate-900 ring-1 ring-blue-500/30 shadow-md'
                      : isOnline
                      ? 'border-slate-800 bg-slate-950/75 hover:border-slate-700 hover:bg-slate-950'
                      : 'border-slate-800/60 bg-slate-950/35 hover:border-slate-700/80 hover:bg-slate-950/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Left: Machine Icon & Name */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                          isOverheat
                            ? 'bg-red-500/15 text-red-400 border-red-500/40'
                            : isOnline
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800/80 text-slate-500 border-slate-700/70'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isOverheat ? 'animate-pulse' : ''}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isOverheat
                                ? 'bg-red-400 animate-ping'
                                : isOnline
                                ? 'bg-emerald-400 animate-pulse'
                                : 'bg-slate-600'
                            }`}
                          />
                          <h3 className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                            {device.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mt-0.5">
                          <span>{device.deviceId}</span>
                          <span className="text-slate-600">•</span>
                          <span className="capitalize text-slate-500">{device.type}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Tactile Sliding ON / OFF Switch Button */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOnline}
                      aria-label={`Turn ${isOnline ? 'OFF' : 'ON'} ${device.name}`}
                      title={isOnline ? `Click to turn ${device.name} OFF` : `Click to turn ${device.name} ON`}
                      disabled={isBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePower(device.deviceId);
                      }}
                      className={`relative inline-flex items-center w-[64px] h-7 rounded-full border transition-all duration-300 ease-out shrink-0 cursor-pointer active:scale-95 disabled:opacity-60 ${
                        isOnline
                          ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/70 shadow-md shadow-emerald-950/60'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-600/80'
                      }`}
                    >
                      {/* Embedded ON / OFF Labels */}
                      <span
                        className={`absolute left-2 text-[10px] font-extrabold font-mono tracking-tight transition-opacity duration-200 ${
                          isOnline ? 'opacity-100 text-white' : 'opacity-0'
                        }`}
                      >
                        ON
                      </span>
                      <span
                        className={`absolute right-1.5 text-[10px] font-bold font-mono tracking-tight transition-opacity duration-200 ${
                          isOnline ? 'opacity-0' : 'opacity-100 text-slate-300'
                        }`}
                      >
                        OFF
                      </span>

                      {/* Sliding Thumb Knob */}
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isOnline ? 'translate-x-[38px]' : 'translate-x-1'
                        }`}
                      >
                        {isBusy ? (
                          <Loader2 className="w-3 h-3 text-slate-700 animate-spin" />
                        ) : (
                          <Power
                            className={`w-2.5 h-2.5 ${
                              isOnline ? 'text-emerald-600' : 'text-slate-500'
                            }`}
                          />
                        )}
                      </span>
                    </button>
                  </div>

                  {/* Live Sensor Strip inside each machine row */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] font-mono">
                    {isOnline ? (
                      <>
                        <span
                          className={`flex items-center gap-1 font-bold ${
                            isOverheat ? 'text-red-400 animate-pulse' : 'text-blue-300'
                          }`}
                        >
                          <Thermometer className="w-3 h-3" />
                          {reading.temperature !== undefined ? `${reading.temperature}°C` : '--'}
                        </span>
                        <span className="flex items-center gap-1 text-amber-300 font-semibold">
                          <Gauge className="w-3 h-3" />
                          {reading.pressure !== undefined ? `${reading.pressure} PSI` : '--'}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                          <Droplets className="w-3 h-3" />
                          {reading.humidity !== undefined ? `${reading.humidity}%` : '--'}
                        </span>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between text-[10px] text-slate-500">
                        <span>Standby Mode</span>
                        <span>Ambient {reading.temperature ?? 24}°C</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Footer Bulk Controls */}
        <div className="px-4 py-3 border-t border-slate-800/90 bg-slate-950/90 flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isBulkBusy || onlineCount === devices.length}
            onClick={() => bulkTogglePower('start_all')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-400/50 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <PlaySquare className="w-3.5 h-3.5" />
            <span>All ON</span>
          </button>

          <button
            type="button"
            disabled={isBulkBusy || onlineCount === 0}
            onClick={() => bulkTogglePower('stop_all')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-red-950/90 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/70 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <Square className="w-3.5 h-3.5 text-red-400" />
            <span>All OFF</span>
          </button>
        </div>
      </aside>
    </>
  );
}
