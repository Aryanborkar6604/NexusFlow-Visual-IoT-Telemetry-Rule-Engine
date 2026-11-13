import React from 'react';
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
import { Activity } from 'lucide-react';

export function LiveChart({ dataPoints = [], currentReading, deviceId = 'TURBINE_001', threshold = 80 }) {
  const chartData = dataPoints.map((dp, idx) => {
    const time = new Date(dp.timestamp);
    return {
      index: idx,
      timeStr: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      temperature: dp.temperature,
      pressure: dp.pressure,
    };
  });

  const latestTemp = currentReading?.temperature;
  const isAboveThreshold = latestTemp !== undefined && latestTemp > threshold;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Real-Time Telemetry Stream</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Monitoring {deviceId} across rolling 30-sample window</p>
        </div>

        {/* Live Metrics Callout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Current Temperature</span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-black font-mono tracking-tight ${
                  isAboveThreshold ? 'text-red-400 animate-pulse' : 'text-blue-400'
                }`}
              >
                {latestTemp !== undefined ? `${latestTemp}°C` : '--'}
              </span>
              {isAboveThreshold && (
                <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-mono font-bold">
                  THRESHOLD EXCEEDED
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Connecting to sensor feed and streaming live readings...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="timeStr"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[50, 105]}
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
              {/* Alert Threshold Line */}
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
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 2, fill: '#3b82f6' }}
                activeDot={{ r: 5, fill: '#60a5fa' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
