
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

import {
  Activity,
  Thermometer,
  Gauge,
  Droplets,
} from 'lucide-react';

export function LiveChart({
  dataPoints = [],
  currentReading,
  deviceId = 'TURBINE_001',
  threshold = 80,
}) {
  const [selectedMetric, setSelectedMetric] = useState('temperature');

  const metricConfig = {
    temperature: {
      label: 'Temperature',
      unit: '°C',
      color: '#3b82f6',
      icon: Thermometer,
    },
    pressure: {
      label: 'Pressure',
      unit: 'PSI',
      color: '#f59e0b',
      icon: Gauge,
    },
    humidity: {
      label: 'Humidity',
      unit: '%',
      color: '#10b981',
      icon: Droplets,
    },
  };

  const currentCfg = metricConfig[selectedMetric];

  // Prepare chart data safely
  const chartData = dataPoints
    .filter((dp) => dp && dp.timestamp)
    .map((dp, idx) => {
      const time = new Date(dp.timestamp);

      return {
        index: idx,
        timeStr: Number.isNaN(time.getTime())
          ? '--'
          : time.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),

        temperature:
          dp.temperature != null && Number.isFinite(Number(dp.temperature))
            ? Number(dp.temperature)
            : null,

        pressure:
          dp.pressure != null && Number.isFinite(Number(dp.pressure))
            ? Number(dp.pressure)
            : null,

        humidity:
          dp.humidity != null && Number.isFinite(Number(dp.humidity))
            ? Number(dp.humidity)
            : null,
      };
    })
    .filter((dp) => dp[selectedMetric] !== null);

  const latestVal = currentReading?.[selectedMetric];

  const validLatestVal =
    latestVal != null && Number.isFinite(Number(latestVal))
      ? Number(latestVal)
      : null;

  const isAboveThreshold =
    selectedMetric === 'temperature' &&
    validLatestVal !== null &&
    validLatestVal > threshold;

  const MetricIcon = currentCfg.icon;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">

      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">

        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />

            <h3 className="text-sm font-bold text-white tracking-tight">
              Real-Time Telemetry Stream
            </h3>
          </div>

          <p className="text-xs text-slate-400 mt-0.5">
            Monitoring {deviceId} across rolling 30-sample window
          </p>
        </div>

        {/* Metric Selector */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">

          {Object.entries(metricConfig).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isSelected = selectedMetric === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedMetric(key)}
                aria-pressed={isSelected}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon
                  className="w-3.5 h-3.5"
                  style={{
                    color: isSelected ? cfg.color : undefined,
                  }}
                />

                <span>{cfg.label}</span>
              </button>
            );
          })}

        </div>

        {/* Current Metric */}
        <div className="text-right">

          <span className="text-[10px] uppercase font-mono text-slate-400 block">
            Current {currentCfg.label}
          </span>

          <div className="flex flex-wrap items-baseline gap-1.5 justify-end">

            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                isAboveThreshold
                  ? 'text-red-400 animate-pulse'
                  : 'text-white'
              }`}
              style={{
                color: !isAboveThreshold ? currentCfg.color : undefined,
              }}
            >
              {validLatestVal !== null
                ? `${validLatestVal} ${currentCfg.unit}`
                : '--'}
            </span>

            {isAboveThreshold && (
              <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-mono font-bold">
                THRESHOLD EXCEEDED
              </span>
            )}

          </div>
        </div>

      </div>

      {/* Chart */}
      <div className="h-72 w-full">

        {chartData.length === 0 ? (

          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
            <MetricIcon className="w-7 h-7 opacity-50" />

            <p>
              Waiting for {currentCfg.label.toLowerCase()} readings...
            </p>

            <p className="text-slate-600">
              Device: {deviceId}
            </p>
          </div>

        ) : (

          <ResponsiveContainer width="100%" height="100%">

            <LineChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: -10,
                bottom: 0,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
              />

              <XAxis
                dataKey="timeStr"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={20}
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
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#fff',
                }}
                formatter={(value) => [
                  `${value} ${currentCfg.unit}`,
                  currentCfg.label,
                ]}
              />

              {/* Temperature Alert Threshold */}
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
                name={currentCfg.label}
                stroke={currentCfg.color}
                strokeWidth={2.5}
                dot={{
                  r: 2,
                  fill: currentCfg.color,
                }}
                activeDot={{
                  r: 5,
                  fill: currentCfg.color,
                }}
                connectNulls={false}
                isAnimationActive={false}
              />

            </LineChart>

          </ResponsiveContainer>

        )}

      </div>
    </div>
  );
}
