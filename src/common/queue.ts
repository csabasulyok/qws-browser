import { PayloadWsqMessage } from './message';
import { serializeMessage } from '../browser/messageencode';

/**
 * FIFO data structure implementation for outgoing wsq messages
 * Implements acknowledgment system, so no messages are deleted until acknowledged,
 * but new messages may be added while waiting for ack.
 */
export default class WsqMessageQueue {
  messages: Record<number, Blob>;
  readIdx: number;
  ackIdx: number;
  writeIdx: number;

  numUnsentMessages: number;
  numUnsentBytes: number;
  numUnackMessages: number;
  numUnackBytes: number;

  constructor() {
    this.messages = {};
    this.readIdx = 0;
    this.ackIdx = 0;
    this.writeIdx = 0;

    this.numUnsentMessages = 0;
    this.numUnsentBytes = 0;
    this.numUnackMessages = 0;
    this.numUnackBytes = 0;
  }

  /**
   * Push message to write end of queue
   */
  produce(message: PayloadWsqMessage): number {
    const idx = this.writeIdx;
    message.headers.idx = idx;
    const data = serializeMessage(message);
    this.messages[idx] = data;

    this.numUnsentMessages += 1;
    this.numUnsentBytes += data.size;
    this.numUnackMessages += 1;
    this.numUnackBytes += data.size;

    this.writeIdx += 1;
    return idx;
  }

  /**
   * Pop message from read end of queue.
   * Returns idx of message, along with its content.
   */
  consume(): [number, Blob] {
    const idx = this.readIdx;
    const ret = this.messages[idx];

    this.numUnsentMessages -= 1;
    this.numUnsentBytes -= ret.size;
    this.readIdx += 1;
    return [idx, ret];
  }

  /**
   * When ack is received, we can forget messages up to that point
   */
  acknowledge(idx: number): void {
    while (this.ackIdx <= idx) {
      this.numUnackMessages -= 1;
      this.numUnackBytes -= this.messages[this.ackIdx].size;
      delete this.messages[this.ackIdx];
      this.ackIdx += 1;
    }
  }

  /**
   * When ack fails, we must revert to a previous point
   */
  revert(idx: number): void {
    while (this.readIdx > idx) {
      this.readIdx -= 1;
      this.numUnsentMessages += 1;
      this.numUnsentBytes += this.messages[this.readIdx].size;
    }
  }
}
