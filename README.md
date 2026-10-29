# WSQ (WebSocket Queue)

Safe queueing with auto-reconnect for WebSockets

- Wrapper for built-in `WebSocket`
- Works in browser and node (via [ws](https://github.com/websockets/ws))
- Automatic reconnect
- Message queueing with retainment
- Automatic two-way acknowledgment stream of messages - all messages are retained in-memory until acknowledgment is provided
- Configurable headers per message, even when body is binary
- Simple message routing (via [route-recognizer](https://github.com/tildeio/route-recognizer))
- Heartbeats detecting dead connections
- Waiting for the acknowledgment of a given message

Since version 2, `qws-browser` is an ES module only (no CommonJS build), meant to be consumed via a bundler such as Vite.

# Heartbeats

Every `heartbeatIntervalMillis` (default 25s, `0` disables), a connection sends a heartbeat. If nothing arrives, not even the answer, until the next one, the connection is considered dead and is terminated, which triggers the usual close/reconnect logic. This catches connections that died silently (sleeping devices, network switches), on which no close event would arrive for minutes.

- Node uses protocol-level pings, which every WebSocket peer (including browsers) answers.
- Browsers can't send protocol-level pings, so they send qws `ping` messages, answered with `pong` by qws 2.1+ peers. Until the first `pong` arrives on a connection, a missing answer is not treated as a dead connection, so older servers keep working.
- `QWebSocketServer` takes the options of the connections it creates as second argument: `new QWebSocketServer({ port }, { heartbeatIntervalMillis: 10_000 })`.

# Waiting for acknowledgment

`send`/`sendToRoute` return the message index. `waitForAck(idx)` resolves once the other side acknowledged that message (after its handler finished), and rejects if the connection closes for good before that. Reconnecting connections keep and resend unacknowledged messages, so they don't reject on a reconnect.

```ts
const idx = qws.sendToRoute('handout', message);
await qws.waitForAck(idx);
```

# Examples

TODO
