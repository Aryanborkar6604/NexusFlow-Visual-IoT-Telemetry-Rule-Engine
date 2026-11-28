
import { Alert } from '../models/Alert.js';
import { isDbConnected } from '../config/db.js';
import { sendMockSms } from './providers/mockSmsProvider.js';

// In-memory alert history
const inMemoryAlerts = [];

// Prevent repeated alerts for the same workflow, node and device
const triggerCooldowns = new Map();

const COOLDOWN_MS = 5000;
const MAX_ALERTS = 200;

export class AlertEngine {
  constructor(socketServer = null) {
    this.socketServer = socketServer;
  }

  setSocketServer(socketServer) {
    this.socketServer = socketServer;
  }

  async triggerAlert({
    workflowId,
    workflowName = 'Workflow',
    nodeId,
    deviceId = 'DEVICE_001',
    factoryId = 'FACTORY_01',
    recipient,
    message = 'Alert triggered. Current value: {{value}}',
    value,
  }) {
    // Validate required information
    if (!workflowId || !nodeId || !deviceId) {
      console.warn(
        '[AlertEngine] Missing workflowId, nodeId or deviceId.'
      );
      return null;
    }

    // Create a separate cooldown for each device
    const cooldownKey = `${workflowId}:${nodeId}:${deviceId}`;

    const now = Date.now();
    const lastTrigger = triggerCooldowns.get(cooldownKey) || 0;

    if (now - lastTrigger < COOLDOWN_MS) {
      return null;
    }

    // Set cooldown immediately to prevent duplicate triggers
    triggerCooldowns.set(cooldownKey, now);

    // Format the alert message
    const formattedMessage = String(message).replace(
      /{{value}}/g,
      String(value ?? 'N/A')
    );

    const alertRecord = {
      id: `alt_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}`,

      workflowId,
      workflowName,
      triggeredNodeId: nodeId,
      deviceId,
      factoryId,
      recipient: recipient || '+15550001',
      message: formattedMessage,
      value: value ?? null,
      status: 'fired',
      createdAt: new Date().toISOString(),
    };

    // 1. Send mock SMS notification
    try {
      await sendMockSms({
        recipient: alertRecord.recipient,
        message: alertRecord.message,
        value: alertRecord.value,
      });
    } catch (error) {
      console.error(
        '[AlertEngine] SMS dispatch failed:',
        error.message
      );
    }

    // 2. Save alert in memory
    inMemoryAlerts.unshift(alertRecord);

    if (inMemoryAlerts.length > MAX_ALERTS) {
      inMemoryAlerts.pop();
    }

    // 3. Send live alert through Socket.IO
    if (this.socketServer) {
      try {
        this.socketServer.emitToFactory(
          factoryId,
          'alert:new',
          alertRecord
        );

        this.socketServer.emitToWorkflow(
          workflowId,
          'alert:new',
          alertRecord
        );
      } catch (error) {
        console.error(
          '[AlertEngine] Socket broadcast failed:',
          error.message
        );
      }
    }

    // 4. Save alert in MongoDB when connected
    if (isDbConnected()) {
      try {
        await Alert.create(alertRecord);
      } catch (error) {
        console.error(
          '[AlertEngine] MongoDB persist failed:',
          error.message
        );
      }
    }

    return alertRecord;
  }

  // Get recent alerts from in-memory history
  getRecentAlerts(limit = 50) {
    const safeLimit = Math.max(
      0,
      Math.min(Number.parseInt(limit, 10) || 50, MAX_ALERTS)
    );

    return inMemoryAlerts.slice(0, safeLimit);
  }
}

export const alertEngine = new AlertEngine();
