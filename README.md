# NexusFlow

Visual IoT telemetry rules with a React Flow editor and a Node.js/MongoDB API.

## Run locally

Requires Node.js 20+ and MongoDB 5.0+.

1. Install backend packages: `npm install`.
2. Copy `.env.example` to `.env` and set `JWT_SECRET` to a random value of at least 32 characters.
3. Start MongoDB.
4. Start the API with `npm run dev`.
5. In another terminal, run `npm install --prefix frontend`, then `npm run dev:frontend`.
6. Open the Vite URL and choose **Connect API** to create an account or sign in.

The API defaults to `http://localhost:4000`. The frontend can override its initial API URL with `VITE_API_URL`.

## API surface

- `GET /health` is a public health check.
- `POST /api/auth/register` and `/api/auth/login` issue a 12-hour bearer token.
- `GET /api/rules`, `POST /api/rules`, `PUT /api/rules/:id`, and `DELETE /api/rules/:id` manage account-scoped rule graphs.
- `POST /api/telemetry` ingests one point or a batch. `GET /api/telemetry/latest?sensorId=...` reads recent points.
- `GET /api/alerts` lists rule action records. Alert actions are logged as mocked deliveries; they do not send real SMS or webhooks.
- `ws://localhost:4000/ws?token=...` streams authenticated telemetry and alerts. Send `{ "type": "subscribe", "sensorId": "turbine-01" }` to filter telemetry by sensor.

Telemetry is stored in a MongoDB time-series collection with 90-day retention. Rule graphs support `sensor`, `movingAverage`, `mathOperation`, `condition`, and `alert` nodes. Each graph must have one sensor source, at least one alert, one incoming edge per non-source node, and no cycles.

This is the first full-stack slice. The current moving-average evaluator performs bounded MongoDB reads per matching point; use a buffered stream processor before production high-rate ingestion. Account auth is implemented, while hardware API keys, rule editor multi-rule navigation, and real alert providers remain follow-up work.
