import { ApiLive } from "@/HttpApi"
import { LabelWatcherLive } from "@/LabelWatcher"
import { LoggerLive } from "@/logger"
import { MemoryMetricsLive, MetricsLive } from "@/Metrics"
import { Layer } from "effect"
import "dotenv/config"
import { BunRuntime } from "@effect/platform-bun"
import { Env } from "@/Environment"

/**
 * v1:
 *  - Subscribes to websocket with cursor
 *  - Retries the socket on failure
 *  - Validates payloads as label messages
 *  - Adds or removes users from lists in order of labeling
 *    - Does not resolve net changes before applying, so adding a label then removing the label will
 *      result in two actions when it could be none.
 *  - Saves cursor state to filesystem every 1 second to reconnect at the last known value
 *  - Has a basic HttpApi:
 *    - GET /health
 *    - GET /cursor
 *
 * @NEXT v1.1
 *  - Telemetry / Metrics / Dashboard?
 *  - Error logging
 *
 * v1.2
 *  - Listen for profile labels as well as account labels
 *  - Export it as a package and allow passing in custom label map.
 */

export const MainLiveLayer = Layer.mergeAll(
  LabelWatcherLive.pipe(Layer.provide(Env.Default)),
  ApiLive,
  MemoryMetricsLive,
).pipe(
  Layer.provide(LoggerLive),
  Layer.provide(MetricsLive),
)

Layer.launch(MainLiveLayer).pipe(BunRuntime.runMain)
