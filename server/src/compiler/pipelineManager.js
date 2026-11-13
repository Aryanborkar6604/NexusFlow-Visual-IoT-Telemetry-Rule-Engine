import { compileWorkflow } from './streamCompiler.js';
import { getOrCreateDeviceStream } from '../ingestion/ingestionService.js';
import { alertEngine } from '../alerts/alertEngine.js';

class PipelineManager {
  constructor() {
    this.activeSubscriptions = new Map(); // workflowId -> Subscription
    this.socketServer = null;
  }

  setSocketServer(socketServer) {
    this.socketServer = socketServer;
  }

  /**
   * Starts a workflow by compiling it and binding to the relevant sensor stream
   */
  startWorkflow(workflow) {
    const wfId = workflow.id || workflow.workflowId;

    // Stop existing subscription if running
    this.stopWorkflow(wfId);

    // Find the sensor node to bind to the appropriate device stream
    const sensorNode = (workflow.nodes || []).find((n) => n.type === 'sensor');
    if (!sensorNode || !sensorNode.data?.deviceId) {
      throw new Error(`Cannot start workflow "${wfId}": No sensor node with a valid deviceId found.`);
    }

    const { deviceId } = sensorNode.data;
    const device$ = getOrCreateDeviceStream(deviceId);

    // Context with alert dispatch & live status emit
    const context = {
      dispatchAlert: ({ recipient, message, value }) => {
        alertEngine.triggerAlert({
          workflowId: wfId,
          workflowName: workflow.name || 'Workflow',
          nodeId: context.nodeId,
          deviceId,
          factoryId: workflow.factoryId || 'FACTORY_01',
          recipient,
          message,
          value,
        });
      },
      emitNodeStatus: (statusPayload) => {
        if (this.socketServer) {
          this.socketServer.emitToWorkflow(wfId, 'workflow:nodeStatus', statusPayload);
          this.socketServer.emitToFactory(workflow.factoryId || 'FACTORY_01', 'workflow:nodeStatus', statusPayload);
        }
      },
    };

    // Compile into an RxJS pipeline
    const pipelineFunction = compileWorkflow(workflow, context);
    const compiledObservable$ = pipelineFunction(device$);

    // Subscribe to execute
    const subscription = compiledObservable$.subscribe({
      next: (val) => {
        // Output from terminal node
      },
      error: (err) => {
        console.error(`[PipelineManager] Error in workflow pipeline "${wfId}":`, err.message);
        this.stopWorkflow(wfId);
      },
      complete: () => {
        console.log(`[PipelineManager] Workflow pipeline "${wfId}" completed.`);
      },
    });

    this.activeSubscriptions.set(wfId, subscription);
    console.log(`[PipelineManager] Started workflow pipeline "${wfId}" on device "${deviceId}".`);
    return true;
  }

  /**
   * Stops a running workflow pipeline
   */
  stopWorkflow(workflowId) {
    if (this.activeSubscriptions.has(workflowId)) {
      const sub = this.activeSubscriptions.get(workflowId);
      sub.unsubscribe();
      this.activeSubscriptions.delete(workflowId);
      console.log(`[PipelineManager] Stopped workflow pipeline "${workflowId}".`);
      return true;
    }
    return false;
  }

  isWorkflowActive(workflowId) {
    return this.activeSubscriptions.has(workflowId);
  }

  getActiveWorkflowIds() {
    return Array.from(this.activeSubscriptions.keys());
  }
}

export const pipelineManager = new PipelineManager();
