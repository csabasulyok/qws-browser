# WSQ (WebSocket Queue)

Safe queueing with auto-reconnect for WebSockets

- Wrapper for built-in `WebSocket`
- Works in browser and node (via [ws](https://github.com/websockets/ws))
- Automatic reconnect
- Message queueing with retainment
- Automatic two-way acknowledgment stream of messages - all messages are retained in-memory until acknowledgment is provided
- Configurable headers per message, even when body is binary
- Simple message routing (via [route-recognizer](https://github.com/tildeio/route-recognizer))

# Examples

TODO
