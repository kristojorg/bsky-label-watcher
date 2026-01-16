import { Socket } from "@effect/platform";
import type { SocketError } from "@effect/platform/Socket";
import { Cause, Effect, Schedule, Stream } from "effect";

/**
 * A stream that will reconnect to the websocket on error.
 * Takes an Effect that produces the URL so it can re-evaluate
 * (e.g., get current cursor) on each reconnection attempt.
 */
const wsStream = <R>({ getUrl }: { getUrl: Effect.Effect<URL, never, R> }) =>
  Stream.asyncPush<Uint8Array<ArrayBufferLike>, SocketError, R>((emit) =>
    Effect.gen(function* () {
      const url = yield* getUrl;
      yield* Effect.log("Connecting to websocket at: ", url.toString());
      const socket = yield* Socket.makeWebSocket(url.toString(), {
        closeCodeIsError: (_) => true,
      });

      const e = socket
        .run((d) =>
          Effect.gen(function* () {
            const didEmit = emit.single(d);
            if (!didEmit) {
              // this doesn't seem to work because asyncPush uses an unbounded queue internally
              // and thus it only returns false when done.
              yield* new BufferOverflowError({
                message: "Socket buffer overflowed, failed to emit a message.",
              });
            }
          })
        )
        .pipe(
          Effect.catchTag("SocketError", (e) => Effect.succeed(emit.fail(e))),
          Effect.fork
        );

      yield* e;
    }).pipe(Effect.provide(Socket.layerWebSocketConstructorGlobal))
  ).pipe(
    Stream.tapErrorCause(Effect.logError),
    Stream.retry(Schedule.spaced("1 second"))
  );

export class RetryingSocket extends Effect.Service<RetryingSocket>()(
  "RetryingSocket",
  {
    succeed: wsStream,
  }
) {}
