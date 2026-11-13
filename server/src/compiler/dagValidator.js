const ALLOWED_NODE_TYPES = new Set(['sensor', 'movingAverage', 'condition', 'sms']);
const ALLOWED_OPERATORS = new Set(['>', '<', '>=', '<=', '==']);

export function validateWorkflowGraph(workflow) {
  const { nodes, edges } = workflow;

  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error('Workflow must contain at least one node.');
  }

  const nodeMap = new Map();
  const adjList = new Map();
  const inDegree = new Map();

  // 1. Validate node types and configuration bounds
  for (const node of nodes) {
    if (!node.id || typeof node.id !== 'string') {
      throw new Error(`Node is missing a valid string id: ${JSON.stringify(node)}`);
    }
    if (nodeMap.has(node.id)) {
      throw new Error(`Duplicate node id found: "${node.id}"`);
    }
    if (!ALLOWED_NODE_TYPES.has(node.type)) {
      throw new Error(`Unknown node type "${node.type}" on node "${node.id}". Allowed: ${Array.from(ALLOWED_NODE_TYPES).join(', ')}`);
    }

    // Node-specific config validation
    const data = node.data || {};
    if (node.type === 'sensor') {
      if (!data.deviceId) throw new Error(`Sensor node "${node.id}" requires a "deviceId".`);
      if (!data.field) throw new Error(`Sensor node "${node.id}" requires a "field" (e.g. temperature).`);
    } else if (node.type === 'movingAverage') {
      const windowSize = Number(data.windowSize);
      if (isNaN(windowSize) || windowSize < 1 || windowSize > 100) {
        throw new Error(`MovingAverage node "${node.id}" windowSize must be a number between 1 and 100.`);
      }
    } else if (node.type === 'condition') {
      if (!ALLOWED_OPERATORS.has(data.operator)) {
        throw new Error(`Condition node "${node.id}" operator must be one of: ${Array.from(ALLOWED_OPERATORS).join(', ')}`);
      }
      if (typeof data.value !== 'number' && isNaN(Number(data.value))) {
        throw new Error(`Condition node "${node.id}" value must be a valid number.`);
      }
    } else if (node.type === 'sms') {
      if (!data.recipient) {
        throw new Error(`SMS Alert node "${node.id}" requires a recipient phone number.`);
      }
    }

    nodeMap.set(node.id, node);
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // 2. Validate edges
  if (Array.isArray(edges)) {
    for (const edge of edges) {
      if (!nodeMap.has(edge.source)) {
        throw new Error(`Edge references non-existent source node: "${edge.source}"`);
      }
      if (!nodeMap.has(edge.target)) {
        throw new Error(`Edge references non-existent target node: "${edge.target}"`);
      }
      adjList.get(edge.source).push(edge.target);
      inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    }
  }

  // 3. Cycle Detection via DFS
  // Colors: 0 = unvisited, 1 = visiting (in recursion stack), 2 = visited
  const state = new Map(nodes.map(n => [n.id, 0]));

  function dfs(nodeId, path = []) {
    state.set(nodeId, 1);
    path.push(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (state.get(neighbor) === 1) {
        throw new Error(`Cyclic dependency detected: ${path.join(' -> ')} -> ${neighbor}`);
      }
      if (state.get(neighbor) === 0) {
        dfs(neighbor, path);
      }
    }

    path.pop();
    state.set(nodeId, 2);
  }

  for (const node of nodes) {
    if (state.get(node.id) === 0) {
      dfs(node.id);
    }
  }

  // 4. Structural integrity checks
  for (const node of nodes) {
    // Condition, MovingAverage, SMS must have inputs
    if (['condition', 'movingAverage', 'sms'].includes(node.type) && inDegree.get(node.id) === 0) {
      throw new Error(`Node "${node.id}" (${node.type}) is disconnected: it requires an upstream input connection.`);
    }
    // SMS node must be terminal (no outgoing edges)
    if (node.type === 'sms' && adjList.get(node.id).length > 0) {
      throw new Error(`SMS Alert node "${node.id}" is a terminal action node and cannot have outgoing edges.`);
    }
    // Sensor node must not have inputs
    if (node.type === 'sensor' && inDegree.get(node.id) > 0) {
      throw new Error(`Sensor node "${node.id}" is a data source and cannot have incoming inputs.`);
    }
  }

  return true;
}
