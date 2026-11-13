# NexusFlow — No-Code IoT Automation Platform

NexusFlow is a no-code IoT automation platform designed for factory floor managers to monitor telemetry (temperature, pressure, humidity), smooth noisy sensor streams with moving averages, evaluate threshold conditions, and dispatch real-time alerts without writing code.

---

## Architecture Overview

- **Frontend**: React, Vite, Tailwind CSS, React Flow (`@xyflow/react`), Recharts, Lucide Icons, Socket.IO Client.
- **Backend**: Node.js, Express, RxJS, Socket.IO, Mongoose / MongoDB Time-Series.
- **Stream Compiler**: Validates DAG topology (DFS cycle detection), maps allowlisted operators (Zero `eval`), and executes compiled RxJS pipelines with sub-second latency.
- **Alert Engine**: SMS delivery via Twilio or Console Mock Logger with automatic debouncing and Socket.IO broadcast.
- **Simulator**: Generates realistic telemetry streams for multiple factory units with simulated spikes.

---

## Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `server/.env`:
```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nexusflow
JWT_SECRET=nexusflow_jwt_secret_key_change_in_production_2026
USE_TWILIO=false
DEFAULT_FACTORY_ID=FACTORY_01
CLIENT_ORIGIN=http://localhost:5173
```
*(Note: If MongoDB is not running locally, NexusFlow's decoupled architecture operates with in-memory persistence and streaming)*

### 3. Run the Development Environment
Start both backend and frontend servers:
```bash
# Terminal 1: Backend Server + Telemetry Simulator + Socket.IO Hub
npm run dev:server

# Terminal 2: React Frontend UI
npm run dev:client
```

Open your browser at `http://localhost:5173`.

---

## 2-Minute Live Demo Runbook

1. **Dashboard**: Navigate to `/` to watch live turbine telemetry graphs streaming via Socket.IO.
2. **Workflow Builder**: Navigate to `/builder`:
   - Drag a **Temperature Sensor** node (`TURBINE_001`, `temperature`).
   - Drag a **Moving Average** node (window: 5).
   - Drag a **Condition** node (`>` 80).
   - Drag an **SMS Alert** node (`+15550199`).
   - Connect the handles: `Sensor -> Moving Average -> Condition -> SMS Alert`.
3. **Save & Start**: Click **Save Workflow**, then toggle **Start Pipeline** to transition into LIVE mode.
4. **Trigger Anomaly**: Click the **Simulate Spike** button in the top navigation bar (or call `POST /api/alerts/test-spike`).
5. **Observe**:
   - Watch the nodes visually glow/pulse as data flows through the graph.
   - Alert toast pops up on screen with dispatch details.
   - Inspect the trigger row in the **Alert History** tab (`/history`).

---

## Security Guarantees
- **Zero-Eval Engine**: Server strictly refuses dynamic string execution (`eval`, `new Function`, `vm.run*`).
- **Strict DAG Validation**: Cyclical flows and disconnected nodes are rejected prior to compilation.
- **Tenant Isolation**: Operations and Socket.IO rooms are partitioned by `factoryId`.
