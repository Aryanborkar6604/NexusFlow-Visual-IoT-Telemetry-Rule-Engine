import React from 'react';
import { Thermometer, Activity, GitCompare, BellRing } from 'lucide-react';

const PALETTE_ITEMS = [
  {
    type: 'sensor',
    label: 'Temperature Sensor',
    desc: 'Reads telemetry from device',
    icon: Thermometer,
    color: 'border-blue-500/60 bg-blue-950/30 text-blue-400 hover:border-blue-400',
  },
  {
    type: 'movingAverage',
    label: 'Moving Average',
    desc: 'Smooths noisy readings over N values',
    icon: Activity,
    color: 'border-purple-500/60 bg-purple-950/30 text-purple-400 hover:border-purple-400',
  },
  {
    type: 'condition',
    label: 'Threshold Condition',
    desc: 'Compares value against threshold',
    icon: GitCompare,
    color: 'border-amber-500/60 bg-amber-950/30 text-amber-400 hover:border-amber-400',
  },
  {
    type: 'sms',
    label: 'SMS Alert Action',
    desc: 'Dispatches alert notification',
    icon: BellRing,
    color: 'border-red-500/60 bg-red-950/30 text-red-400 hover:border-red-400',
  },
];

export function NodePalette() {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 border-r border-slate-800 bg-slate-900/70 p-4 flex flex-col h-full overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Node Palette</h3>
        <p className="text-xs text-slate-400 mt-1">Drag nodes onto the canvas to construct your workflow</p>
      </div>

      <div className="space-y-3">
        {PALETTE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              className={`p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all select-none shadow-sm ${item.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-semibold text-xs text-white">{item.label}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">{item.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-800 text-[11px] text-slate-400">
        💡 <span className="text-slate-400">Pro-tip:</span> Connect nodes by dragging between blue/purple/amber handles.
      </div>
    </div>
  );
}
