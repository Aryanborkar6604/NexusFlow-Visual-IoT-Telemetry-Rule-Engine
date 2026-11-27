import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, addEdge, Handle, Position, useEdgesState, useNodesState } from 'reactflow';
import { apiRequest, DEFAULT_API_URL } from './api.js';
import 'reactflow/dist/style.css';

const initialNodes = [
  { id: 'sensor-1', type: 'sensor', position: { x: 110, y: 210 }, data: { title: 'Turbine Sensor', subtitle: 'turbine-01 · temperature', value: '72.4 °C', sampleValue: 72.4, samples: [71.4, 72.0, 73.1, 72.7, 72.4], sensorId: 'turbine-01', field: 'temperature' } },
  { id: 'average-1', type: 'filter', position: { x: 410, y: 210 }, data: { title: 'Moving average', subtitle: 'Smooth noisy readings', detail: 'Window · 5 samples', window: 5, field: 'temperature' } },
  { id: 'condition-1', type: 'condition', position: { x: 710, y: 210 }, data: { title: 'Temperature limit', subtitle: 'Check operating range', detail: 'temperature > 80 °C', field: 'temperature', operator: 'gt', value: 80 } },
  { id: 'alert-1', type: 'alert', position: { x: 1010, y: 210 }, data: { title: 'Send alert', subtitle: 'Action trigger', detail: 'SMS · Shift manager', action: 'sms', phone: '+1 555 010 2020', message: 'Turbine temperature is above the safe limit.' } },
];
const initialEdges = [
  { id: 'e1', source: 'sensor-1', target: 'average-1', animated: true, style: { stroke: '#4f91ff', strokeWidth: 2 } },
  { id: 'e2', source: 'average-1', target: 'condition-1', animated: true, style: { stroke: '#4f91ff', strokeWidth: 2 } },
  { id: 'e3', source: 'condition-1', target: 'alert-1', sourceHandle: 'true', label: 'true', labelStyle: { fill: '#77d9a4', fontSize: 11 }, labelBgStyle: { fill: '#18251f' }, animated: true, style: { stroke: '#77d9a4', strokeWidth: 2 } },
];

const serializeGraph = (nodes, edges) => ({
  nodes: nodes.map(({ data, ...node }) => ({
    ...node,
    type: node.type === 'filter' ? 'movingAverage' : node.type,
    data: Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'previewState')),
  })),
  edges,
});
const hydrateGraph = (graph) => ({
  nodes: graph.nodes.map((node) => ({ ...node, type: node.type === 'movingAverage' ? 'filter' : node.type })),
  edges: graph.edges,
});

function NodeShell({ kind, icon, data, selected, children }) {
  return <div className={`flow-card ${kind} ${selected ? 'selected' : ''} ${data.previewState ? `preview-${data.previewState}` : ''}`}>
    {kind !== 'sensor' && <Handle type="target" position={Position.Left} />}
    <div className="flow-head"><span className={`node-icon ${kind}`}>{icon}</span><span className="node-kicker">{kind === 'sensor' ? 'DATA SOURCE' : kind === 'filter' || kind === 'math' ? 'TRANSFORM' : kind === 'condition' ? 'LOGIC' : 'ACTION'}</span><span className="node-menu">•••</span></div>
    <strong>{data.title}</strong><span className="node-subtitle">{data.subtitle}</span>
    {kind === 'sensor' ? <div className="sensor-value"><i />{data.value}<span>LIVE</span></div> : <div className="node-detail">{data.detail}</div>}
    {kind !== 'alert' && <Handle type="source" position={Position.Right} id={kind === 'condition' ? 'true' : undefined} />}
    {kind === 'condition' && <Handle type="source" position={Position.Bottom} id="false" style={{ left: '50%' }} />}
    {children}
  </div>;
}
const nodeTypes = {
  sensor: (props) => <NodeShell {...props} kind="sensor" icon="⌁" />,
  filter: (props) => <NodeShell {...props} kind="filter" icon="◉" />,
  mathOperation: (props) => <NodeShell {...props} kind="math" icon="±" />,
  condition: (props) => <NodeShell {...props} kind="condition" icon="◇" />,
  alert: (props) => <NodeShell {...props} kind="alert" icon="↗" />,
};
const library = [
  { type: 'sensor', icon: '⌁', name: 'Data source', desc: 'Sensor or device input', className: 'sensor' },
  { type: 'filter', icon: '◉', name: 'Moving average', desc: 'Smooth a measurement', className: 'filter' },
  { type: 'mathOperation', icon: '±', name: 'Math operation', desc: 'Transform a numeric value', className: 'math' },
  { type: 'condition', icon: '◇', name: 'Condition', desc: 'Branch on a threshold', className: 'condition' },
  { type: 'alert', icon: '↗', name: 'Action trigger', desc: 'Webhook or SMS alert', className: 'alert' },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(() => {
    try { return JSON.parse(localStorage.getItem('nexusflow.rule.v1'))?.graph?.nodes ?? initialNodes; } catch { return initialNodes; }
  });
  const [edges, setEdges, onEdgesChange] = useEdgesState(() => {
    try { return JSON.parse(localStorage.getItem('nexusflow.rule.v1'))?.graph?.edges ?? initialEdges; } catch { return initialEdges; }
  });
  const [active, setActive] = useState('condition-1');
  const [saved, setSaved] = useState(() => localStorage.getItem('nexusflow.rule.v1') ? 'Draft restored' : 'Sample rule');
  const [toast, setToast] = useState('');
  const [preview, setPreview] = useState(null);
  const [ruleName, setRuleName] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexusflow.rule.v1'))?.name ?? 'Turbine temperature guard'; } catch { return 'Turbine temperature guard'; }
  });
  const [apiBase, setApiBase] = useState(() => localStorage.getItem('nexusflow.api.url') ?? DEFAULT_API_URL);
  const [token, setToken] = useState(() => localStorage.getItem('nexusflow.api.token') ?? '');
  const [account, setAccount] = useState(() => { try { return JSON.parse(localStorage.getItem('nexusflow.api.user') ?? 'null'); } catch { return null; } });
  const [remoteRuleId, setRemoteRuleId] = useState(() => localStorage.getItem('nexusflow.api.ruleId') ?? '');
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [connectionStatus, setConnectionStatus] = useState('offline');
  const [connectionError, setConnectionError] = useState('');
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [connectionForm, setConnectionForm] = useState({ url: apiBase, email: '', password: '' });
  const nodeTypesMemo = useMemo(() => nodeTypes, []);
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    if (changes.some((change) => change.type === 'position' || change.type === 'remove')) setSaved('Unsaved changes');
  }, [onNodesChange]);
  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    if (changes.some((change) => change.type === 'remove' || change.type === 'add' || change.type === 'reset')) setSaved('Unsaved changes');
  }, [onEdgesChange]);
  const onConnect = useCallback((connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#4f91ff', strokeWidth: 2 } }, eds));
    setSaved('Unsaved changes');
  }, [setEdges]);
  const liveSensor = nodes.find((node) => node.type === 'sensor');
  const liveSensorId = liveSensor?.data?.sensorId ?? '';
  const liveField = liveSensor?.data?.field ?? 'temperature';
  useEffect(() => {
    if (!token) { setConnectionStatus('offline'); return undefined; }
    setConnectionStatus('connecting');
    let socket;
    try {
      const socketUrl = `${apiBase.replace(/^http/, 'ws').replace(/\/$/, '')}/ws?token=${encodeURIComponent(token)}`;
      socket = new WebSocket(socketUrl);
    } catch {
      setConnectionStatus('offline');
      return undefined;
    }
    socket.onopen = () => {
      setConnectionStatus('connected');
      socket.send(JSON.stringify({ type: 'subscribe', sensorId: liveSensorId || '*' }));
    };
    socket.onmessage = (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'telemetry' && message.data?.sensorId === liveSensorId) {
        const sensor = nodes.find((node) => node.type === 'sensor' && node.data.sensorId === liveSensorId);
        const field = liveField ?? Object.keys(message.data.measurements ?? {})[0];
        const reading = Number(message.data.measurements?.[field]);
        if (Number.isFinite(reading)) {
          const unit = liveField === 'temperature' ? '°C' : liveField === 'pressure' ? 'kPa' : liveField === 'vibration' ? 'mm/s' : '';
          setNodes((all) => all.map((node) => node.id === sensor?.id ? { ...node, data: { ...node.data, sampleValue: reading, value: `${reading} ${unit}`.trim(), liveAt: message.data.timestamp } : node));
        }
      }
      if (message.type === 'alert') {
        setToast(`Alert received: ${message.data?.message ?? 'Rule action triggered'}`);
        window.setTimeout(() => setToast(''), 4000);
      }
    };
    socket.onerror = () => setConnectionStatus('offline');
    socket.onclose = () => setConnectionStatus('offline');
    return () => { socket.close(); };
  }, [token, apiBase, liveSensorId, liveField]);
  const connectAccount = async (event) => {
    event.preventDefault();
    setConnectionBusy(true); setConnectionError('');
    const cleanBase = connectionForm.url.trim().replace(/\/$/, '');
    try {
      const session = await apiRequest(cleanBase, `/api/auth/${authMode}`, { method: 'POST', body: JSON.stringify({ email: connectionForm.email, password: connectionForm.password }) });
      localStorage.setItem('nexusflow.api.url', cleanBase);
      localStorage.setItem('nexusflow.api.token', session.token);
      localStorage.setItem('nexusflow.api.user', JSON.stringify(session.user));
      localStorage.removeItem('nexusflow.api.ruleId'); setRemoteRuleId('');
      setApiBase(cleanBase); setToken(session.token); setAccount(session.user); setConnectionForm((form) => ({ ...form, password: '' }));
      const savedRules = await apiRequest(cleanBase, '/api/rules', { token: session.token });
      const matched = savedRules.find((rule) => rule.name === ruleName) ?? savedRules[0];
      if (matched) {
        setRemoteRuleId(matched._id); localStorage.setItem('nexusflow.api.ruleId', matched._id);
        const graph = hydrateGraph(matched.graph);
        setRuleName(matched.name); setNodes(graph.nodes); setEdges(graph.edges); setSaved('Loaded from server');
      } else {
        setRemoteRuleId(''); localStorage.removeItem('nexusflow.api.ruleId');
      }
      setConnectionStatus('connecting'); setConnectionOpen(false); setToast(`Connected as ${session.user.email}`); window.setTimeout(() => setToast(''), 2500);
    } catch (error) { setConnectionError(error.message); }
    finally { setConnectionBusy(false); }
  };
  const disconnectAccount = () => {
    localStorage.removeItem('nexusflow.api.token'); localStorage.removeItem('nexusflow.api.user'); localStorage.removeItem('nexusflow.api.ruleId');
    setToken(''); setAccount(null); setRemoteRuleId(''); setConnectionStatus('offline'); setConnectionOpen(false);
  };
  const sendTelemetry = async () => {
    if (!token) { setConnectionOpen(true); setConnectionError('Sign in to send telemetry to the API.'); return; }
    if (selected?.type !== 'sensor') return;
    const field = selected.data.field ?? 'temperature';
    const point = { sensorId: selected.data.sensorId, deviceId: selected.data.sensorId, timestamp: new Date().toISOString(), measurements: { [field]: Number(selected.data.sampleValue ?? 72.4) } };
    try {
      const result = await apiRequest(apiBase, '/api/telemetry', { token, method: 'POST', body: JSON.stringify(point) });
      setToast(`Telemetry accepted · ${result.accepted} point`); window.setTimeout(() => setToast(''), 3000);
    } catch (error) { setToast(`Telemetry error: ${error.message}`); window.setTimeout(() => setToast(''), 4000); }
  };
  const selected = nodes.find((node) => node.id === active) ?? nodes[0];
  const updateSelected = (field, value) => {
    setSaved('Unsaved changes');
    setNodes((all) => all.map((node) => {
      if (node.id !== selected?.id) return node;
      const data = { ...node.data, [field]: value };
      if (field === 'action') {
        if (value === 'sms') delete data.webhookUrl;
        if (value === 'webhook') delete data.phone;
      }
      if (field === 'sampleValue') data.value = `${value} °C`;
      if (node.type === 'condition' && (field === 'value' || field === 'operator' || field === 'field')) data.detail = `${data.field ?? 'value'} ${({ gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=' }[data.operator] ?? '>')} ${data.value ?? 80}`;
      if (field === 'window') data.detail = `Window · ${value} samples`;
      if (node.type === 'mathOperation' && ['field', 'operation', 'operand'].includes(field)) data.detail = `${data.field ?? 'value'} ${({ add: '+', subtract: '−', multiply: '×', divide: '÷', modulo: '%' }[data.operation] ?? '+')} ${data.operand ?? 1}`;
      if (field === 'phone' || field === 'action') data.detail = `${data.action === 'webhook' ? 'Webhook' : 'SMS'} · ${data.phone || 'Configure'}`;
      return { ...node, data };
    }));
  };
  const addNode = (item) => {
    const id = `${item.type}-${Date.now()}`;
    if (item.type === 'sensor' && nodes.some((node) => node.type === 'sensor')) { setToast('This rule supports one sensor source'); window.setTimeout(() => setToast(''), 2400); return; }
    const titles = { sensor: 'New sensor', filter: 'Moving average', mathOperation: 'Math operation', condition: 'New condition', alert: 'New action' };
    const data = { title: titles[item.type], subtitle: item.desc, detail: item.type === 'filter' ? 'Window · 5 samples' : 'Configure this node' };
    if (item.type === 'sensor') Object.assign(data, { subtitle: 'Select a device', value: '72.4 °C', sampleValue: 72.4, sensorId: 'turbine-01', field: 'temperature' });
    if (item.type === 'filter') Object.assign(data, { window: 5, field: 'temperature' });
    if (item.type === 'mathOperation') Object.assign(data, { field: 'temperature', operation: 'multiply', operand: 1, outputField: 'result' }, { detail: 'temperature × 1' });
    if (item.type === 'condition') Object.assign(data, { field: 'temperature', operator: 'gt', value: 80 });
    if (item.type === 'alert') Object.assign(data, { action: 'webhook', phone: '', message: '' }, { detail: 'Webhook · Configure' });
    setNodes((all) => [...all, { id, type: item.type, position: { x: 260 + Math.random() * 340, y: 100 + Math.random() * 360 }, data }]);
    setActive(id);
    setSaved('Unsaved changes');
  };
  const save = async () => {
    const localNodes = nodes.map(({ data, ...node }) => ({ ...node, data: Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'previewState')) }));
    const draft = { name: ruleName, enabled: true, graph: { nodes: localNodes, edges } };
    const rule = { ...draft, graph: serializeGraph(nodes, edges) };
    localStorage.setItem('nexusflow.rule.v1', JSON.stringify(draft));
    if (!token) { setSaved('Saved in this browser'); setToast('Rule saved in this browser'); window.setTimeout(() => setToast(''), 2400); return; }
    try {
      const path = remoteRuleId ? `/api/rules/${encodeURIComponent(remoteRuleId)}` : '/api/rules';
      const result = await apiRequest(apiBase, path, { token, method: remoteRuleId ? 'PUT' : 'POST', body: JSON.stringify(rule) });
      const id = result._id ?? remoteRuleId;
      setRemoteRuleId(id); localStorage.setItem('nexusflow.api.ruleId', id); setSaved('Saved to server'); setToast('Rule saved to NexusFlow');
    } catch (error) { setSaved('Saved locally · server error'); setToast(`Local draft saved; API error: ${error.message}`); }
    window.setTimeout(() => setToast(''), 4000);
  };
  const runPreview = () => {
    const states = {};
    const starts = nodes.filter((node) => node.type === 'sensor');
    if (!starts.length) { setPreview({ states, summary: 'Add a data source to run this preview.' }); return; }
    const queue = starts.map((node) => ({ node, value: Number(node.data.sampleValue ?? 72.4), measurements: { [node.data.field ?? 'temperature']: Number(node.data.sampleValue ?? 72.4) }, path: [node.id] }));
    let alerts = 0; let visits = 0;
    while (queue.length && visits < Math.max(nodes.length * 3, 3)) {
      const current = queue.shift(); visits += 1;
      states[current.node.id] = 'pass';
      if (current.node.type === 'condition') {
        const threshold = Number(current.node.data.value ?? 0);
        const value = Number(current.node.data.field ? current.measurements[current.node.data.field] ?? current.value : current.value);
        const passed = ({ gt: value > threshold, gte: value >= threshold, lt: value < threshold, lte: value <= threshold, eq: value === threshold })[current.node.data.operator ?? 'gt'];
        states[current.node.id] = passed ? 'pass' : 'fail';
        const next = edges.filter((edge) => edge.source === current.node.id && (passed ? edge.sourceHandle !== 'false' : edge.sourceHandle === 'false'));
        next.forEach((edge) => { const target = nodes.find((node) => node.id === edge.target); if (target) queue.push({ node: target, value, measurements: { ...current.measurements }, path: [...current.path, target.id] }); });
        continue;
      }
      if (current.node.type === 'alert') { alerts += 1; states[current.node.id] = 'triggered'; continue; }
      const outgoing = edges.filter((edge) => edge.source === current.node.id);
      let nextValue = current.value;
      const nextMeasurements = { ...current.measurements };
      if (current.node.type === 'filter') {
        const history = starts.find((node) => node.id === current.path[0])?.data.samples ?? [];
        const size = Math.max(1, Number(current.node.data.window ?? 5));
        const previousValues = size === 1 ? [] : history.slice(0, -1).slice(-(size - 1));
        const windowValues = [...previousValues, Number(current.value)];
        nextValue = windowValues.reduce((sum, item) => sum + Number(item), 0) / windowValues.length;
        nextMeasurements[current.node.data.field ?? 'temperature'] = nextValue;
      } else if (current.node.type === 'mathOperation') {
        const operand = Number(current.node.data.operand ?? 0);
        const inputValue = Number(current.node.data.field ? current.measurements[current.node.data.field] ?? current.value : current.value);
        nextValue = ({ add: inputValue + operand, subtract: inputValue - operand, multiply: inputValue * operand, divide: inputValue / operand, modulo: inputValue % operand })[current.node.data.operation] ?? inputValue;
        nextMeasurements[current.node.data.outputField ?? 'result'] = nextValue;
      }
      outgoing.forEach((edge) => { const target = nodes.find((node) => node.id === edge.target); if (target) queue.push({ node: target, value: nextValue, measurements: { ...nextMeasurements }, path: [...current.path, target.id] }); });
    }
    setNodes((all) => all.map((node) => ({ ...node, data: { ...node.data, previewState: states[node.id] ?? 'idle' } })));
    const sample = starts[0].data.sampleValue ?? 72.4;
    setPreview({ states, summary: alerts ? `Preview passed: ${alerts} alert action${alerts === 1 ? '' : 's'} triggered using ${sample} °C sample data.` : `Preview complete: no alert action was triggered using ${sample} °C sample data.` });
  };
  const exportGraph = () => {
    const blob = new Blob([JSON.stringify({ name: ruleName, enabled: true, graph: serializeGraph(nodes, edges) }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'nexusflow-rule.json'; link.click(); URL.revokeObjectURL(link.href);
    setToast('Rule graph exported as JSON'); window.setTimeout(() => setToast(''), 2400);
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">N</span><span>Nexus<span className="brand-light">Flow</span></span><span className="brand-divider"/><span className="workspace-name">Workspace <span>⌄</span></span></div>
      <div className="top-center"><span className="crumb-muted">Automation</span><span className="crumb-slash">/</span><span>{ruleName}</span><span className="unsaved-dot" title={saved}/></div>
      <div className="top-actions"><span className="save-state">✓ {saved}</span><button className={`connect-button ${token ? 'connected' : ''}`} onClick={() => { setConnectionForm((form) => ({ ...form, url: apiBase })); setConnectionError(''); setConnectionOpen(true); }}><i/>{token ? account?.email ?? 'Connected' : 'Connect API'}</button>{token && <button className="disconnect-button" onClick={disconnectAccount}>Disconnect</button>}<button className="publish-button" onClick={save}>Save rule <span>↗</span></button></div>
    </header>
    <div className="page-tabs"><button className="tab active">◈ <span>Rule builder</span></button><button className="tab">▥ <span>Live monitor</span></button><div className="tabs-right"><span className={`status-pill ${connectionStatus}`}><i/> {connectionStatus === 'connected' ? 'Live stream connected' : connectionStatus === 'connecting' ? 'Connecting to API…' : 'Local preview mode'}</span><button className="icon-button">⋯</button></div></div>
    <main className="workspace">
      <aside className="sidebar">
        <div className="side-top"><span className="section-label">AUTOMATIONS</span><button className="tiny-plus">+</button></div>
        <button className="side-link muted">⌂ <span>Overview</span></button><button className="side-link selected-link">◈ <span>Rule builder</span><span className="side-count">3</span></button><button className="side-link muted">◷ <span>Activity log</span></button>
        <div className="side-separator"/><div className="side-top"><span className="section-label">YOUR RULES</span><button className="tiny-plus">+</button></div>
        <button className="rule-link current"><span className="rule-dot green"/><span>Turbine temperature<br/>guard</span><span className="rule-more">···</span></button><button className="rule-link"><span className="rule-dot amber"/><span>Vibration anomaly<br/>watch</span></button><button className="rule-link"><span className="rule-dot gray"/><span>Pressure drift<br/>monitor</span></button>
        <div className="sidebar-footer"><div className="plan-icon">⌁</div><div><b>Starter workspace</b><small>2 of 5 rules active</small></div><span className="upgrade-arrow">↗</span></div>
      </aside>
      <section className="main-area">
        <div className="rule-heading"><div><div className="eyebrow"><span className="rule-dot green"/> ACTIVE RULE <span className="heading-divider">·</span> {saved.toUpperCase()}</div><h1><input aria-label="Rule name" className="rule-name-input" value={ruleName} onChange={(event) => { setRuleName(event.target.value); setSaved('Unsaved changes'); }}/> <button className="edit-title" aria-label="Edit rule name">✎</button></h1><p>Monitor turbine temperature and alert the shift manager when readings exceed safe limits.</p></div><div className="heading-actions"><button className="secondary-button" onClick={exportGraph}>⇩ <span>Export JSON</span></button><button className="secondary-button" onClick={runPreview}>◉ <span>Test rule</span></button><button className="primary-button" onClick={save}>Save changes <span>⌘ S</span></button></div></div>
        <div className="toolbar"><div className="toolbar-left"><span className="canvas-mode"><i/> CANVAS</span><span className="toolbar-divider"/><button className="tool-button">↶</button><button className="tool-button disabled">↷</button><span className="toolbar-divider"/><span className="zoom-label">100%</span><button className="tool-button">−</button><button className="tool-button">+</button></div><div className="toolbar-right"><span className="autosave"><i/> {saved}</span><button className="run-button" onClick={runPreview}>▶ <span>Run preview</span></button></div></div>
        <div className="canvas-layout">
          <div className="canvas-wrap">
            <div className="canvas-caption"><span>RULE FLOW</span><span className="caption-sep">·</span><span>{nodes.length} nodes</span><span className="caption-sep">·</span><span>{edges.length} connections</span></div>
            {preview && <div className="preview-result"><b>PREVIEW RESULT</b><span>{preview.summary}</span><button aria-label="Dismiss preview" onClick={() => { setPreview(null); setNodes((all) => all.map(({ data, ...node }) => ({ ...node, data: Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'previewState')) }))); }}>×</button></div>}
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypesMemo} onNodesChange={handleNodesChange} onEdgesChange={handleEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => setActive(node.id)} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.3} maxZoom={1.5}>
              <Background color="#202a35" gap={22} size={1} /><Controls showInteractive={false}/><MiniMap nodeColor={(node) => ({ sensor:'#4f91ff', filter:'#9d7cff', mathOperation:'#6fc9c0', condition:'#edb761', alert:'#e27ea1' }[node.type] || '#45515f')} maskColor="rgba(10,15,21,.72)"/>
            </ReactFlow>
            <div className="canvas-hint">Drag nodes to arrange <span>·</span> Connect ports to build your rule</div>
          </div>
          <aside className="inspector">
            <div className="inspector-title"><div><span className="section-label">NODE SETTINGS</span><h3>{selected?.data?.title ?? 'Select a node'}</h3></div><button className="icon-button">⋯</button></div>
            {selected ? <>
              <label className="field-label">Node name</label><input className="text-input" value={selected.data.title} onChange={(e) => updateSelected('title', e.target.value)}/>
              {selected.type === 'condition' ? <><label className="field-label spaced">Measurement</label><select className="text-input" value={selected.data.field ?? 'temperature'} onChange={(e) => updateSelected('field', e.target.value)}><option value="temperature">temperature</option><option value="vibration">vibration</option><option value="pressure">pressure</option></select><label className="field-label spaced">Condition</label><div className="condition-row"><select className="text-input" value={selected.data.operator ?? 'gt'} onChange={(e) => updateSelected('operator', e.target.value)}><option value="gt">Greater than</option><option value="gte">Greater or equal</option><option value="lt">Less than</option><option value="lte">Less or equal</option><option value="eq">Equal to</option></select><input className="text-input threshold" type="number" value={selected.data.value ?? 80} onChange={(e) => updateSelected('value', Number(e.target.value))}/></div><span className="field-help">Rule passes when {selected.data.field ?? 'temperature'} meets this condition.</span></> : selected.type === 'sensor' ? <><label className="field-label spaced">Device ID</label><input className="text-input" value={selected.data.sensorId ?? 'turbine-01'} onChange={(e) => updateSelected('sensorId', e.target.value)}/><label className="field-label spaced">Sample value · °C</label><input className="text-input" type="number" step="0.1" value={selected.data.sampleValue ?? 72.4} onChange={(e) => updateSelected('sampleValue', Number(e.target.value))}/><label className="field-label spaced">Measurement</label><select className="text-input" value={selected.data.field ?? 'temperature'} onChange={(e) => updateSelected('field', e.target.value)}><option value="temperature">temperature · °C</option><option value="vibration">vibration · mm/s</option><option value="pressure">pressure · kPa</option></select></> : selected.type === 'filter' ? <><label className="field-label spaced">Measurement</label><select className="text-input" value={selected.data.field ?? 'temperature'} onChange={(e) => updateSelected('field', e.target.value)}><option value="temperature">temperature</option><option value="vibration">vibration</option><option value="pressure">pressure</option></select><label className="field-label spaced">Window size</label><div className="stepper"><button onClick={() => updateSelected('window', Math.max(1, Number(selected.data.window ?? 5) - 1))}>−</button><span>{selected.data.window ?? 5} <small>samples</small></span><button onClick={() => updateSelected('window', Math.min(10000, Number(selected.data.window ?? 5) + 1))}>+</button></div></> : selected.type === 'mathOperation' ? <><label className="field-label spaced">Input measurement</label><select className="text-input" value={selected.data.field ?? 'temperature'} onChange={(e) => updateSelected('field', e.target.value)}><option value="temperature">temperature</option><option value="vibration">vibration</option><option value="pressure">pressure</option></select><label className="field-label spaced">Operation</label><select className="text-input" value={selected.data.operation ?? 'multiply'} onChange={(e) => updateSelected('operation', e.target.value)}><option value="add">Add</option><option value="subtract">Subtract</option><option value="multiply">Multiply</option><option value="divide">Divide</option><option value="modulo">Modulo</option></select><label className="field-label spaced">Operand</label><input className="text-input" type="number" step="any" value={selected.data.operand ?? 1} onChange={(e) => updateSelected('operand', Number(e.target.value))}/><label className="field-label spaced">Output field</label><input className="text-input" value={selected.data.outputField ?? 'result'} onChange={(e) => updateSelected('outputField', e.target.value)}/></> : <><label className="field-label spaced">Action</label><select className="text-input" value={selected.data.action ?? 'sms'} onChange={(e) => updateSelected('action', e.target.value)}><option value="sms">SMS notification</option><option value="webhook">Webhook</option></select>{selected.data.action === 'webhook' ? <><label className="field-label spaced">Webhook URL</label><input className="text-input" type="url" value={selected.data.webhookUrl ?? ''} placeholder="https://example.com/hook" onChange={(e) => updateSelected('webhookUrl', e.target.value)}/></> : <><label className="field-label spaced">Recipient</label><input className="text-input" value={selected.data.phone ?? ''} placeholder="+1 555 010 2020" onChange={(e) => updateSelected('phone', e.target.value)}/></>}<label className="field-label spaced">Message</label><input className="text-input" value={selected.data.message ?? ''} placeholder="Alert message" onChange={(e) => updateSelected('message', e.target.value)}/></>}
              {selected.type === 'sensor' && <button className="send-telemetry" onClick={sendTelemetry}>⇧ <span>{token ? 'Send live sample' : 'Connect to send live data'}</span></button>}
              <div className="inspector-divider"/><div className="output-row"><span className="output-dot"/><div><b>Output</b><small>{selected.type === 'condition' ? 'Boolean · true / false' : selected.type === 'sensor' ? 'Number · temperature' : selected.type === 'filter' ? 'Number · smoothed value' : selected.type === 'mathOperation' ? 'Number · calculated result' : 'Mock action · logged'}</small></div><span className="output-arrow">→</span></div>
            </> : <p className="empty-inspector">Choose a node on the canvas to edit its settings.</p>}
            <div className="inspector-bottom"><button className="delete-node" onClick={() => { if (!selected) return; setNodes((all) => all.filter((node) => node.id !== selected.id)); setEdges((all) => all.filter((edge) => edge.source !== selected.id && edge.target !== selected.id)); setActive(''); setSaved('Unsaved changes'); }}>⌫ <span>Delete node</span></button><span>Changes apply instantly</span></div>
          </aside>
        </div>
        <div className="bottom-panel"><div className="panel-title"><span className="panel-grip">⠿</span><div><b>Node library</b><small>Drag a block onto the canvas to extend your flow</small></div></div><div className="library-items">{library.map((item) => <button key={item.type} className="library-card" onClick={() => addNode(item)}><span className={`library-icon ${item.className}`}>{item.icon}</span><span><b>{item.name}</b><small>{item.desc}</small></span><span className="add-symbol">+</span></button>)}</div></div>
      </section>
    </main>
    {connectionOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConnectionOpen(false); }}><form className="connect-modal" onSubmit={token ? (event) => event.preventDefault() : connectAccount}><div className="modal-kicker">NEXUSFLOW API</div><button type="button" className="modal-close" aria-label="Close" onClick={() => setConnectionOpen(false)}>×</button><h2>{token ? 'API connection' : 'Connect your workspace'}</h2><p>{token ? `Signed in as ${account?.email ?? 'your account'}.` : 'Sign in to save rules to MongoDB and receive live telemetry over WebSockets.'}</p><label className="modal-label">API base URL</label><input className="modal-input" type="url" required readOnly={Boolean(token)} value={connectionForm.url} onChange={(event) => setConnectionForm((form) => ({ ...form, url: event.target.value }))} placeholder="http://localhost:4000"/>{!token && <><div className="auth-tabs"><button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setConnectionError(''); }}>Sign in</button><button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setConnectionError(''); }}>Create account</button></div><label className="modal-label">Email</label><input className="modal-input" type="email" required autoComplete="email" value={connectionForm.email} onChange={(event) => setConnectionForm((form) => ({ ...form, email: event.target.value }))} placeholder="you@company.com"/><label className="modal-label">Password</label><input className="modal-input" type="password" required minLength={8} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={connectionForm.password} onChange={(event) => setConnectionForm((form) => ({ ...form, password: event.target.value }))} placeholder="At least 8 characters"/></>}{connectionError && <div className="connection-error">{connectionError}</div>}<div className="modal-actions">{token ? <><button type="button" className="disconnect-button" onClick={disconnectAccount}>Disconnect</button><button type="button" className="primary-button" onClick={() => setConnectionOpen(false)}>Done</button></> : <button type="submit" className="primary-button" disabled={connectionBusy}>{connectionBusy ? 'Connecting…' : authMode === 'login' ? 'Sign in' : 'Create account'}</button>}</div><small className="modal-footnote">The API stores your rules and account data. Passwords are never saved in this browser.</small></form></div>}
    <div className="toast" data-visible={Boolean(toast)}>{toast}</div>
  </div>;
}
