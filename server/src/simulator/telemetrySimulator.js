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
    // Simulate all 4 industrial equipment units
    const deviceConfigs = [
      { id: 'TURBINE_001', minT: 68, maxT: 78, baseP: 115, baseH: 40 },
      { id: 'PUMP_002', minT: 50, maxT: 62, baseP: 95, baseH: 35 },
      { id: 'BOILER_003', minT: 88, maxT: 96, baseP: 140, baseH: 65 },
      { id: 'CONVEYOR_004', minT: 34, maxT: 42, baseP: 20, baseH: 52 },
    ];

    for (const dev of deviceConfigs) {
      if (!this.state[dev.id]) {
        this.state[dev.id] = { temp: (dev.minT + dev.maxT) / 2, pressure: dev.baseP, humidity: dev.baseH };
      }

      const st = this.state[dev.id];
      // Jitter temperature
      st.temp = Math.round((st.temp + (Math.random() - 0.49) * 1.4) * 10) / 10;
      if (st.temp < dev.minT) st.temp = dev.minT + 0.5;
      if (st.temp > dev.maxT) st.temp = dev.maxT - 0.5;

      // Jitter pressure & humidity
      st.pressure = Math.round(st.pressure + (Math.random() - 0.5) * 2);
      st.humidity = Math.round(st.humidity + (Math.random() - 0.5) * 1.5);

      const reading = {
        deviceId: dev.id,
        factoryId: 'FACTORY_01',
        timestamp: new Date().toISOString(),
        temperature: st.temp,
        pressure: st.pressure,
        humidity: st.humidity,
      };

      try {
        const processed = ingestReading(reading, this.socketServer);
        updateDeviceReading(processed);
      } catch (err) {
        console.error(`[Simulator] Ingest error on ${dev.id}: ${err.message}`);
      }
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
