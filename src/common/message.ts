/**
 * Custom message format for WSQ messages:
 * - first 4 bytes:   uint32 saying how long the header information is
 * - next n bytes:    base64(json)-encoded headers
 * - remaining bytes: actual body - could be binary or base64(json), denoted in headers
 */

import { Binary } from './discriminator';

/**
 * Denotes message type, must be included in header.
 * 'bin' - payload message with binary body
 * 'json' - payload message with JSON body
 * 'ready' - ready message sent after connection and setup
 * 'ack' - acknowledgment message for a payload message received from other side
 * 'err' - error
 */
export type QwsMessageType = 'bin' | 'json' | 'ready' | 'ack' | 'err';

/**
 * Headers are sent in base64(json) format.
 */
export type QwsMessageExtraHeaders = {
  /**
   * Other X-headers
   */
  [key: string]: unknown;
};

/**
 * Message types
 */

/**
 * Binary payload messages
 * Contain binary body (like video data)
 */
export type BinaryQwsMessageHeaders = QwsMessageExtraHeaders & {
  type: 'bin';
  /**
   * Message index in order. Helps in acknowledgments
   */
  idx?: number;
  /**
   * Routing key for message
   */
  route?: string;
};

export type BinaryQwsMessage = {
  headers: BinaryQwsMessageHeaders;
  body: Binary;
};

/**
 * JSON payload message
 * Contain base64-JSON encoded data
 */

export type JsonQwsMessageHeaders = QwsMessageExtraHeaders & {
  type: 'json';
  /**
   * Message index in order. Helps in acknowledgments
   */
  idx: number;
  /**
   * Routing key for message
   */
  route?: string;
};

export type JsonQwsMessage = {
  headers: JsonQwsMessageHeaders;
  body: Record<string, unknown>;
};

/**
 * Ready message
 * Sent back after successful connect, signalling we are ready to receive events
 * Optionally contains a message index denoting how many messages we already have received previously
 */

export type ReadyQwsMessageHeaders = QwsMessageExtraHeaders & {
  type: 'ready';

  /**
   * Message index we have already received previously that may be omitted.
   */
  readyIdx: number;
};

export type ReadyQwsMessage = {
  headers: ReadyQwsMessageHeaders;
};

/**
 * Acknowledgment message
 * Sent back for every payload message
 */

export type AckQwsMessageHeaders = {
  type: 'ack';

  /**
   * Message index from other side we are acknowledging
   */
  ackIdx: number;
};

export type AckQwsMessage = {
  headers: AckQwsMessageHeaders;
};

/**
 * Error message
 * Sent back if processing a message is unsuccessful
 */

export type ErrorQwsMessageHeaders = {
  type: 'err';

  /**
   * Message of error
   */
  error: string;
};

export type ErrorQwsMessage = {
  headers: ErrorQwsMessageHeaders;
};

/**
 * Common names for WSQ message
 */
export type PayloadQwsMessage = BinaryQwsMessage | JsonQwsMessage;
export type QwsMessage = BinaryQwsMessage | JsonQwsMessage | ReadyQwsMessage | AckQwsMessage | ErrorQwsMessage;
export type QwsMessageHeader =
  | BinaryQwsMessageHeaders
  | JsonQwsMessageHeaders
  | ReadyQwsMessageHeaders
  | AckQwsMessageHeaders
  | ErrorQwsMessageHeaders;
