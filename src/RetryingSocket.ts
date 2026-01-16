import { wsReconnects } from "@/Metrics";
import { Socket } from "@effect/platform";
import type { SocketError } from "@effect/platform/Socket";
import { Effect, Metric, Schedule, Stream } from "effect";

/**
 * A stream that will reconnect to the websocket on error.
 * Takes an Effect that produces the URL so it can re-evaluate
 * (e.g., get current cursor) on each reconnection attempt.
 */
const wsStream = <R>({ getUrl }: { getUrl: Effect.Effect<URL, never, R> }) =>
  Stream.asyncPush<Uint8Array<ArrayBufferLike>, SocketError, R>((emit) =>
    Effect.gen(function* () {
      const url = yield* getUrl;
      yield* Effect.log("Connecting to websocket at:", url.toString());
      const socket = yield* Socket.makeWebSocket(url.toString(), {
        closeCodeIsError: (_) => true,
      });

      // forkScoped ties the fiber to current scope - cleaned up on retry
      yield* socket
        .run((d) => Effect.sync(() => emit.single(d)))
        .pipe(
          Effect.catchTag("SocketError", (e) => Effect.succeed(emit.fail(e))),
          Effect.forkScoped
        );
    }).pipe(Effect.provide(Socket.layerWebSocketConstructorGlobal))
  ).pipe(
    Stream.tapErrorCause((cause) =>
      Effect.gen(function* () {
        yield* Effect.logError(cause);
        yield* Metric.increment(wsReconnects);
      })
    ),
    Stream.retry(Schedule.spaced("1 second"))
  );

export class RetryingSocket extends Effect.Service<RetryingSocket>()(
  "RetryingSocket",
  {
    succeed: wsStream,
  }
) {}
