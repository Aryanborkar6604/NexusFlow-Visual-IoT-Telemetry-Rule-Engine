import { useCallback, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, addEdge, Handle, Position, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  { id: 'sensor-1', type: 'sensor', position: { x: 110, y: 210 }, data: { title: 'Turbine Sensor', subtitle: 'turbine-01 · temperature', value: '72.4 °C' } },
  { id: 'average-1', type: 'filter', position: { x: 410, y: 210 }, data: { title: 'Moving average', subtitle: 'Smooth noisy readings', detail: 'Window · 5 samples' } },
  { id: 'condition-1', type: 'condition', position: { x: 710, y: 210 }, data: { title: 'Temperature limit', subtitle: 'Check operating range', detail: 'temperature > 80 °C' } },
  { id: 'alert-1', type: 'alert', position: { x: 1010, y: 210 }, data: { title: 'Send alert', subtitle: 'Action trigger', detail: 'SMS · Shift manager' } },
];
const initialEdges = [
  { id: 'e1', source: 'sensor-1', target: 'average-1', animated: true, style: { stroke: '#4f91ff', strokeWidth: 2 } },
  { id: 'e2', source: 'average-1', target: 'condition-1', animated: true, style: { stroke: '#4f91ff', strokeWidth: 2 } },
  { id: 'e3', source: 'condition-1', target: 'alert-1', sourceHandle: 'true', label: 'true', labelStyle: { fill: '#77d9a4', fontSize: 11 }, labelBgStyle: { fill: '#18251f' }, animated: true, style: { stroke: '#77d9a4', strokeWidth: 2 } },
];

function NodeShell({ kind, icon, data, selected, children }) {
  return <div className={`flow-card ${kind} ${selected ? 'selected' : ''}`}>
    {kind !== 'sensor' && <Handle type="target" position={Position.Left} />}
    <div className="flow-head"><span className={`node-icon ${kind}`}>{icon}</span><span className="node-kicker">{kind === 'sensor' ? 'DATA SOURCE' : kind === 'filter' ? 'TRANSFORM' : kind === 'condition' ? 'LOGIC' : 'ACTION'}</span><span className="node-menu">•••</span></div>
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
  condition: (props) => <NodeShell {...props} kind="condition" icon="◇" />,
  alert: (props) => <NodeShell {...props} kind="alert" icon="↗" />,
};
const library = [
  { type: 'sensor', icon: '⌁', name: 'Data source', desc: 'Sensor or device input', className: 'sensor' },
  { type: 'filter', icon: '◉', name: 'Moving average', desc: 'Smooth a measurement', className: 'filter' },
  { type: 'condition', icon: '◇', name: 'Condition', desc: 'Branch on a threshold', className: 'condition' },
  { type: 'alert', icon: '↗', name: 'Action trigger', desc: 'Webhook or SMS alert', className: 'alert' },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [active, setActive] = useState('condition-1');
  const [saved, setSaved] = useState('Saved just now');
  const [toast, setToast] = useState('');
  const nodeTypesMemo = useMemo(() => nodeTypes, []);
  const onConnect = useCallback((connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#4f91ff', strokeWidth: 2 } }, eds)), [setEdges]);
  const selected = nodes.find((node) => node.id === active) ?? nodes[0];
  const updateSelected = (field, value) => setNodes((all) => all.map((node) => node.id === selected?.id ? { ...node, data: { ...node.data, [field]: value } } : node));
  const addNode = (item) => {
    const id = `${item.type}-${Date.now()}`;
    const titles = { sensor: 'New sensor', filter: 'Moving average', condition: 'New condition', alert: 'New action' };
    const data = { title: titles[item.type], subtitle: item.desc, detail: item.type === 'filter' ? 'Window · 5 samples' : 'Configure this node' };
    if (item.type === 'sensor') Object.assign(data, { subtitle: 'Select a device', value: 'Waiting for data' });
    if (item.type === 'alert') data.detail = 'Webhook · Configure';
    setNodes((all) => [...all, { id, type: item.type, position: { x: 260 + Math.random() * 340, y: 100 + Math.random() * 360 }, data }]);
    setActive(id);
  };
  const save = () => { setSaved('Saved just now'); setToast('Rule saved to this workspace'); window.setTimeout(() => setToast(''), 2400); };
  const exportGraph = () => {
    const blob = new Blob([JSON.stringify({ name: 'Turbine temperature guard', enabled: true, graph: { nodes, edges } }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'nexusflow-rule.json'; link.click(); URL.revokeObjectURL(link.href);
    setToast('Rule graph exported as JSON'); window.setTimeout(() => setToast(''), 2400);
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">N</span><span>Nexus<span className="brand-light">Flow</span></span><span className="brand-divider"/><span className="workspace-name">Workspace <span>⌄</span></span></div>
      <div className="top-center"><span className="crumb-muted">Automation</span><span className="crumb-slash">/</span><span>Turbine temperature guard</span><span className="unsaved-dot" title={saved}/></div>
      <div className="top-actions"><span className="save-state">✓ {saved}</span><button className="icon-button" aria-label="Help">?</button><div className="avatar">AR</div><button className="publish-button" onClick={save}>Publish rule <span>↗</span></button></div>
    </header>
    <div className="page-tabs"><button className="tab active">◈ <span>Rule builder</span></button><button className="tab">▥ <span>Live monitor</span></button><div className="tabs-right"><span className="status-pill"><i/> All systems operational</span><button className="icon-button">⋯</button></div></div>
    <main className="workspace">
      <aside className="sidebar">
        <div className="side-top"><span className="section-label">AUTOMATIONS</span><button className="tiny-plus">+</button></div>
        <button className="side-link muted">⌂ <span>Overview</span></button><button className="side-link selected-link">◈ <span>Rule builder</span><span className="side-count">3</span></button><button className="side-link muted">◷ <span>Activity log</span></button>
        <div className="side-separator"/><div className="side-top"><span className="section-label">YOUR RULES</span><button className="tiny-plus">+</button></div>
        <button className="rule-link current"><span className="rule-dot green"/><span>Turbine temperature<br/>guard</span><span className="rule-more">···</span></button><button className="rule-link"><span className="rule-dot amber"/><span>Vibration anomaly<br/>watch</span></button><button className="rule-link"><span className="rule-dot gray"/><span>Pressure drift<br/>monitor</span></button>
        <div className="sidebar-footer"><div className="plan-icon">⌁</div><div><b>Starter workspace</b><small>2 of 5 rules active</small></div><span className="upgrade-arrow">↗</span></div>
      </aside>
      <section className="main-area">
        <div className="rule-heading"><div><div className="eyebrow"><span className="rule-dot green"/> ACTIVE RULE <span className="heading-divider">·</span> UPDATED 4 MIN AGO</div><h1>Turbine temperature guard <button className="edit-title">✎</button></h1><p>Monitor turbine temperature and alert the shift manager when readings exceed safe limits.</p></div><div className="heading-actions"><button className="secondary-button" onClick={exportGraph}>⇩ <span>Export JSON</span></button><button className="secondary-button">◉ <span>Test rule</span></button><button className="primary-button" onClick={save}>Save changes <span>⌘ S</span></button></div></div>
        <div className="toolbar"><div className="toolbar-left"><span className="canvas-mode"><i/> CANVAS</span><span className="toolbar-divider"/><button className="tool-button">↶</button><button className="tool-button disabled">↷</button><span className="toolbar-divider"/><span className="zoom-label">100%</span><button className="tool-button">−</button><button className="tool-button">+</button></div><div className="toolbar-right"><span className="autosave"><i/> {saved}</span><button className="run-button" onClick={() => { setToast('Rule preview started'); window.setTimeout(() => setToast(''), 2400); }}>▶ <span>Run preview</span></button></div></div>
        <div className="canvas-layout">
          <div className="canvas-wrap">
            <div className="canvas-caption"><span>RULE FLOW</span><span className="caption-sep">·</span><span>{nodes.length} nodes</span><span className="caption-sep">·</span><span>{edges.length} connections</span></div>
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypesMemo} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => setActive(node.id)} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.3} maxZoom={1.5}>
              <Background color="#202a35" gap={22} size={1} /><Controls showInteractive={false}/><MiniMap nodeColor={(node) => ({ sensor:'#4f91ff', filter:'#9d7cff', condition:'#edb761', alert:'#e27ea1' }[node.type] || '#45515f')} maskColor="rgba(10,15,21,.72)"/>
            </ReactFlow>
            <div className="canvas-hint">Drag nodes to arrange <span>·</span> Connect ports to build your rule</div>
          </div>
          <aside className="inspector">
            <div className="inspector-title"><div><span className="section-label">NODE SETTINGS</span><h3>{selected?.data?.title ?? 'Select a node'}</h3></div><button className="icon-button">⋯</button></div>
            {selected ? <>
              <label className="field-label">Node name</label><input className="text-input" value={selected.data.title} onChange={(e) => updateSelected('title', e.target.value)}/>
              {selected.type === 'condition' ? <><label className="field-label spaced">Measurement</label><select className="text-input"><option>temperature</option><option>vibration</option><option>pressure</option></select><label className="field-label spaced">Condition</label><div className="condition-row"><select className="text-input"><option>Greater than</option><option>Greater or equal</option><option>Less than</option><option>Equal to</option></select><input className="text-input threshold" defaultValue="80"/></div><span className="field-help">Rule passes when temperature is above this value.</span></> : selected.type === 'sensor' ? <><label className="field-label spaced">Device</label><select className="text-input"><option>Turbine 01 · North plant</option><option>Turbine 02 · North plant</option></select><label className="field-label spaced">Measurement</label><select className="text-input"><option>temperature · °C</option><option>vibration · mm/s</option></select></> : selected.type === 'filter' ? <><label className="field-label spaced">Measurement</label><select className="text-input"><option>temperature</option><option>vibration</option><option>pressure</option></select><label className="field-label spaced">Window size</label><div className="stepper"><button>−</button><span>5 <small>samples</small></span><button>+</button></div></> : <><label className="field-label spaced">Action</label><select className="text-input"><option>SMS notification</option><option>Webhook</option></select><label className="field-label spaced">Recipient</label><input className="text-input" placeholder="Choose a recipient"/></>}
              <div className="inspector-divider"/><div className="output-row"><span className="output-dot"/><div><b>Output</b><small>{selected.type === 'condition' ? 'Boolean · true / false' : selected.type === 'sensor' ? 'Number · temperature' : selected.type === 'filter' ? 'Number · smoothed value' : 'Notification · delivered'}</small></div><span className="output-arrow">→</span></div>
            </> : <p className="empty-inspector">Choose a node on the canvas to edit its settings.</p>}
            <div className="inspector-bottom"><button className="delete-node" onClick={() => { if (!selected) return; setNodes((all) => all.filter((node) => node.id !== selected.id)); setEdges((all) => all.filter((edge) => edge.source !== selected.id && edge.target !== selected.id)); setActive(''); }}>⌫ <span>Delete node</span></button><span>Changes apply instantly</span></div>
          </aside>
        </div>
        <div className="bottom-panel"><div className="panel-title"><span className="panel-grip">⠿</span><div><b>Node library</b><small>Drag a block onto the canvas to extend your flow</small></div></div><div className="library-items">{library.map((item) => <button key={item.type} className="library-card" onClick={() => addNode(item)}><span className={`library-icon ${item.className}`}>{item.icon}</span><span><b>{item.name}</b><small>{item.desc}</small></span><span className="add-symbol">+</span></button>)}</div></div>
      </section>
    </main>
    <div className="toast" data-visible={Boolean(toast)}>{toast}</div>
  </div>;
}
