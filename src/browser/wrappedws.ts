import autoBind from 'auto-bind';
import {
  QwsMessage,
  AckQwsMessage,
  BinaryQwsMessage,
  ErrorQwsMessage,
  HeartbeatQwsMessage,
  JsonQwsMessage,
  ReadyQwsMessage,
} from '../common/message.js';
import { deserializeMessage, serializeMessage } from './messageencode.js';
import { Binary } from '../common/discriminator.js';

/**
 * Wrapper around WebSocket, built to serialize/deserialize
 * WSQ formatted messages.
 */
export default class WrappedWebSocket {
  ws: WebSocket;

  callbacks: {
    bin?: (message: BinaryQwsMessage) => void;
    json?: (message: JsonQwsMessage) => void;
    ready?: (message: ReadyQwsMessage) => void;
    ack?: (message: AckQwsMessage) => void;
    err?: (message: ErrorQwsMessage) => void;
    ping?: (message: HeartbeatQwsMessage) => void;
    pong?: (message: HeartbeatQwsMessage) => void;
  };

  /**
   * Time of the last message or heartbeat answer received, to detect dead connections
   */
  lastActivity: number;

  private closeCallbacks: (() => void)[];
  private closed: boolean;

  constructor(wsOrUrl: WebSocket | string) {
    this.callbacks = {};
    this.lastActivity = Date.now();
    this.closeCallbacks = [];
    this.closed = false;

    if (wsOrUrl instanceof WebSocket || wsOrUrl?.constructor?.name === 'WebSocket') {
      this.ws = wsOrUrl as WebSocket;
    } else {
      this.ws = new WebSocket(wsOrUrl);
    }

    this.ws.addEventListener('message', async (event: MessageEvent<Binary>) => {
      // terminated sockets may still deliver, those messages belong to a connection we gave up on
      if (this.closed) {
        return;
      }
      this.lastActivity = Date.now();
      const message = await deserializeMessage(event.data);
      // logger.info('WRAPPER received', message);
      const callback = this.callbacks[message.headers.type] as (msg: QwsMessage) => void;
      callback?.(message);
    });

    this.ws.addEventListener('close', () => {
      this.fireClose();
    });

    autoBind(this);
  }

  // close callbacks fire once, either on the close event or on terminate()
  private fireClose(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    for (const callback of this.closeCallbacks) {
      callback();
    }
  }

  /**
   * Proxy callbacks
   */

  onWsOpen(callback: () => void): void {
    this.ws.addEventListener('open', callback);
  }

  onWsClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

  onWsError(callback: (event: Event) => void): void {
    this.ws.addEventListener('error', callback);
  }

  /**
   * Proxy others
   */
  get readyState(): number {
    return this.ws.readyState;
  }

  get bufferedAmount(): number {
    return this.ws.bufferedAmount;
  }

  /**
   * Concrete message type callbacks
   */

  onBin(callback: (message: BinaryQwsMessage) => void): void {
    this.callbacks.bin = callback;
  }

  onJson(callback: (message: JsonQwsMessage) => void): void {
    this.callbacks.json = callback;
  }

  onReady(callback: (message: ReadyQwsMessage) => void): void {
    this.callbacks.ready = callback;
  }

  onAck(callback: (message: AckQwsMessage) => void): void {
    this.callbacks.ack = callback;
  }

  onErr(callback: (message: ErrorQwsMessage) => void): void {
    this.callbacks.err = callback;
  }

  onPing(callback: (message: HeartbeatQwsMessage) => void): void {
    this.callbacks.ping = callback;
  }

  onPong(callback: (message: HeartbeatQwsMessage) => void): void {
    this.callbacks.pong = callback;
  }

  /**
   * Proxy methods
   */
  send(message: QwsMessage): void {
    // logger.info('WRAPPER sending', message);
    const data = serializeMessage(message);
    this.ws.send(data);
  }

  sendRaw(data: Binary): void {
    // logger.info('WRAPPER send raw', data.toString());
    this.ws.send(data);
  }

  close(): void {
    this.ws.close();
  }

  /**
   * Browsers can't send protocol-level pings, so heartbeats are qws ping messages,
   * answered only by peers that know them (qws 2.1+)
   */
  readonly heartbeatAnsweredByProtocol = false;

  sendHeartbeat(): void {
    this.send({ headers: { type: 'ping' } });
  }

  /**
   * Give up on the connection right away: on a dead connection the closing handshake
   * can take minutes before the close event fires
   */
  terminate(): void {
    this.ws.close(4000, 'Heartbeat timeout');
    this.fireClose();
  }
}
