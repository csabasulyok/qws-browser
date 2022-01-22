import autoBind from 'auto-bind';

import { QwsMessage, AckQwsMessage, BinaryQwsMessage, ErrorQwsMessage, JsonQwsMessage, ReadyQwsMessage } from '../common/message';
import { deserializeMessage, serializeMessage } from './messageencode';
import { Binary } from '../common/discriminator';

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
  };

  constructor(wsOrUrl: WebSocket | string) {
    this.callbacks = {};

    if (wsOrUrl instanceof WebSocket || wsOrUrl?.constructor?.name === 'WebSocket') {
      this.ws = wsOrUrl as WebSocket;
    } else {
      this.ws = new WebSocket(wsOrUrl);
    }

    this.ws.onmessage = async (event: MessageEvent<Binary>) => {
      const message = await deserializeMessage(event.data);
      // logger.info('WRAPPER received', message);
      const callback = this.callbacks[message.headers.type] as (msg: QwsMessage) => void;
      callback?.(message);
    };

    autoBind(this);
  }

  /**
   * Proxy callbacks
   */

  onWsOpen(callback: () => void): void {
    this.ws.onopen = callback;
  }

  onWsClose(callback: () => void): void {
    this.ws.onclose = callback;
  }

  onWsError(callback: (event: Event) => void): void {
    this.ws.onerror = callback;
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
}
