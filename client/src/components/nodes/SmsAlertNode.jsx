import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { BellRing } from 'lucide-react';

export const SmsAlertNode = memo(({ id, data, selected }) => {
  const recipient = data.recipient || '+15550199';
  const isPulsing = data.isPulsing;
  const triggerCount = data.triggerCount || 0;

  return (
    <div
      className={`relative min-w-[180px] rounded-lg border-2 bg-slate-900 p-3 shadow-lg transition-all ${
        selected ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-slate-950 border-red-500' : 'border-red-500/70 hover:border-red-400'
      } ${isPulsing ? 'node-alert-pulse' : ''}`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-slate-950"
      />

      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="p-1 rounded bg-red-500/20 text-red-400">
          <BellRing className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400">SMS Alert Trigger</h4>
        </div>
      </div>

      {/* Node Config Summary */}
      <div className="text-xs space-y-1 text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">Recipient:</span>
          <span className="font-mono text-white text-[11px] truncate max-w-[100px]">{recipient}</span>
        </div>
        {triggerCount > 0 && (
          <div className="flex justify-between text-xs text-red-400 font-medium">
            <span>Fired:</span>
            <span>{triggerCount} times</span>
          </div>
        )}
      </div>

      {/* No output handle: terminal action */}
    </div>
  );
});
