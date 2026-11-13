import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Activity } from 'lucide-react';

export const MovingAverageNode = memo(({ id, data, selected }) => {
  const windowSize = data.windowSize || 5;
  const liveValue = data.liveValue;
  const isPulsing = data.isPulsing;

  return (
    <div
      className={`relative min-w-[180px] rounded-lg border-2 bg-slate-900 p-3 shadow-lg transition-all ${
        selected ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-950 border-purple-500' : 'border-purple-500/70 hover:border-purple-400'
      } ${isPulsing ? 'node-active-pulse' : ''}`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-slate-950"
      />

      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="p-1 rounded bg-purple-500/20 text-purple-400">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-400">Moving Average</h4>
        </div>
      </div>

      {/* Node Config Summary */}
      <div className="text-xs space-y-1 text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">Window:</span>
          <span className="font-mono font-medium text-white">{windowSize} readings</span>
        </div>
      </div>

      {/* Live Value Indicator */}
      {liveValue !== undefined && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">Avg:</span>
          <span className="font-mono font-bold text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/50">
            {liveValue}
          </span>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-slate-950"
      />
    </div>
  );
});
