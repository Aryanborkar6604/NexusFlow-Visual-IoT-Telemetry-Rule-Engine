import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SensorNode } from '../nodes/SensorNode.jsx';
import { MovingAverageNode } from '../nodes/MovingAverageNode.jsx';
import { ConditionNode } from '../nodes/ConditionNode.jsx';
import { SmsAlertNode } from '../nodes/SmsAlertNode.jsx';
import { NodePalette } from '../sidebar/NodePalette.jsx';
import { PropertiesPanel } from '../sidebar/PropertiesPanel.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { workflowService } from '../../services/workflowService.js';
import { Play, Square, Save, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';

const INITIAL_NODES = [
  {
    id: 'sensor1',
    type: 'sensor',
    position: { x: 50, y: 150 },
    data: { deviceId: 'TURBINE_001', field: 'temperature' },
  },
  {
    id: 'filter1',
    type: 'movingAverage',
    position: { x: 300, y: 150 },
    data: { windowSize: 5 },
  },
  {
    id: 'condition1',
    type: 'condition',
    position: { x: 550, y: 150 },
    data: { operator: '>', value: 80 },
  },
  {
    id: 'alert1',
    type: 'sms',
    position: { x: 800, y: 150 },
    data: { recipient: '+15550199', message: 'Turbine Overheat: {{value}}°C!' },
  },
];

const INITIAL_EDGES = [
  { id: 'e1-2', source: 'sensor1', target: 'filter1', animated: true },
  { id: 'e2-3', source: 'filter1', target: 'condition1', animated: true },
  { id: 'e3-4', source: 'condition1', target: 'alert1', animated: true },
];

export function FlowCanvas({ initialWorkflowId = 'wf_turbine_01' }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [workflowName, setWorkflowName] = useState('Turbine Temperature Monitoring');
  const [workflowId, setWorkflowId] = useState(initialWorkflowId);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const { socket } = useSocket();
  const reactFlowWrapper = useRef(null);

  const nodeTypes = useMemo(() => ({
    sensor: SensorNode,
    movingAverage: MovingAverageNode,
    condition: ConditionNode,
    sms: SmsAlertNode,
  }), []);

  // Connect handle to handle
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  // Drag and drop from palette onto canvas
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 80,
        y: event.clientY - bounds.top - 40,
      };

      const newNodeId = `${type}_${Date.now().toString(36).substr(-4)}`;
      let defaultData = {};
      if (type === 'sensor') defaultData = { deviceId: 'TURBINE_001', field: 'temperature' };
      if (type === 'movingAverage') defaultData = { windowSize: 5 };
      if (type === 'condition') defaultData = { operator: '>', value: 80 };
      if (type === 'sms') defaultData = { recipient: '+15550199', message: 'Alert: {{value}}' };

      const newNode = {
        id: newNodeId,
        type,
        position,
        data: defaultData,
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNodeId);
    },
    [setNodes]
  );

  // Node selection
  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Properties panel data update
  const updateNodeData = useCallback(
    (field, value) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === selectedNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                [field]: value,
              },
            };
          }
          return n;
        })
      );
    },
    [selectedNodeId, setNodes]
  );

  // Delete node
  const deleteNode = useCallback(
    (id) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges]
  );

  // Save workflow
  const handleSave = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const payload = {
        id: workflowId,
        name: workflowName,
        nodes,
        edges,
        status: isRunning ? 'active' : 'inactive',
      };
      const res = await workflowService.saveWorkflow(payload);
      setStatusMessage('Workflow saved & validated successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      const details = err.response?.data?.details || err.message;
      setErrorMessage(`Validation error: ${details}`);
    }
  };

  // Toggle Start / Stop
  const handleToggle = async () => {
    setErrorMessage(null);
    try {
      // Always save first before toggling to ensure backend has latest graph
      const payload = {
        id: workflowId,
        name: workflowName,
        nodes,
        edges,
      };
      await workflowService.saveWorkflow(payload);
      const res = await workflowService.toggleWorkflow(workflowId);
      setIsRunning(res.isRunning);
      setStatusMessage(res.message);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      const details = err.response?.data?.details || err.message;
      setErrorMessage(`Failed to start: ${details}`);
    }
  };

  // Listen to live node status pulses from Socket.IO
  useEffect(() => {
    if (!socket) return;

    socket.emit('subscribe:workflow', { workflowId });

    const handleNodeStatus = (statusPayload) => {
      if (statusPayload.workflowId !== workflowId) return;

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === statusPayload.nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                liveValue: statusPayload.value,
                isPulsing: true,
                triggerCount: n.type === 'sms' ? (n.data.triggerCount || 0) + 1 : n.data.triggerCount,
              },
            };
          }
          return n;
        })
      );

      // Remove pulse after 800ms
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === statusPayload.nodeId
              ? { ...n, data: { ...n.data, isPulsing: false } }
              : n
          )
        );
      }, 850);
    };

    socket.on('workflow:nodeStatus', handleNodeStatus);

    return () => {
      socket.off('workflow:nodeStatus', handleNodeStatus);
      socket.emit('unsubscribe:workflow', { workflowId });
    };
  }, [socket, workflowId, setNodes]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-[calc(100vh-61px)]">
      {/* Canvas Toolbar */}
      <div className="border-b border-slate-800 bg-slate-900/90 px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500 rounded px-2 py-1 text-sm font-bold text-white focus:outline-none"
          />
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium flex items-center gap-1.5 ${
              isRunning
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {isRunning ? 'PIPELINE ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md font-medium border border-slate-700 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Save Workflow
          </button>

          <button
            onClick={handleToggle}
            className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-md font-semibold transition-all shadow-sm ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Pipeline
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Pipeline
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status or Error Notification Bar */}
      {statusMessage && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-1.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-950/80 border-b border-red-800/80 px-4 py-1.5 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Builder Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Palette */}
        <NodePalette />

        {/* Center: React Flow Canvas */}
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
          >
            <Background color="#334155" gap={20} size={1} />
            <Controls className="!bg-slate-900 !border-slate-800 !text-white" />
            <MiniMap
              nodeStrokeColor="#475569"
              nodeColor="#1e293b"
              maskColor="rgba(15, 23, 42, 0.7)"
              className="!bg-slate-950 !border !border-slate-800 !rounded-lg"
            />
          </ReactFlow>

          {/* Empty Canvas Placeholder Overlay */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 text-center max-w-sm backdrop-blur">
                <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-white">Empty Canvas</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Drag and drop a <strong>Sensor</strong> node from the left palette to begin constructing your real-time automation pipeline.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Properties Panel */}
        <PropertiesPanel
          selectedNode={selectedNode}
          updateNodeData={updateNodeData}
          deleteNode={deleteNode}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>
    </div>
  );
}
