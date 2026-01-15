import { Cursor } from "@/Cursor"
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpServer,
} from "@effect/platform"
import { BunHttpServer } from "@effect/platform-bun"
import { Config, Effect, Layer, Schema } from "effect"

// A simple API for checking on the service
const ServerApi = HttpApi.make("ServerApi").add(
  HttpApiGroup.make("Health")
    .add(
      HttpApiEndpoint.get("health")`/health`.addSuccess(
        Schema.String,
      ),
    )
    .add(HttpApiEndpoint.get("cursor")`/cursor`.addSuccess(Schema.Number))
    .add(
      HttpApiEndpoint.get("not-found", "*").addSuccess(Schema.String),
    ),
).addError(
  HttpApiError.NotFound,
  {
    status: 404,
  },
)

const NotFound = () => Effect.fail(new HttpApiError.NotFound())

// Implement the "Health" group
const HealthLive = HttpApiBuilder.group(ServerApi, "Health", (handlers) => {
  return handlers
    .handle(
      "not-found",
      NotFound,
    )
    .handle("health", () => Effect.succeed("Looks ok."))
    .handle("cursor", () => Cursor.get)
})

// Provide the implementation for the API
const ServerApiLive = HttpApiBuilder.api(ServerApi).pipe(
  Layer.provide(HealthLive),
)

// Set up the server using BunHttpServer with configurable port/host
const ServerConfig = Config.all({
  port: Config.integer("PORT").pipe(Config.withDefault(3000)),
  hostname: Config.string("HOST").pipe(Config.withDefault("localhost")),
})

export const ApiLive = HttpApiBuilder.serve().pipe(
  Layer.provide(ServerApiLive),
  HttpServer.withLogAddress,
  Layer.provide(
    Layer.unwrapEffect(
      Effect.map(ServerConfig, (config) => BunHttpServer.layer(config))
    )
  ),
  Layer.provide(Cursor.Default),
)
