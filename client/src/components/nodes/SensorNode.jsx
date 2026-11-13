import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Thermometer } from 'lucide-react';

export const SensorNode = memo(({ id, data, selected }) => {
  const deviceId = data.deviceId || 'TURBINE_001';
  const field = data.field || 'temperature';
  const liveValue = data.liveValue;
  const isPulsing = data.isPulsing;

  return (
    <div
      className={`relative min-w-[180px] rounded-lg border-2 bg-slate-900 p-3 shadow-lg transition-all ${
        selected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950 border-blue-500' : 'border-blue-500/70 hover:border-blue-400'
      } ${isPulsing ? 'node-active-pulse' : ''}`}
    >
      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="p-1 rounded bg-blue-500/20 text-blue-400">
          <Thermometer className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">Sensor Source</h4>
        </div>
      </div>

      {/* Node Config Summary */}
      <div className="text-xs space-y-1 text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">Device:</span>
          <span className="font-mono font-medium text-white">{deviceId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Field:</span>
          <span className="font-mono text-blue-300 capitalize">{field}</span>
        </div>
      </div>

      {/* Live Value Indicator */}
      {liveValue !== undefined && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">Live:</span>
          <span className="font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50">
            {liveValue}°C
          </span>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950"
      />
    </div>
  );
});
