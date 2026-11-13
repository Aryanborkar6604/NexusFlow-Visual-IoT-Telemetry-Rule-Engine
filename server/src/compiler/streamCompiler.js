import { tap } from 'rxjs/operators';
import { nodeRegistry } from './nodeRegistry.js';
import { validateWorkflowGraph } from './dagValidator.js';

/**
 * Topologically sorts nodes in the workflow DAG
 */
export function topologicalSort(nodes, edges) {
  const adj = new Map(nodes.map(n => [n.id, []]));
  const inDegree = new Map(nodes.map(n => [n.id, 0]));

  for (const edge of edges) {
    adj.get(edge.source).push(edge.target);
    inDegree.set(edge.target, inDegree.get(edge.target) + 1);
  }

  const queue = nodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
  const order = [];

  while (queue.length > 0) {
    const u = queue.shift();
    order.push(u);

    for (const v of adj.get(u) || []) {
      inDegree.set(v, inDegree.get(v) - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    }
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return order.map(id => nodeMap.get(id));
}

/**
 * Compiles a workflow JSON into an executable RxJS pipeline function
 * @param {Object} workflow - { id, name, nodes, edges }
 * @param {Object} context - { dispatchAlert, emitNodeStatus }
 * @returns {Function} (source$) => Observable
 */
export function compileWorkflow(workflow, context = {}) {
  // 1. Structural and Cycle validation
  validateWorkflowGraph(workflow);

  const { nodes, edges } = workflow;
  const sortedNodes = topologicalSort(nodes, edges);

  return (rawSource$) => {
    let current$ = rawSource$;

    for (const node of sortedNodes) {
      const operatorFactory = nodeRegistry[node.type];
      if (!operatorFactory) {
        throw new Error(`Unregistered node operator: ${node.type}`);
      }

      const nodeOperator = operatorFactory(node.data || {}, {
        ...context,
        nodeId: node.id,
        workflowId: workflow.id || workflow.workflowId,
      });

      // Wrap operator with telemetry tracking to emit node status for visual live overlay
      current$ = current$.pipe(
        nodeOperator,
        tap((val) => {
          if (context.emitNodeStatus) {
            context.emitNodeStatus({
              workflowId: workflow.id || workflow.workflowId,
              nodeId: node.id,
              value: val,
              timestamp: new Date().toISOString(),
              passed: true,
            });
          }
        })
      );
    }

    return current$;
  };
}
