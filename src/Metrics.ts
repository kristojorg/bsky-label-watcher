import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { Config, Effect, Layer, Metric, Schedule } from "effect"

// App metrics
export const messagesProcessed = Metric.counter("messages_processed_total", {
  description: "Total websocket messages processed",
})

export const cursorGauge = Metric.gauge("cursor_value", {
  description: "Current cursor position",
})

export const listOperations = Metric.counter("list_operations_total", {
  description: "List add/remove operations",
})

export const wsReconnects = Metric.counter("websocket_reconnects_total", {
  description: "WebSocket reconnection attempts",
})

// Memory metrics
export const heapUsed = Metric.gauge("nodejs_heap_used_bytes", {
  description: "Node.js heap used in bytes",
})

export const rss = Metric.gauge("nodejs_rss_bytes", {
  description: "Node.js resident set size in bytes",
})

// Record memory metrics every 30 seconds
export const recordMemoryMetrics = Effect.gen(function* () {
  const mem = process.memoryUsage()
  yield* Metric.set(heapUsed, mem.heapUsed)
  yield* Metric.set(rss, mem.rss)
}).pipe(Effect.repeat(Schedule.spaced("30 seconds")), Effect.forkScoped)

// Prometheus exporter config
const MetricsConfig = Config.integer("METRICS_PORT").pipe(
  Config.withDefault(9464)
)

// NodeSdk layer with Prometheus exporter
export const MetricsLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const port = yield* MetricsConfig
    yield* Effect.log(`Starting Prometheus metrics exporter on port ${port}`)

    return NodeSdk.layer(() => ({
      resource: {
        serviceName: "bsky-label-watcher",
        serviceVersion: "1.0.0",
      },
      metricReader: new PrometheusExporter({ port }),
    }))
  })
)

// Layer that starts memory recording
export const MemoryMetricsLive = Layer.scopedDiscard(recordMemoryMetrics)
