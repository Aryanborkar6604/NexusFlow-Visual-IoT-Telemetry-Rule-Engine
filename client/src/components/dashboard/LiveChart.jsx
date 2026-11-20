import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Activity, Thermometer, Gauge, Droplets, Power } from 'lucide-react';

export function LiveChart({
  dataPoints = [],
  currentReading,
  deviceId = 'TURBINE_001',
  runningDevices = [],
  onSelectDevice,
  isOnline = true,
  threshold = 80,
}) {
  const [selectedMetric, setSelectedMetric] = useState('temperature');

  const chartData = dataPoints.map((dp, idx) => {
    const time = new Date(dp.timestamp);
    return {
      index: idx,
      timeStr: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      temperature: dp.temperature,
      pressure: dp.pressure,
      humidity: dp.humidity,
    };
  });

  const latestVal = currentReading?.[selectedMetric];
  const isAboveThreshold = selectedMetric === 'temperature' && latestVal !== undefined && latestVal > threshold;

  const metricConfig = {
    temperature: { label: 'Temperature', unit: '°C', color: '#3b82f6', icon: Thermometer },
    pressure: { label: 'Pressure', unit: 'PSI', color: '#f59e0b', icon: Gauge },
    humidity: { label: 'Humidity', unit: '%', color: '#10b981', icon: Droplets },
  };

  const currentCfg = metricConfig[selectedMetric];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Real-Time Telemetry Stream</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Monitoring {deviceId} across rolling 30-sample window</p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {Object.entries(metricConfig).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isSelected = selectedMetric === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-sm'
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
        <div className="text-right">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Current {currentCfg.label}</span>
          <div className="flex items-baseline gap-1.5 justify-end">
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                isAboveThreshold ? 'text-red-400 animate-pulse' : 'text-white'
              }`}
              style={{ color: !isAboveThreshold ? currentCfg.color : undefined }}
            >
              {latestVal !== undefined ? `${latestVal} ${currentCfg.unit}` : '--'}
            </span>
            {isAboveThreshold && (
              <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-mono font-bold">
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
            Active Machines:
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
        <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <Power className="w-4 h-4 text-amber-400" />
            {deviceId} is currently Powered OFF (Standby)
          </span>
          <span className="text-[11px] text-amber-400/80 font-mono">Toggle switch to ON to resume telemetry</span>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Connecting to sensor feed and streaming live readings for {deviceId}...
          </div>
        ) : (
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
                domain={['dataMin - 5', 'dataMax + 5']}
                stroke="#64748b"
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#fff',
                }}
              />
              {/* Alert Threshold Line (shown when temperature is selected) */}
              {selectedMetric === 'temperature' && (
                <ReferenceLine
                  y={threshold}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: `Alert Threshold: ${threshold}°C`,
                    fill: '#ef4444',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke={currentCfg.color}
                strokeWidth={2.5}
                dot={{ r: 2, fill: currentCfg.color }}
                activeDot={{ r: 5, fill: currentCfg.color }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
