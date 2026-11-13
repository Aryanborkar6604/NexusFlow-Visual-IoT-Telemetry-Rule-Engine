import { randomUUID } from 'node:crypto';
import { Observable, filter, map, scan, tap } from 'rxjs';
import { z } from 'zod';
import { getDb } from './db.js';
import { telemetryEvents } from './telemetry.js';

const graphSchema = z.object({
  nodes: z.array(z.object({ id: z.string().min(1), type: z.string().optional(), data: z.record(z.unknown()).default({}) })),
  edges: z.array(z.object({ source: z.string(), target: z.string() }).passthrough()),
}).passthrough();

export function compileGraph(rawGraph, onAlert) {
  const graph = graphSchema.parse(rawGraph);
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  if (nodes.size !== graph.nodes.length) throw new Error('Graph contains duplicate node ids');
  const outgoing = new Map(graph.nodes.map(({ id }) => [id, []]));
  const incomingCount = new Map(graph.nodes.map(({ id }) => [id, 0]));
  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) throw new Error('Graph edge references a missing node');
    outgoing.get(edge.source).push(edge.target);
    incomingCount.set(edge.target, incomingCount.get(edge.target) + 1);
  }

  const queue = [...incomingCount].filter(([, count]) => count === 0).map(([id]) => id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const target of outgoing.get(id)) {
      incomingCount.set(target, incomingCount.get(target) - 1);
      if (incomingCount.get(target) === 0) queue.push(target);
    }
  }
  if (order.length !== graph.nodes.length) throw new Error('Rule graph must be acyclic');
  const sources = graph.nodes.filter((node) => node.type === 'sensor' || node.type === 'source' || node.data.kind === 'sensor');
  if (sources.length !== 1) throw new Error('A rule graph must contain exactly one sensor source');
  if (!order.some((id) => nodes.get(id).type === 'alert' || nodes.get(id).data.kind === 'alert')) throw new Error('A rule graph must contain an alert node');

  return new Observable((subscriber) => {
    const source = sources[0];
    let stream = telemetryEvents.pipe(filter((event) => !source.data.sensorId || event.sensorId === source.data.sensorId));
    for (const id of order.slice(order.indexOf(source.id) + 1)) {
      const node = nodes.get(id);
      const kind = node.type ?? node.data.kind;
      if (kind === 'movingAverage' || kind === 'moving_average' || kind === 'filter') {
        const window = Math.max(1, Math.min(10000, Number(node.data.window ?? node.data.period ?? 5)));
        stream = stream.pipe(scan((state, event) => {
          const value = Number(event.measurements?.[node.data.field ?? 'value']);
          if (!Number.isFinite(value)) return { values: state.values, event };
          const values = [...state.values, value].slice(-window);
          return { values, event: { ...event, value, movingAverage: values.reduce((sum, n) => sum + n, 0) / values.length } };
        }, { values: [], event: null }), filter((state) => state.event !== null), map((state) => state.event));
      } else if (kind === 'condition' || kind === 'threshold') {
        const field = node.data.field ?? 'movingAverage';
        const operator = node.data.operator ?? 'gt';
        const target = Number(node.data.value ?? node.data.threshold);
        stream = stream.pipe(filter((event) => {
          const value = Number(event[field] ?? event.measurements?.[field]);
          if (!Number.isFinite(value) || !Number.isFinite(target)) return false;
          return ({ gt: value > target, '>': value > target, gte: value >= target, '>=': value >= target, lt: value < target, '<': value < target, lte: value <= target, '<=': value <= target, eq: value === target, '==': value === target })[operator] ?? false;
        }));
      } else if (kind === 'alert' || node.data.kind === 'alert') {
        stream = stream.pipe(tap((event) => onAlert({ node, event })));
      } else if (kind !== 'sensor' && kind !== 'source') {
        throw new Error(`Unsupported rule node type: ${kind}`);
      }
    }
    return stream.subscribe(subscriber);
  });
}

export class RuleService {
  constructor(alertService) {
    this.alertService = alertService;
    this.subscriptions = new Map();
  }

  async save(input) {
    const graph = graphSchema.parse(input.graph);
    // Compile once before persisting so invalid graphs never become active rules.
    compileGraph(graph, () => {});
    const id = input.id ?? randomUUID();
    const rule = { _id: id, name: input.name ?? 'Untitled rule', enabled: input.enabled ?? true, graph, updatedAt: new Date() };
    await getDb().collection('rules').replaceOne({ _id: id }, rule, { upsert: true });
    this.activate(rule);
    return rule;
  }

  activate(rule) {
    this.subscriptions.get(rule._id)?.unsubscribe();
    if (!rule.enabled) { this.subscriptions.delete(rule._id); return; }
    const subscription = compileGraph(rule.graph, ({ node, event }) => {
      void this.alertService.send({ ruleId: rule._id, ruleName: rule.name, node: node.data, event });
    }).subscribe({ error: (error) => console.error(`Rule ${rule._id} stopped:`, error.message) });
    this.subscriptions.set(rule._id, subscription);
  }

  async loadEnabled() {
    const rules = await getDb().collection('rules').find({ enabled: true }).toArray();
    for (const rule of rules) {
      try { this.activate(rule); } catch (error) { console.error(`Could not load rule ${rule._id}:`, error.message); }
    }
  }

  async list() { return getDb().collection('rules').find({}, { projection: { _id: 1, name: 1, enabled: 1, graph: 1, updatedAt: 1 } }).toArray(); }

  async remove(id) {
    this.subscriptions.get(id)?.unsubscribe();
    this.subscriptions.delete(id);
    await getDb().collection('rules').deleteOne({ _id: id });
  }
}
