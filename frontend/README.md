# NexusFlow Studio

Week 1 frontend foundation for the NexusFlow visual IoT rule builder described in `PROJECT.pdf`.

## Start

Requires Node.js 18 or newer.

```sh
cd frontend
npm install
npm run dev
```

## Current scope

- A React Flow canvas with source, moving average, math, condition, and action nodes.
- Connectable ports, selectable nodes, editable settings, and a node library.
- A local rule preview that calculates moving averages, evaluates conditions, and highlights triggered actions.
- Browser draft persistence and JSON export using `{ name, enabled, graph: { nodes, edges } }`.

The preview uses sample turbine telemetry until you connect to the API. Sign in from **Connect API** to save the rule server-side and stream live telemetry. Alert delivery is logged as a mock action by the backend; it does not send real SMS or webhooks.
