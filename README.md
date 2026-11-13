<<<<<<< HEAD
# NexusFlow backend

Node.js/Express backend for telemetry ingestion, MongoDB time-series storage, and dynamically compiled RxJS rules. The frontend can POST serialized React Flow graphs and stream live telemetry/alerts over WebSockets.

## Run locally

Requires Node.js 20+ and MongoDB 5.0+.

```sh
npm install
Copy-Item .env.example .env
npm run dev
```

The API listens on `http://localhost:4000`; WebSocket clients connect to `ws://localhost:4000/ws`. MongoDB creates a `telemetry` time-series collection with a 90-day retention window on first startup. Set `MONGODB_URI` and `MONGODB_DB` in `.env` as needed.

## API

- `GET /health` — process health.
- `POST /api/telemetry` — one point or an array (up to `MAX_TELEMETRY_BATCH`): `{"sensorId":"turbine-1","deviceId":"turbine","timestamp":"2026-11-13T10:00:00.000Z","measurements":{"value":92.4,"temperature":92.4}}`. Returns `202` after accepting into the write queue and executing active rules.
- `GET /api/telemetry/latest?sensorId=turbine-1&limit=100` — recent stored points.
- `GET /api/rules`, `POST /api/rules`, `DELETE /api/rules/:id` — manage rule graphs. `POST` body: `{"name":"High turbine temperature","enabled":true,"graph":{"nodes":[...],"edges":[...]}}`.
- `GET /api/alerts?limit=100` — recent triggered alerts.

## Rule graph format

Use React Flow's `nodes` and `edges`. Each node needs `id`, `type`, and `data`; edges need `source` and `target`. Supported node types are `sensor`, `movingAverage`, `condition`, and `alert`. Example:

```json
{
  "nodes": [
    { "id": "s1", "type": "sensor", "data": { "sensorId": "turbine-1" } },
    { "id": "avg", "type": "movingAverage", "data": { "field": "temperature", "window": 5 } },
    { "id": "threshold", "type": "condition", "data": { "field": "movingAverage", "operator": "gt", "value": 80 } },
    { "id": "sms", "type": "alert", "data": { "phone": "+15551234567", "message": "Turbine is overheating" } }
  ],
  "edges": [
    { "id": "e1", "source": "s1", "target": "avg" },
    { "id": "e2", "source": "avg", "target": "threshold" },
    { "id": "e3", "source": "threshold", "target": "sms" }
  ]
}
```

One sensor source and at least one alert are required. Graphs must be acyclic. Moving average supports `window` (1–10000) and `field`; conditions support `gt`, `gte`, `lt`, `lte`, and `eq`. An alert node with `webhookUrl` sends a JSON POST; one with `phone` emits a mock SMS delivery log. Real SMS needs a provider integration.

## WebSocket protocol

Connect to `/ws`. Send `{ "type":"telemetry", "data":{...telemetry point...} }` to ingest a point, or `{ "type":"subscribe", "sensorId":"turbine-1" }` to acknowledge a subscription. The server broadcasts `{ "type":"telemetry", "data":... }` and `{ "type":"alert", "data":... }` events to all connected clients.

## Deployment notes

The telemetry write queue is in-memory and tuned by `TELEMETRY_BATCH_SIZE` and `TELEMETRY_FLUSH_MS`; use a durable queue for lossless ingestion across process crashes or multiple replicas. Configure authentication, authorization, and per-device credentials before exposing ingestion or rule management publicly. MongoDB time-series collections are append-oriented and don't support every ordinary collection operation.
=======
# NexusFlow-Visual-IoT-Telemetry-Rule-Engine
NexusFlow is a no-code IoT monitoring and automation platform that allows users to create visual workflows using drag-and-drop nodes. It processes real-time sensor data using Node.js, RxJS, and MongoDB, enabling dynamic rule execution, live monitoring, anomaly detection, and automated alerts.
>>>>>>> 7347b6601bc23bc16d607f8966875b258d892495
