import autoBind from 'auto-bind';
import WebSocket from 'ws';

import { Binary } from './discriminator';
import {
  AckQwsMessage,
  BinaryQwsMessage,
  ErrorQwsMessage,
  JsonQwsMessage,
  PayloadQwsMessage,
  ReadyQwsMessage,
  QwsMessageExtraHeaders,
} from './message';
import WebSocketMessageQueue from './queue';
import WrappedWebSocket from '../node/wrappedws';
import { addQueryParamsToUrl } from './queryparser';

const decodeErrorMessage = (event): string => {
  if (event?.message) {
    return event.message;
  }
  if (event) {
    return event.toString();
  }

  return 'Unknown error';
};

type QWebSocketOptions = {
  name?: string;
  extraConnectArgs?: Record<string, unknown>;
  wsReconnectNumTries?: number;
  wsReconnectIntervalMillis?: number;
};

const defaultOpts: Partial<QWebSocketOptions> = {
  extraConnectArgs: {},
  wsReconnectNumTries: 12,
  wsReconnectIntervalMillis: 5000,
};

export default class QWebSocket {
  wsOrUrl: WebSocket | string;
  name: string;
  options: QWebSocketOptions;

  queue: WebSocketMessageQueue;
  reconnectionAttempts: number;
  needed: boolean;
  wws: WrappedWebSocket;
  ready: boolean;

  callbacks: {
    onConnect?: () => number;
    onBin?: (body: Binary, extraHeaders: QwsMessageExtraHeaders) => void;
    onJson?: (body: Record<string, unknown>, extraHeaders: QwsMessageExtraHeaders) => void;
    onErroneousDisconnect?: (message: string) => void;
    onError?: (message: string) => void;
    onClose?: () => void;
  };

  constructor(wsOrUrl: WebSocket | string, options: QWebSocketOptions = {}) {
    this.wsOrUrl = wsOrUrl;
    this.options = {
      ...defaultOpts,
      ...options,
    };

    this.name = options.name || 'websocket';
    this.callbacks = {};

    this.queue = new WebSocketMessageQueue();
    this.reconnectionAttempts = 0;
    this.needed = true;
    this.wws = null;
    this.ready = false;
    autoBind(this);

    this.connect();
  }

  /**
   * Public callback assignments for client
   */

  onConnect(callback: () => number): void {
    this.callbacks.onConnect = callback;
  }

  onBin(callback: (body: Binary, extraHeaders: QwsMessageExtraHeaders) => void): void {
    this.callbacks.onBin = callback;
  }

  onJson(callback: (body: Record<string, unknown>, extraHeaders: QwsMessageExtraHeaders) => void): void {
    this.callbacks.onJson = callback;
  }

  onErroneousDisconnect(callback: () => void): void {
    this.callbacks.onErroneousDisconnect = callback;
  }

  onError(callback: (message: string) => void): void {
    this.callbacks.onError = callback;
  }

  onClose(callback: () => void): void {
    this.callbacks.onClose = callback;
  }

  /**
   * Main logic
   */

  // eslint-disable-next-line max-lines-per-function
  connect(): void {
    if (this.wws && this.wws.readyState <= 1) {
      return;
    }

    this.reconnectionAttempts += 1;

    // timeout for too many reconnection attempts
    if (this.reconnectionAttempts > this.options.wsReconnectNumTries) {
      console.error(`${this.name}: Connection timed out, should re-connect entirely`);
      this.callbacks.onError?.(`WS connection timeout, max tries (${this.options.wsReconnectNumTries}) exceeded`);
      return;
    }

    /**
     * Actual WebSocket opening
     */
    if (this.wsOrUrl instanceof WebSocket || this.wsOrUrl?.constructor?.name === 'WebSocket') {
      const ws = this.wsOrUrl as WebSocket;
      this.wws = new WrappedWebSocket(ws);
      // TODO what if this is a reconnect? No reconnection was attempted, it's just the old reference
    } else {
      const connectUrl = addQueryParamsToUrl(this.wsOrUrl, {
        ...this.options.extraConnectArgs,
        idx: this.queue.ackIdx,
      });
      this.wws = new WrappedWebSocket(connectUrl);
    }

    this.wws.onWsError((event) => {
      // ws error will prompt reconnection which can time out, don't reject instantly
      const message = decodeErrorMessage(event);
      console.error(`${this.name}: WS error occurred: ${message}`);
      this.callbacks.onErroneousDisconnect?.(message);
    });

    this.wws.onWsOpen(() => {
      // flush if any messages in queue for it
      console.log(`${this.name}: Connection established after ${this.reconnectionAttempts} tries`);
      this.reconnectionAttempts = 0;

      // call post-connect method, this may give previously acked messages
      const readyIdx = this.callbacks.onConnect?.() || 0;

      // send back readiness ack
      this.wws.send({
        headers: {
          type: 'ready',
          readyIdx,
        },
      } as ReadyQwsMessage);
    });

    this.wws.onReady((message: ReadyQwsMessage) => {
      // ready to send messages from given message index
      const { readyIdx } = message.headers;
      console.log(`${this.name}: Socket ready to send from chunk ${readyIdx}`);
      // move queue cursors appropriately
      this.queue.acknowledge(readyIdx - 1);
      this.queue.revert(readyIdx);
      this.ready = true;
      // flush messages
      this.flush();
    });

    this.wws.onBin((message: BinaryQwsMessage) => {
      // received binary message
      const { headers, body } = message;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, idx, ...extraHeaders } = headers;

      // check callback
      this.callbacks.onBin?.(body, extraHeaders);

      // send back acknowledgment
      this.wws.send({
        headers: {
          type: 'ack',
          ackIdx: idx,
        },
      } as AckQwsMessage);
    });

    this.wws.onJson((message: JsonQwsMessage) => {
      // received binary message
      const { headers, body } = message;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, idx, ...extraHeaders } = headers;

      // check callback
      this.callbacks.onJson?.(body, extraHeaders);

      // send back acknowledgment
      this.wws.send({
        headers: {
          type: 'ack',
          ackIdx: idx,
        },
      } as AckQwsMessage);
    });

    this.wws.onAck((message: AckQwsMessage) => {
      // acknowledgment received
      this.queue.acknowledge(message.headers.ackIdx);
      if (!this.queue.numUnackMessages && !this.needed) {
        this.wws.close();
      }
    });

    this.wws.onErr((message: ErrorQwsMessage) => {
      // handle error
      console.error(`${this.name}: Error occurred: ${message.headers.error}`);
      this.callbacks.onError?.(message.headers.error);
    });

    this.wws.onWsClose(() => {
      // if locally closed, needed should be false
      // if it's true, it means we lost the connection and should try to re-connect
      const { wsReconnectIntervalMillis } = this.options;
      if (this.needed) {
        console.log(`${this.name}: Closed pre-maturely, trying to reconnect after ${wsReconnectIntervalMillis}ms...`);
        setTimeout(() => this.connect(), wsReconnectIntervalMillis);
        this.callbacks.onErroneousDisconnect?.('Closed pre-maturely');
      } else if (this.queue.numUnackMessages) {
        console.log(`${this.name}: Closed with messages still in queue, reconnecting in ${wsReconnectIntervalMillis}ms...`);
        setTimeout(() => this.connect(), wsReconnectIntervalMillis);
        this.callbacks.onErroneousDisconnect?.('Closed with messages still in queue');
      } else {
        console.log(`${this.name}: Closed correctly`);
        this.callbacks.onClose?.();
      }
    });
  }

  flush(): void {
    // connection is not open
    if (this.wws.readyState !== WebSocket.OPEN || !this.ready) {
      return;
    }

    // there is at least one message
    if (this.queue.numUnsentMessages) {
      // pop a message
      const [idx, data] = this.queue.consume();
      console.log(`${this.name}: Sending chunk ${idx} of size ${data.length}`);
      this.wws.sendRaw(data);
      console.debug(`${this.name}: MQ decreased to size ${this.queue.numUnsentMessages} messages / ${this.queue.numUnsentBytes} bytes`);
      this.flush();
    } else {
      console.debug(`${this.name}: Flushing complete, no ws messages backed up`);
      // if not needed anymore after flush, close it
      // send close event to ws, don't de-cache yet, wait for event
      if (!this.queue.numUnackMessages && !this.needed) {
        this.wws.close();
      }
    }
  }

  send(body: Binary | Record<string, unknown>, extraHeaders: QwsMessageExtraHeaders = {}): number {
    // encode into payload message based on body type
    let message: PayloadQwsMessage;

    if (body instanceof Buffer) {
      message = {
        headers: {
          type: 'bin',
          ...extraHeaders,
        },
        body,
      } as BinaryQwsMessage;
    } else {
      message = {
        headers: {
          type: 'json',
          ...extraHeaders,
        },
        body,
      } as JsonQwsMessage;
    }

    // add message to fifo queue
    const { numUnsentMessages } = this.queue;
    const idx = this.queue.produce(message);

    // ready state should either be CONNECTING or OPEN at this point to flush instantly
    if (this.wws.readyState === WebSocket.OPEN && this.ready && !numUnsentMessages) {
      this.flush();
    }

    return idx;
  }

  close(): void {
    // flush if any messages in queue
    this.needed = false;
    this.flush();
  }
}
