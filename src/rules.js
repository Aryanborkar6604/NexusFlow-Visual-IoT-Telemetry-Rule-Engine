import { randomUUID } from 'node:crypto';
import { Observable, filter, map, merge, scan, share, tap } from 'rxjs';
import { z } from 'zod';
import { getDb } from './db.js';
import { telemetryEvents } from './telemetry.js';

const graphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string().min(1),
    type: z.string().optional(),
    data: z.record(z.unknown()).default({}),
  })).min(2),
  edges: z.array(z.object({
    source: z.string().min(1),
    target: z.string().min(1),
  }).passthrough()),
}).passthrough();

const getKind = (node) => node.data.kind ?? node.type;
const sourceKinds = new Set(['sensor', 'source']);
const averageKinds = new Set(['movingAverage', 'moving_average', 'filter']);
const mathKinds = new Set(['math', 'mathOperation']);
const conditionKinds = new Set(['condition', 'threshold']);
const alertKinds = new Set(['alert']);
const conditionOperators = new Set(['gt', '>', 'gte', '>=', 'lt', '<', 'lte', '<=', 'eq', '==']);
const mathOperators = new Set(['add', 'subtract', 'multiply', 'divide', 'modulo']);

function validateGraph(rawGraph) {
  const graph = graphSchema.parse(rawGraph);
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  if (nodes.size !== graph.nodes.length) throw new Error('Graph contains duplicate node ids');

  const outgoing = new Map(graph.nodes.map(({ id }) => [id, []]));
  const incoming = new Map(graph.nodes.map(({ id }) => [id, []]));
  const edgeKeys = new Set();
  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) throw new Error('Graph edge references a missing node');
    const key = edge.source + '\u0000' + edge.target;
    if (edgeKeys.has(key)) throw new Error('Graph contains a duplicate edge');
    edgeKeys.add(key);
    outgoing.get(edge.source).push(edge.target);
    incoming.get(edge.target).push(edge.source);
  }

  const sources = graph.nodes.filter((node) => sourceKinds.has(getKind(node)));
  if (sources.length !== 1) throw new Error('A rule graph must contain exactly one sensor source');
  const source = sources[0];
  if (incoming.get(source.id).length !== 0) throw new Error('The sensor source cannot have incoming edges');

  const alerts = graph.nodes.filter((node) => alertKinds.has(getKind(node)));
  if (alerts.length === 0) throw new Error('A rule graph must contain at least one alert node');

  for (const node of graph.nodes) {
    const kind = getKind(node);
    if (!sourceKinds.has(kind) && !averageKinds.has(kind) && !mathKinds.has(kind) && !conditionKinds.has(kind) && !alertKinds.has(kind)) {
      throw new Error('Unsupported rule node type: ' + String(kind));
    }
    if (node.id !== source.id && incoming.get(node.id).length !== 1) {
      throw new Error('Every node must have exactly one incoming connection (except the sensor source)');
    }
    if (alertKinds.has(kind) && outgoing.get(node.id).length !== 0) {
      throw new Error('Alert nodes must be terminal nodes');
    }
    if (outgoing.get(node.id).length === 0 && !alertKinds.has(kind)) {
      throw new Error('Every branch must end at an alert node');
    }

    if (averageKinds.has(kind)) {
      const window = Number(node.data.window ?? node.data.period ?? 5);
      if (!Number.isInteger(window) || window < 1 || window > 10000) {
        throw new Error('Moving average window must be an integer from 1 to 10000');
      }
      const field = node.data.field ?? 'value';
      if (typeof field !== 'string' || field.length === 0) throw new Error('Moving average field must be a non-empty string');
    }

    if (conditionKinds.has(kind)) {
      const operator = node.data.operator ?? 'gt';
      const threshold = Number(node.data.value ?? node.data.threshold);
      if (!conditionOperators.has(operator)) throw new Error('Unsupported condition operator: ' + String(operator));
      if (!Number.isFinite(threshold)) throw new Error('Condition threshold must be a finite number');
      if (node.data.field !== undefined && (typeof node.data.field !== 'string' || node.data.field.length === 0)) {
        throw new Error('Condition field must be a non-empty string');
      }
    }

    if (mathKinds.has(kind)) {
      const operation = node.data.operation;
      const operand = Number(node.data.operand);
      const field = node.data.field ?? 'value';
      const outputField = node.data.outputField ?? 'result';
      if (!mathOperators.has(operation)) throw new Error('Unsupported math operation: ' + String(operation));
      if (!Number.isFinite(operand)) throw new Error('Math operand must be a finite number');
      if ((operation === 'divide' || operation === 'modulo') && operand === 0) {
        throw new Error('Math divisor cannot be zero');
      }
      if (typeof field !== 'string' || field.length === 0) throw new Error('Math field must be a non-empty string');
      if (typeof outputField !== 'string' || outputField.length === 0) throw new Error('Math outputField must be a non-empty string');
    }
  }

  const remainingIncoming = new Map(incoming.map(([id, parents]) => [id, parents.length]));
  const queue = [source.id];
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const target of outgoing.get(id)) {
      remainingIncoming.set(target, remainingIncoming.get(target) - 1);
      if (remainingIncoming.get(target) === 0) queue.push(target);
    }
  }
  if (order.length !== graph.nodes.length) {
    throw new Error('Rule graph must be acyclic and every node must connect to the sensor source');
  }

  return { nodes, incoming, outgoing, order, source, alerts };
}

function conditionMatches(event, node) {
  const field = node.data.field ?? 'movingAverage';
  const actual = Number(event[field] ?? event.measurements?.[field]);
  const target = Number(node.data.value ?? node.data.threshold);
  if (!Number.isFinite(actual)) return false;

  switch (node.data.operator ?? 'gt') {
    case 'gt':
    case '>': return actual > target;
    case 'gte':
    case '>=': return actual >= target;
    case 'lt':
    case '<': return actual < target;
    case 'lte':
    case '<=': return actual <= target;
    case 'eq':
    case '==': return actual === target;
    default: return false;
  }
}

function applyMathOperation(event, node) {
  const field = node.data.field ?? 'value';
  const outputField = node.data.outputField ?? 'result';
  const value = Number(event[field] ?? event.measurements?.[field]);
  const operand = Number(node.data.operand);
  if (!Number.isFinite(value)) return null;

  let result;
  switch (node.data.operation) {
    case 'add': result = value + operand; break;
    case 'subtract': result = value - operand; break;
    case 'multiply': result = value * operand; break;
    case 'divide': result = value / operand; break;
    case 'modulo': result = value % operand; break;
    default: return null;
  }
  if (!Number.isFinite(result)) return null;
  return {
    ...event,
    [outputField]: result,
    measurements: { ...event.measurements, [outputField]: result },
  };
}

export class RuleValidationError extends Error {
  constructor(message, options) { super(message, options); this.name = 'RuleValidationError'; }
}

export function compileGraph(rawGraph, onAlert, ownerId) {
  let graph;
  try { graph = validateGraph(rawGraph); } catch (error) {
    if (error instanceof z.ZodError || error instanceof RuleValidationError) throw error;
    throw new RuleValidationError(error.message, { cause: error });
  }

  return new Observable((subscriber) => {
    const streams = new Map();
    const { source } = graph;
    streams.set(source.id, telemetryEvents.pipe(
      filter((event) => event.ownerId === ownerId && (!source.data.sensorId || event.sensorId === source.data.sensorId)),
      share(),
    ));

    for (const id of graph.order) {
      if (id === source.id) continue;
      const node = graph.nodes.get(id);
      const parentId = graph.incoming.get(id)[0];
      const parent = streams.get(parentId);
      const kind = getKind(node);
      let stream;

      if (averageKinds.has(kind)) {
        const window = Number(node.data.window ?? node.data.period ?? 5);
        const field = node.data.field ?? 'value';
        stream = parent.pipe(
          scan((state, event) => {
            const value = Number(event.measurements?.[field]);
            if (!Number.isFinite(value)) return { values: state.values, sum: state.sum, event: null };
            const values = [...state.values, value];
            let sum = state.sum + value;
            if (values.length > window) sum -= values.shift();
            return {
              values,
              sum,
              event: { ...event, value, movingAverage: sum / values.length },
            };
          }, { values: [], sum: 0, event: null }),
          filter((state) => state.event !== null),
          map((state) => state.event),
          share(),
        );
      } else if (conditionKinds.has(kind)) {
        stream = parent.pipe(filter((event) => conditionMatches(event, node)), share());
      } else if (mathKinds.has(kind)) {
        stream = parent.pipe(
          map((event) => applyMathOperation(event, node)),
          filter((event) => event !== null),
          share(),
        );
      } else if (alertKinds.has(kind)) {
        stream = parent.pipe(tap((event) => onAlert({ node, event })), share());
      }

      streams.set(id, stream);
    }

    const alertStreams = graph.alerts.map((node) => streams.get(node.id));
    return merge(...alertStreams).subscribe(subscriber);
  });
}

export class RuleService {
  constructor(alertService) {
    this.alertService = alertService;
    this.subscriptions = new Map();
  }

  async save(input, ownerId) {
    const graph = graphSchema.parse(input.graph);
    // Graph validation runs synchronously before the rule is persisted.
    compileGraph(graph, () => {}, ownerId);
    const id = input.id ?? randomUUID();
    const rule = { _id: id, ownerId, name: input.name ?? 'Untitled rule', enabled: input.enabled ?? true, graph, updatedAt: new Date() };
    await getDb().collection('rules').replaceOne({ _id: id, ownerId }, rule, { upsert: true });
    this.activate(rule);
    return rule;
  }

  activate(rule) {
    this.subscriptions.get(rule._id)?.unsubscribe();
    if (!rule.enabled) {
      this.subscriptions.delete(rule._id);
      return;
    }
    const subscription = compileGraph(rule.graph, ({ node, event }) => {
      void this.alertService.send({ ruleId: rule._id, ruleName: rule.name, node: node.data, event });
    }, rule.ownerId).subscribe({
      error: (error) => console.error('Rule ' + rule._id + ' stopped:', error.message),
    });
    this.subscriptions.set(rule._id, subscription);
  }

  async loadEnabled() {
    const rules = await getDb().collection('rules').find({ enabled: true }).toArray();
    for (const rule of rules) {
      try {
        this.activate(rule);
      } catch (error) {
        console.error('Could not load rule ' + rule._id + ':', error.message);
      }
    }
  }

  async list(ownerId) {
    return getDb().collection('rules')
      .find({ ownerId }, { projection: { _id: 1, name: 1, enabled: 1, graph: 1, updatedAt: 1 } })
      .toArray();
  }

  async remove(id, ownerId) {
    const result = await getDb().collection('rules').deleteOne({ _id: id, ownerId });
    if (!result.deletedCount) return false;
    this.subscriptions.get(id)?.unsubscribe();
    this.subscriptions.delete(id);
    return true;
  }
}
