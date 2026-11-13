import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitCompare } from 'lucide-react';

export const ConditionNode = memo(({ id, data, selected }) => {
  const operator = data.operator || '>';
  const value = data.value !== undefined ? data.value : 80;
  const liveValue = data.liveValue;
  const isPulsing = data.isPulsing;

  return (
    <div
      className={`relative min-w-[180px] rounded-lg border-2 bg-slate-900 p-3 shadow-lg transition-all ${
        selected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 border-amber-500' : 'border-amber-500/70 hover:border-amber-400'
      } ${isPulsing ? 'node-active-pulse' : ''}`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-950"
      />

      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="p-1 rounded bg-amber-500/20 text-amber-400">
          <GitCompare className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Threshold Rule</h4>
        </div>
      </div>

      {/* Node Config Summary */}
      <div className="text-xs space-y-1 text-slate-300">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Condition:</span>
          <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
            {operator} {value}
          </span>
        </div>
      </div>

      {/* Live Value Indicator */}
      {liveValue !== undefined && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">Evaluated:</span>
          <span className="font-mono font-bold text-amber-400">
            {liveValue}
          </span>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-950"
      />
    </div>
  );
});
