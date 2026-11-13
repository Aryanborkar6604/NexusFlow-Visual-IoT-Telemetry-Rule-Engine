import { ingestReading } from '../ingestion/ingestionService.js';
import { updateDeviceReading } from '../controllers/deviceController.js';

class TelemetrySimulator {
  constructor() {
    this.timer = null;
    this.socketServer = null;
    this.intervalMs = 1500; // 1.5s interval for smooth demo view
    this.state = {
      TURBINE_001: { temp: 72.0, pressure: 115, humidity: 40 },
      PUMP_002: { temp: 54.0, pressure: 95 },
      BOILER_003: { temp: 92.0, pressure: 138 },
      CONVEYOR_004: { temp: 37.0, humidity: 55 },
    };
  }

  setSocketServer(server) {
    this.socketServer = server;
  }

  start(intervalMs = 1500) {
    if (this.timer) return;
    this.intervalMs = intervalMs;
    console.log(`[Simulator] Starting telemetry simulator (interval: ${this.intervalMs}ms)...`);

    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log(`[Simulator] Simulator stopped.`);
    }
  }

  tick() {
    // 1. Simulate TURBINE_001
    const t = this.state.TURBINE_001;
    // Small natural jitter around 72-76°C
    t.temp = Math.round((t.temp + (Math.random() - 0.48) * 1.2) * 10) / 10;
    if (t.temp < 65) t.temp = 68;
    if (t.temp > 79) t.temp = 77; // Stay under 80 threshold unless spiked

    t.pressure = Math.round(t.pressure + (Math.random() - 0.5) * 2);
    t.humidity = Math.round(t.humidity + (Math.random() - 0.5) * 1);

    const reading = {
      deviceId: 'TURBINE_001',
      factoryId: 'FACTORY_01',
      timestamp: new Date().toISOString(),
      temperature: t.temp,
      pressure: t.pressure,
      humidity: t.humidity,
    };

    try {
      const processed = ingestReading(reading, this.socketServer);
      updateDeviceReading(processed);
    } catch (err) {
      console.error(`[Simulator] Ingest error: ${err.message}`);
    }
  }

  /**
   * Manually trigger a temperature spike on TURBINE_001
   */
  injectSpike(deviceId = 'TURBINE_001', temp = 88.5) {
    console.log(`[Simulator] INJECTING SPIKE on ${deviceId}: ${temp}°C!`);
    const reading = {
      deviceId,
      factoryId: 'FACTORY_01',
      timestamp: new Date().toISOString(),
      temperature: temp,
      pressure: 135,
      humidity: 43,
    };
    const processed = ingestReading(reading, this.socketServer);
    updateDeviceReading(processed);
    return processed;
  }
}

export const simulator = new TelemetrySimulator();

// If run directly via CLI
if (process.argv[1]?.endsWith('telemetrySimulator.js')) {
  simulator.start(1000);
}
