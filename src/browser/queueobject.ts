import autoBind from 'auto-bind';
import {
  AckWsqMessage,
  BinaryWsqMessage,
  ErrorWsqMessage,
  JsonWsqMessage,
  PayloadWsqMessage,
  ReadyWsqMessage,
  WsqMessageExtraHeaders,
} from '../common/message';
import WebSocketMessageQueue from '../common/queue';
import WrappedWebSocket from './wrappedws';

type QWebSocketOptions = {
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
  url: string;
  name: string;
  options: QWebSocketOptions;

  queue: WebSocketMessageQueue;
  reconnectionAttempts: number;
  needed: boolean;
  wws: WrappedWebSocket;
  ready: boolean;

  callbacks: {
    onConnect: () => void;
    onBin: (body: Blob, extraHeaders: WsqMessageExtraHeaders) => void;
    onJson: (body: Record<string, unknown>, extraHeaders: WsqMessageExtraHeaders) => void;
    onErroneousDisconnect: () => void;
    onError: (message: string) => void;
    onFinish: () => void;
  };

  constructor(url: string, options: QWebSocketOptions = {}) {
    this.name = url.split('\\').pop().split('/').pop();
    this.options = {
      ...defaultOpts,
      ...options,
    };

    this.queue = new WebSocketMessageQueue();
    this.reconnectionAttempts = 0;
    this.needed = true;
    this.wws = null;
    this.ready = false;

    autoBind(this);
  }

  /**
   * Public callback assignments for client
   */

  onConnect(callback: () => void): void {
    this.callbacks.onConnect = callback;
  }

  onBin(callback: (body: Blob, extraHeaders: WsqMessageExtraHeaders) => void): void {
    this.callbacks.onBin = callback;
  }

  onJson(callback: (body: Record<string, unknown>, extraHeaders: WsqMessageExtraHeaders) => void): void {
    this.callbacks.onJson = callback;
  }

  onErroneousDisconnect(callback: () => void): void {
    this.callbacks.onErroneousDisconnect = callback;
  }

  onError(callback: (message: string) => void): void {
    this.callbacks.onError = callback;
  }

  onFinish(callback: () => void): void {
    this.callbacks.onFinish = callback;
  }

  /**
   * Main logic
   */

  connect(): void {
    if (this.wws && this.wws.readyState <= 1) {
      return;
    }

    this.reconnectionAttempts += 1;

    // timeout for too many reconnection attempts
    if (this.reconnectionAttempts > this.options.wsReconnectNumTries) {
      console.error(`${this.name}: Connection timed out, should re-connect entirely`);
      this.callbacks.onError?.(`${this.name}: WS connection timeout, max tries exceeded`);
      return;
    }

    /**
     * Actual WebSocket opening
     */
    this.wws = new WrappedWebSocket(this.url, {
      ...this.options.extraConnectArgs,
      idx: this.queue.ackIdx,
    });

    this.wws.onWsError((event) => {
      // ws error will prompt reconnection which can time out, don't reject instantly
      console.error(`${this.name}: Error occurred`, event);
      this.callbacks.onErroneousDisconnect?.();
    });

    this.wws.onWsOpen(() => {
      // flush if any messages in queue for it
      console.log(`${this.name}: Connection established after ${this.reconnectionAttempts} tries`);
      this.reconnectionAttempts = 0;
      this.callbacks.onConnect?.();
    });

    this.wws.onReady((message: ReadyWsqMessage) => {
      // ready to send messages from given chunkIdx
      const chunkIdx = Number(message.headers.ready);
      console.log(`${this.name}: Socket ready to send from chunk ${chunkIdx}`);
      this.queue.acknowledge(chunkIdx - 1);
      this.queue.revert(chunkIdx);
      this.ready = true;
      this.flush();
    });

    this.wws.onBin((message: BinaryWsqMessage) => {
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
      } as AckWsqMessage);
    });

    this.wws.onJson((message: JsonWsqMessage) => {
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
      } as AckWsqMessage);
    });

    this.wws.onAck((message: AckWsqMessage) => {
      // acknowledgment received
      this.queue.acknowledge(message.headers.ackIdx);
      if (!this.queue.numUnackMessages && !this.needed) {
        this.wws.close();
      }
    });

    this.wws.onErr((message: ErrorWsqMessage) => {
      // handle error
      console.error(`${this.name}: Error occurred: ${message.headers.error}`);
      this.callbacks.onError?.(`Video storage error: ${message.headers.error}`);
    });

    this.wws.onWsClose(() => {
      // if locally closed, needed should be false
      // if it's true, it means we lost the connection and should try to re-connect
      if (this.needed) {
        console.log(`${this.name}: Closed pre-maturely, trying to reconnect after timeout...`);
        setTimeout(() => this.connect(), this.options.wsReconnectIntervalMillis);
        this.callbacks.onErroneousDisconnect?.();
      } else if (this.queue.numUnackMessages) {
        console.log(`${this.name}: Could be closed, but there are still messages in queue, reconnecting...`);
        setTimeout(() => this.connect(), this.options.wsReconnectIntervalMillis);
        this.callbacks.onErroneousDisconnect?.();
      } else {
        console.log(`${this.name}: Closed correctly`);
        this.callbacks.onFinish?.();
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
      console.log(`${this.name}: Sending chunk ${idx} of size ${data.size}`);
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

  send(body: Blob | Record<string, unknown>, extraHeaders: WsqMessageExtraHeaders = {}): number {
    // encode into payload message based on body type
    let message: PayloadWsqMessage;

    if (body instanceof Blob) {
      message = {
        headers: {
          type: 'bin',
          ...extraHeaders,
        },
        body,
      } as BinaryWsqMessage;
    } else {
      message = {
        headers: {
          type: 'json',
          ...extraHeaders,
        },
        body,
      } as JsonWsqMessage;
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
