import React from 'react';
import { Trash2, Settings2, X } from 'lucide-react';

export function PropertiesPanel({ selectedNode, updateNodeData, deleteNode, onClose, devices = [] }) {
  if (!selectedNode) {
    return (
      <div className="w-72 border-l border-slate-800 bg-slate-900/70 p-4 h-full flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-2">
          <Settings2 className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-300">No Node Selected</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-[180px]">
          Click on any node in the canvas to inspect and edit its parameters.
        </p>
      </div>
    );
  }

  const { type, data } = selectedNode;

  return (
    <div className="w-72 border-l border-slate-800 bg-slate-900/90 p-4 h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400">Node Properties</span>
          <h3 className="text-sm font-bold text-white capitalize">{type} Node</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic Fields */}
      <div className="space-y-4 flex-1">
        {/* Sensor Node Fields */}
        {type === 'sensor' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Device</label>
              <select
                value={data.deviceId || 'TURBINE_001'}
                onChange={(e) => updateNodeData('deviceId', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {devices.length > 0 ? (
                  devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.deviceId} ({d.name})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="TURBINE_001">TURBINE_001 (Main Turbine)</option>
                    <option value="PUMP_002">PUMP_002 (Coolant Pump)</option>
                    <option value="BOILER_003">BOILER_003 (Industrial Boiler)</option>
                    <option value="CONVEYOR_004">CONVEYOR_004 (Assembly Conveyor)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Telemetry Field</label>
              <select
                value={data.field || 'temperature'}
                onChange={(e) => updateNodeData('field', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 capitalize"
              >
                <option value="temperature">Temperature (°C)</option>
                <option value="pressure">Pressure (PSI)</option>
                <option value="humidity">Humidity (%)</option>
              </select>
            </div>
          </>
        )}

        {/* Moving Average Fields */}
        {type === 'movingAverage' && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Window Size (Readings)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={data.windowSize || 5}
              onChange={(e) => updateNodeData('windowSize', Math.max(1, Math.min(50, Number(e.target.value))))}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Smoothes noise across the last N continuous sensor values.</p>
          </div>
        )}

        {/* Condition Fields */}
        {type === 'condition' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Operator</label>
              <select
                value={data.operator || '>'}
                onChange={(e) => updateNodeData('operator', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              >
                <option value=">">&gt; (Greater than)</option>
                <option value=">=">&gt;= (Greater or equal)</option>
                <option value="<">&lt; (Less than)</option>
                <option value="<=">&lt;= (Less or equal)</option>
                <option value="==">== (Equals)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Threshold Value</label>
              <input
                type="number"
                value={data.value !== undefined ? data.value : 80}
                onChange={(e) => updateNodeData('value', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </>
        )}

        {/* SMS Alert Fields */}
        {type === 'sms' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Recipient Phone</label>
              <input
                type="tel"
                value={data.recipient || '+15550199'}
                onChange={(e) => updateNodeData('recipient', e.target.value)}
                placeholder="+15550199"
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Alert Message Template</label>
              <textarea
                rows={3}
                value={data.message || 'High temp spike on Turbine 001: {{value}}°C'}
                onChange={(e) => updateNodeData('message', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">Use <code className="text-red-400">{"{{value}}"}</code> to insert the reading dynamically.</p>
            </div>
          </>
        )}
      </div>

      {/* Delete Node Action */}
      <div className="pt-4 mt-auto border-t border-slate-800">
        <button
          onClick={() => deleteNode(selectedNode.id)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 rounded-md transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Node
        </button>
      </div>
    </div>
  );
}
