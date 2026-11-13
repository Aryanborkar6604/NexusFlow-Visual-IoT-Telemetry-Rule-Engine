import { Workflow } from '../models/Workflow.js';
import { isDbConnected } from '../config/db.js';
import { validateWorkflowGraph } from '../compiler/dagValidator.js';
import { pipelineManager } from '../compiler/pipelineManager.js';

// In-memory fallback workflows cache
const inMemoryWorkflows = new Map([
  [
    'wf_turbine_01',
    {
      id: 'wf_turbine_01',
      workflowId: 'wf_turbine_01',
      name: 'Turbine Temperature Monitoring',
      status: 'inactive',
      factoryId: 'FACTORY_01',
      nodes: [
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
          data: { recipient: '+15550199', message: 'High temperature alert: {{value}}°C on Turbine 001' },
        },
      ],
      edges: [
        { id: 'e1', source: 'sensor1', target: 'filter1' },
        { id: 'e2', source: 'filter1', target: 'condition1' },
        { id: 'e3', source: 'condition1', target: 'alert1' },
      ],
    },
  ],
]);

export async function getWorkflows(req, res) {
  const factoryId = req.user?.factoryId || 'FACTORY_01';

  if (!isDbConnected()) {
    const list = Array.from(inMemoryWorkflows.values()).map((w) => ({
      ...w,
      isRunning: pipelineManager.isWorkflowActive(w.id || w.workflowId),
    }));
    return res.json({ workflows: list });
  }

  try {
    const dbWorkflows = await Workflow.find({ factoryId });
    const list = dbWorkflows.map((w) => ({
      ...w.toObject(),
      id: w.workflowId,
      isRunning: pipelineManager.isWorkflowActive(w.workflowId),
    }));
    res.json({ workflows: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getWorkflowById(req, res) {
  const { id } = req.params;

  if (!isDbConnected()) {
    const wf = inMemoryWorkflows.get(id);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    return res.json({
      ...wf,
      isRunning: pipelineManager.isWorkflowActive(id),
    });
  }

  try {
    const wf = await Workflow.findOne({ workflowId: id });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    res.json({
      ...wf.toObject(),
      id: wf.workflowId,
      isRunning: pipelineManager.isWorkflowActive(id),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function saveWorkflow(req, res) {
  const workflowData = req.body;
  const workflowId = workflowData.id || workflowData.workflowId || `wf_${Date.now()}`;
  const factoryId = req.user?.factoryId || workflowData.factoryId || 'FACTORY_01';

  // 1. Strict DAG and Operator Validation
  try {
    validateWorkflowGraph(workflowData);
  } catch (validationErr) {
    return res.status(400).json({
      error: 'Graph validation failed',
      details: validationErr.message,
    });
  }

  const payload = {
    ...workflowData,
    id: workflowId,
    workflowId,
    factoryId,
    status: workflowData.status || 'inactive',
  };

  // Update in-memory cache
  inMemoryWorkflows.set(workflowId, payload);

  // If already running, hot-reload running subscription
  if (pipelineManager.isWorkflowActive(workflowId)) {
    try {
      pipelineManager.startWorkflow(payload);
    } catch (err) {
      console.warn(`[WorkflowController] Failed to reload active pipeline: ${err.message}`);
    }
  }

  // Persist to MongoDB
  if (isDbConnected()) {
    try {
      await Workflow.findOneAndUpdate(
        { workflowId },
        { ...payload },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error(`[WorkflowController] DB Save error: ${err.message}`);
    }
  }

  res.json({
    message: 'Workflow saved successfully',
    workflow: {
      ...payload,
      isRunning: pipelineManager.isWorkflowActive(workflowId),
    },
  });
}

export async function toggleWorkflow(req, res) {
  const { id } = req.params;

  let wf = inMemoryWorkflows.get(id);
  if (!wf && isDbConnected()) {
    const dbWf = await Workflow.findOne({ workflowId: id });
    if (dbWf) wf = { ...dbWf.toObject(), id: dbWf.workflowId };
  }

  if (!wf) {
    return res.status(404).json({ error: `Workflow "${id}" not found.` });
  }

  const currentlyActive = pipelineManager.isWorkflowActive(id);

  if (currentlyActive) {
    // Stop it
    pipelineManager.stopWorkflow(id);
    wf.status = 'inactive';
    res.json({
      message: `Workflow "${wf.name}" stopped.`,
      isRunning: false,
      status: 'inactive',
    });
  } else {
    // Start it
    try {
      pipelineManager.startWorkflow(wf);
      wf.status = 'active';
      res.json({
        message: `Workflow "${wf.name}" is now running live!`,
        isRunning: true,
        status: 'active',
      });
    } catch (err) {
      return res.status(400).json({
        error: 'Failed to start workflow pipeline',
        details: err.message,
      });
    }
  }
}

export async function deleteWorkflow(req, res) {
  const { id } = req.params;
  pipelineManager.stopWorkflow(id);
  inMemoryWorkflows.delete(id);

  if (isDbConnected()) {
    await Workflow.deleteOne({ workflowId: id }).catch(() => {});
  }

  res.json({ message: `Workflow "${id}" deleted.` });
}
