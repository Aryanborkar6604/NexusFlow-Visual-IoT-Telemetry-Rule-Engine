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

Set `JWT_SECRET` to a long, random value before deployment. Register an account with `POST /api/auth/register` using `{"email":"manager@example.com","password":"at-least-8-chars"}`, or log in with `POST /api/auth/login`. Both return a bearer `token`. Pass it as `Authorization: Bearer <token>` on `/api/*` calls. Registration, login, and `/health` are public; `/api/auth/me` requires a token. Data is isolated by account.

## API

- `GET /health` — process health.
- `POST /api/telemetry` — one point or an array (up to `MAX_TELEMETRY_BATCH`): `{"sensorId":"turbine-1","deviceId":"turbine","timestamp":"2026-11-13T10:00:00.000Z","measurements":{"value":92.4,"temperature":92.4}}`. Requires a bearer token. Returns `202` after accepting into the write queue and executing active rules.
- `POST /api/device-keys` — create a named hardware key using a bearer token and `{"name":"Turbine 1"}`. The secret is returned once; store it securely. `GET /api/device-keys` lists active key names and prefixes, and `DELETE /api/device-keys/:id` revokes a key.
- `GET /api/telemetry/latest?sensorId=turbine-1&limit=100` — recent stored points.
- `GET /api/telemetry/forecast?sensorId=turbine-1&field=temperature&model=linear-trend&horizon=5&limit=100` — predicts future values from recent history. Available models are `linear-trend` (default), `moving-average`, `exponential-smoothing`, and `seasonal-naive`. Optional parameters are `window` for moving average, `alpha` (0, 1] for exponential smoothing, and `seasonLength` for seasonal naive. The sampling interval is inferred from historical timestamps; at least three numeric readings with distinct timestamps are required. These lightweight baselines provide estimates and are not trained forecasting models.
- `GET /api/rules`, `POST /api/rules`, `DELETE /api/rules/:id` — manage rule graphs. `POST` body: `{"name":"High turbine temperature","enabled":true,"graph":{"nodes":[...],"edges":[...]}}`.
- `GET /api/alerts?limit=100` — recent triggered alerts.

Hardware may send telemetry with `X-API-Key: nxf_...` instead of a manager JWT. Device keys are account-scoped and only authorize telemetry ingestion. Keep the secret in the device's secure configuration; it cannot be retrieved later, only revoked and replaced.

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

One sensor source and at least one alert are required. Graphs must be acyclic, every node must be reachable from the sensor, and each non-source node must have exactly one incoming edge. Nodes can branch into multiple downstream paths, but each path must end at an alert node; merged paths are rejected because their data semantics are ambiguous. Every branch receives the stream produced by its parent node, and condition nodes pass only readings that match their condition. Unsupported node types and invalid settings are rejected before a rule is saved. Moving average supports an integer `window` (1–10000) and `field`; conditions support `gt`, `gte`, `lt`, `lte`, and `eq`. An alert node with `webhookUrl` sends a JSON POST; one with `phone` emits a mock SMS delivery log. Real SMS needs a provider integration.

## WebSocket protocol

Connect to `/ws?token=<bearer-token>`. Send `{ "type":"telemetry", "data":{...telemetry point...} }` to ingest a point, or `{ "type":"subscribe", "sensorId":"turbine-1" }` to acknowledge a subscription. The server broadcasts `{ "type":"telemetry", "data":... }` and `{ "type":"alert", "data":... }` events to authenticated clients belonging to the same account. Device API keys are for HTTP ingestion; the WebSocket uses a manager JWT.

## Deployment notes

The telemetry write queue is in-memory and tuned by `TELEMETRY_BATCH_SIZE` and `TELEMETRY_FLUSH_MS`; `MAX_PENDING_TELEMETRY` bounds queued points and returns HTTP 503 when full so clients can retry. WebSocket connections are capped by `MAX_WEBSOCKET_CLIENTS`, and slow consumers are disconnected after buffering more than `MAX_WEBSOCKET_BUFFERED_BYTES`. `MONGODB_MAX_POOL_SIZE` controls the MongoDB connection pool. Use a durable queue for lossless ingestion across process crashes or multiple replicas. MongoDB time-series collections are append-oriented and don't support every ordinary collection operation.
