import autoBind from 'auto-bind';

import { WsqMessage, AckWsqMessage, BinaryWsqMessage, ErrorWsqMessage, JsonWsqMessage, ReadyWsqMessage } from '../common/message';
import { deserializeMessage, serializeMessage } from './messageencode';
import { toUrlParams } from '../common/queryparser';

/**
 * Wrapper around WebSocket, built to serialize/deserialize
 * WSQ formatted messages.
 */
export default class WrappedWebSocket {
  url: string;
  queryParams: Record<string, unknown>;
  ws: WebSocket;

  callbacks: {
    bin?: (message: BinaryWsqMessage) => void;
    json?: (message: JsonWsqMessage) => void;
    ready?: (message: ReadyWsqMessage) => void;
    ack?: (message: AckWsqMessage) => void;
    err?: (message: ErrorWsqMessage) => void;
  };

  constructor(url: string, queryParams: Record<string, unknown> = {}) {
    this.url = url;
    this.queryParams = queryParams;
    this.callbacks = {};

    this.ws = new WebSocket(`${this.url}?${toUrlParams(this.queryParams)}`);

    this.ws.onmessage = async (event: MessageEvent<Blob>) => {
      const message = await deserializeMessage(event.data);
      const callback = this.callbacks[message.headers.type] as (msg: WsqMessage) => void;
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

  onBin(callback: (message: BinaryWsqMessage) => void): void {
    this.callbacks.bin = callback;
  }

  onJson(callback: (message: JsonWsqMessage) => void): void {
    this.callbacks.json = callback;
  }

  onReady(callback: (message: ReadyWsqMessage) => void): void {
    this.callbacks.ready = callback;
  }

  onAck(callback: (message: AckWsqMessage) => void): void {
    this.callbacks.ack = callback;
  }

  onErr(callback: (message: ErrorWsqMessage) => void): void {
    this.callbacks.err = callback;
  }

  /**
   * Proxy methods
   */
  send(message: WsqMessage): void {
    const data = serializeMessage(message);
    this.ws.send(data);
  }

  sendRaw(data: Blob): void {
    this.ws.send(data);
  }

  close(): void {
    this.ws.close();
  }
}
