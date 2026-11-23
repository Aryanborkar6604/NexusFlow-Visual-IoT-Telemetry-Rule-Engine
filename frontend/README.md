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

- A React Flow canvas with source, moving average, condition, and action nodes.
- Connectable ports, selectable nodes, a settings inspector, and a node library.
- Local rule preview and JSON export using the backend's `{ name, enabled, graph: { nodes, edges } }` shape.

The canvas currently uses sample turbine telemetry. Persistence, authenticated API calls, live telemetry, and alert delivery connect to the backend in later integration work.
