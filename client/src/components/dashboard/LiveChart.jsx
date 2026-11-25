import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Activity, Thermometer, Gauge, Droplets, Power, Layers } from 'lucide-react';

export function LiveChart({
  dataPoints = [],
  currentReading,
  deviceId = 'TURBINE_001',
  devices = [],
  runningDevices = [],
  onSelectDevice,
  isOnline = true,
  threshold = 80,
}) {
  const [selectedMetric, setSelectedMetric] = useState('temperature');

  const chartData = useMemo(() => {
    return dataPoints.map((dp, idx) => {
      const time = new Date(dp.timestamp);
      return {
        index: idx,
        timeStr: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temperature: dp.temperature,
        pressure: dp.pressure,
        humidity: dp.humidity,
      };
    });
  }, [dataPoints]);

  const latestVal = currentReading?.[selectedMetric];
  const isAboveThreshold =
    (selectedMetric === 'temperature' || selectedMetric === 'all') &&
    currentReading?.temperature !== undefined &&
    currentReading.temperature > threshold;

  const metricConfig = {
    temperature: { label: 'Temperature', unit: '°C', color: '#3b82f6', icon: Thermometer },
    pressure: { label: 'Pressure', unit: 'PSI', color: '#f59e0b', icon: Gauge },
    humidity: { label: 'Humidity', unit: '%', color: '#10b981', icon: Droplets },
    all: { label: 'Tri-Sensor Overview', unit: 'All', color: '#818cf8', icon: Layers },
  };

  const currentCfg = metricConfig[selectedMetric];

  // Window statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0, avg: 0 };
    const metricKey = selectedMetric === 'all' ? 'temperature' : selectedMetric;
    const vals = chartData
      .map((d) => d[metricKey])
      .filter((v) => v !== undefined && !isNaN(v));
    if (vals.length === 0) return { min: 0, max: 0, avg: 0 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / vals.length) * 10) / 10;
    return { min, max, avg };
  }, [chartData, selectedMetric]);

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Real-Time Telemetry Stream</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Monitoring {deviceId} across rolling window ({chartData.length} samples)</p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {Object.entries(metricConfig).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isSelected = selectedMetric === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? cfg.color : undefined }} />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Metrics Callout */}
        <div className="text-right tabular-nums">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">
            {selectedMetric === 'all' ? 'Live Temp / Pressure' : `Current ${currentCfg.label}`}
          </span>
          <div className="flex items-baseline gap-1.5 justify-end">
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                isAboveThreshold ? 'text-red-400 animate-pulse' : 'text-white'
              }`}
              style={{ color: !isAboveThreshold && selectedMetric !== 'all' ? currentCfg.color : undefined }}
            >
              {selectedMetric === 'all'
                ? `${currentReading?.temperature ?? '--'}°C / ${currentReading?.pressure ?? '--'} PSI`
                : latestVal !== undefined ? `${latestVal} ${currentCfg.unit}` : '--'}
            </span>
            {isAboveThreshold && (
              <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                THRESHOLD EXCEEDED
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Running Machines Live Stream Switcher */}
      {runningDevices && runningDevices.length > 0 && (
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/80 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Switch Active Stream:
          </span>
          {runningDevices.map((d) => {
            const isSelected = d.deviceId === deviceId;
            const temp = d.lastReading?.temperature;
            return (
              <button
                key={d.deviceId}
                onClick={() => onSelectDevice && onSelectDevice(d.deviceId)}
                title={`Click to view live stream for ${d.name} (${d.deviceId})`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50 ring-1 ring-blue-400'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />
                <span>{d.deviceId}</span>
                {temp !== undefined && (
                  <span className={`text-[11px] ${temp > threshold ? 'text-red-300 font-extrabold' : isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    {temp}°C
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!isOnline && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <Power className="w-4 h-4 text-amber-400" />
            {deviceId} is currently Powered OFF (Standby)
          </span>
          <span className="text-[11px] text-amber-400/80 font-mono">Click START in equipment panel to resume telemetry</span>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
            <Activity className="w-6 h-6 animate-pulse text-blue-500" />
            <p>Connecting to 1Hz sensor feed and streaming live readings for {deviceId}...</p>
          </div>
        ) : selectedMetric === 'all' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="timeStr"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="#64748b"
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              <ReferenceLine
                y={threshold}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: `Threshold: ${threshold}°C`,
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
              <Line
                type="monotone"
                name="Temperature (°C)"
                dataKey="temperature"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 1.5, fill: '#3b82f6' }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                name="Pressure (PSI)"
                dataKey="pressure"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 1.5, fill: '#f59e0b' }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                name="Humidity (%)"
                dataKey="humidity"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 1.5, fill: '#10b981' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`metricGradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentCfg.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={currentCfg.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="timeStr"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="#64748b"
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
              />
              {selectedMetric === 'temperature' && (
                <ReferenceLine
                  y={threshold}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: `Threshold: ${threshold}°C`,
                    fill: '#ef4444',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
              )}
              <Area
                type="monotone"
                name={currentCfg.label}
                dataKey={selectedMetric}
                stroke={currentCfg.color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#metricGradient-${selectedMetric})`}
                dot={{ r: 2, fill: currentCfg.color }}
                activeDot={{ r: 5, fill: currentCfg.color }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Statistical Analytics Drawer */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono tabular-nums gap-2">
        <div className="flex items-center gap-4">
          <span>Min: <strong className="text-white">{stats.min}</strong> {selectedMetric === 'all' ? '°C' : currentCfg.unit}</span>
          <span>Avg: <strong className="text-white">{stats.avg}</strong> {selectedMetric === 'all' ? '°C' : currentCfg.unit}</span>
          <span>Max: <strong className={stats.max > threshold ? 'text-red-400' : 'text-white'}>{stats.max}</strong> {selectedMetric === 'all' ? '°C' : currentCfg.unit}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>Buffer: {chartData.length} frames</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            RxJS Stream Live
          </span>
        </div>
      </div>
    </div>
  );
}
