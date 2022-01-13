import autoBind from 'auto-bind';
import WebSocket, { MessageEvent, Event } from 'ws';

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

    this.ws = wsOrUrl instanceof WebSocket ? wsOrUrl : new WebSocket(wsOrUrl);
    this.ws.onmessage = async (event: MessageEvent) => {
      const message = await deserializeMessage(event.data as Buffer);
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
    const data = serializeMessage(message);
    this.ws.send(data);
  }

  sendRaw(data: Binary): void {
    console.log('Actual send', data.length);
    this.ws.send(data);
  }

  close(): void {
    this.ws.close();
  }
}
