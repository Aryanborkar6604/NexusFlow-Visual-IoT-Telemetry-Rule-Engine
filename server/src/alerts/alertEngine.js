import { Alert } from '../models/Alert.js';
import { isDbConnected } from '../config/db.js';
import { sendMockSms } from './providers/mockSmsProvider.js';

// In-memory fallback history and trigger debouncing
const inMemoryAlerts = [
  {
    id: `alt_init_01`,
    workflowId: 'wf_sentinel_safety',
    workflowName: 'High Temperature Safety Sentinel',
    triggeredNodeId: 'cond_temp_overheat',
    deviceId: 'BOILER_003',
    factoryId: 'FACTORY_01',
    recipient: '+15550199',
    message: 'BOILER_003 Temperature Exceeded Safety Threshold: 92.8°C (Limit: 80°C)',
    value: 92.8,
    status: 'fired',
    createdAt: new Date(Date.now() - 30000).toISOString(),
  },
];
const triggerCooldowns = new Map();
const COOLDOWN_MS = 12000; // 12 second cooldown per device & node to avoid flood while streaming live

export class AlertEngine {
  constructor(socketServer = null) {
    this.socketServer = socketServer;
  }

  setSocketServer(socketServer) {
    this.socketServer = socketServer;
  }

  async triggerAlert({ workflowId, workflowName = 'Workflow', nodeId, deviceId = 'DEVICE_001', factoryId = 'FACTORY_01', recipient, message, value }) {
    const cooldownKey = `${workflowId}:${nodeId}:${deviceId}`;
    const now = Date.now();
    const lastTrigger = triggerCooldowns.get(cooldownKey) || 0;

    if (now - lastTrigger < COOLDOWN_MS) {
      // Cooldown active
      return null;
    }
    triggerCooldowns.set(cooldownKey, now);

    // Format template message if {{value}} is present
    const formattedMessage = message.replace('{{value}}', value);

    const alertRecord = {
      id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workflowId,
      workflowName,
      triggeredNodeId: nodeId,
      deviceId,
      factoryId,
      recipient: recipient || '+15550001',
      message: formattedMessage,
      value,
      status: 'fired',
      createdAt: new Date().toISOString(),
    };

    // 1. Dispatch SMS
    try {
      await sendMockSms({
        recipient: alertRecord.recipient,
        message: alertRecord.message,
        value: alertRecord.value,
      });
    } catch (err) {
      console.error(`[AlertEngine] SMS dispatch failed: ${err.message}`);
    }

    // 2. In-memory buffer
    inMemoryAlerts.unshift(alertRecord);
    if (inMemoryAlerts.length > 200) {
      inMemoryAlerts.pop();
    }

    // 3. Socket.IO broadcast to dashboard
    if (this.socketServer) {
      this.socketServer.emitToFactory(factoryId, 'alert:new', alertRecord);
      this.socketServer.emitToWorkflow(workflowId, 'alert:new', alertRecord);
    }

    // 4. Persistence
    if (isDbConnected()) {
      Alert.create(alertRecord).catch((err) => {
        console.error(`[AlertEngine] MongoDB persist failed: ${err.message}`);
      });
    }

    return alertRecord;
  }

  getRecentAlerts(limit = 50) {
    return inMemoryAlerts.slice(0, limit);
  }
}

export const alertEngine = new AlertEngine();
