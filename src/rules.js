const types = new Set(['sensor', 'movingAverage', 'mathOperation', 'condition', 'alert']);
const operators = new Set(['gt', 'gte', 'lt', 'lte', 'eq']);
const validField = (field) => field === undefined || (typeof field === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(field));

export class RuleValidationError extends Error {
  constructor(message) { super(message); this.name = 'RuleValidationError'; }
}

export function validateRuleGraph(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || graph.nodes.length < 2 || graph.nodes.length > 200 || graph.edges.length > 400) {
    throw new RuleValidationError('A graph must contain between 2 and 200 nodes and an edge list');
  }
  const byId = new Map();
  for (const node of graph.nodes) {
    if (!node || typeof node.id !== 'string' || !node.id || node.id.length > 128 || !types.has(node.type) || !node.data || typeof node.data !== 'object' || Array.isArray(node.data)) throw new RuleValidationError('Each node needs an id, supported type, and data object');
    if (byId.has(node.id)) throw new RuleValidationError(`Duplicate node id: ${node.id}`);
    byId.set(node.id, node);
  }
  const incoming = new Map(graph.nodes.map(({ id }) => [id, 0]));
  const outgoing = new Map(graph.nodes.map(({ id }) => [id, []]));
  const edgeKeys = new Set();
  for (const edge of graph.edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target) || edge.source === edge.target) throw new RuleValidationError('Every connection must link two different nodes in this graph');
    const key = `${edge.source}:${edge.sourceHandle ?? ''}:${edge.target}`;
    if (edgeKeys.has(key)) throw new RuleValidationError('Duplicate connections are not allowed');
    edgeKeys.add(key);
    incoming.set(edge.target, incoming.get(edge.target) + 1);
    outgoing.get(edge.source).push(edge);
  }
  const sources = graph.nodes.filter((node) => node.type === 'sensor');
  if (sources.length !== 1) throw new RuleValidationError('A rule must have exactly one sensor source');
  if (!graph.nodes.some((node) => node.type === 'alert')) throw new RuleValidationError('A rule must contain at least one alert action');
  if (incoming.get(sources[0].id) !== 0) throw new RuleValidationError('The sensor source cannot have an incoming connection');
  if (graph.nodes.some((node) => node.id !== sources[0].id && incoming.get(node.id) !== 1)) throw new RuleValidationError('Each non-source node must have exactly one incoming connection');

  const color = new Map();
  const reachable = new Set();
  const visit = (id) => {
    if (color.get(id) === 1) throw new RuleValidationError('Rule graph cannot contain cycles');
    if (color.get(id) === 2) return;
    color.set(id, 1); reachable.add(id);
    outgoing.get(id).forEach((edge) => visit(edge.target));
    color.set(id, 2);
  };
  visit(sources[0].id);
  if (reachable.size !== graph.nodes.length) throw new RuleValidationError('Every node must be connected to the sensor source');
  for (const node of graph.nodes) {
    const next = outgoing.get(node.id);
    if (!next.length && node.type !== 'alert') throw new RuleValidationError(`Every path must end at an alert action (node ${node.id})`);
    if (node.type === 'alert' && next.length) throw new RuleValidationError(`Alert node ${node.id} must be a terminal action`);
    if (!validField(node.data.field)) throw new RuleValidationError(`Node ${node.id} has an invalid measurement field`);
    if (node.type === 'sensor' && (typeof node.data.sensorId !== 'string' || !node.data.sensorId.trim() || node.data.sensorId.length > 128)) throw new RuleValidationError(`Sensor node ${node.id} needs a sensorId no longer than 128 characters`);
    if (node.type === 'condition') {
      if (!operators.has(node.data.operator ?? 'gt')) throw new RuleValidationError(`Condition node ${node.id} has an unsupported operator`);
      if (!Number.isFinite(Number(node.data.value))) throw new RuleValidationError(`Condition node ${node.id} needs a numeric threshold`);
      const handles = next.map((edge) => String(edge.sourceHandle ?? '').toLowerCase());
      if (next.length > 2 || handles.some((handle) => handle && !['true', 'yes', 'pass', 'false', 'no', 'fail'].includes(handle))) throw new RuleValidationError(`Condition node ${node.id} has unsupported output handles`);
      if (next.length === 2 && (!(handles.some((handle) => ['true', 'yes', 'pass'].includes(handle))) || !(handles.some((handle) => ['false', 'no', 'fail'].includes(handle))))) throw new RuleValidationError(`Condition node ${node.id} needs one true and one false output`);
      if (new Set(handles).size !== handles.length) throw new RuleValidationError(`Condition node ${node.id} cannot have duplicate output handles`);
    }
    if (node.type === 'movingAverage' && (!Number.isInteger(Number(node.data.window)) || Number(node.data.window) < 1 || Number(node.data.window) > 10000)) throw new RuleValidationError(`Moving average node ${node.id} needs a window from 1 to 10000`);
    if (node.type === 'mathOperation' && (!validField(node.data.outputField) || !['add', 'subtract', 'multiply', 'divide', 'modulo'].includes(node.data.operation) || !Number.isFinite(Number(node.data.operand)))) throw new RuleValidationError(`Math node ${node.id} needs a supported operation, numeric operand, and valid output field`);
    if (node.type === 'alert') {
      if (!node.data.phone && !node.data.webhookUrl) throw new RuleValidationError(`Alert node ${node.id} needs a phone number or webhook URL`);
      if (node.data.phone !== undefined && (typeof node.data.phone !== 'string' || node.data.phone.length > 128)) throw new RuleValidationError(`Alert node ${node.id} has an invalid phone number`);
      if (node.data.webhookUrl !== undefined) {
        try {
          if (typeof node.data.webhookUrl !== 'string' || node.data.webhookUrl.length > 2048) throw new Error();
          const url = new URL(node.data.webhookUrl);
          if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
        } catch { throw new RuleValidationError(`Alert node ${node.id} has an invalid webhook URL`); }
      }
    }
  }
  return { nodes: graph.nodes, edges: graph.edges, source: sources[0], outgoing };
}

export function evaluateCondition(value, operator, threshold) {
  const right = Number(threshold);
  if (!Number.isFinite(value) || !Number.isFinite(right)) return false;
  return ({ gt: value > right, gte: value >= right, lt: value < right, lte: value <= right, eq: value === right })[operator ?? 'gt'] ?? false;
}
