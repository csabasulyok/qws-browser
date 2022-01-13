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
export type BinaryQwsMessage = {
  headers: QwsMessageExtraHeaders & {
    type: 'bin';

    /**
     * Message index in order. Helps in acknowledgments
     */
    idx?: number;
  };

  body: Binary;
};

/**
 * JSON payload message
 * Contain base64-JSON encoded data
 */
export type JsonQwsMessage = {
  headers: QwsMessageExtraHeaders & {
    type: 'json';

    /**
     * Message index in order. Helps in acknowledgments
     */
    idx: number;
  };

  body: Record<string, unknown>;
};

/**
 * Ready message
 * Sent back after successful connect, signalling we are ready to receive events
 * Optionally contains a message index denoting how many messages we already have received previously
 */
export type ReadyQwsMessage = {
  headers: QwsMessageExtraHeaders & {
    type: 'ready';

    /**
     * Message index we have already received previously that may be omitted.
     */
    readyIdx: number;
  };
};

/**
 * Acknowledgment message
 * Sent back for every payload message
 */
export type AckQwsMessage = {
  headers: {
    type: 'ack';

    /**
     * Message index from other side we are acknowledging
     */
    ackIdx: number;
  };
};

/**
 * Error message
 * Sent back if processing a message is unsuccessful
 */
export type ErrorQwsMessage = {
  headers: {
    type: 'err';

    /**
     * Message of error
     */
    error: string;
  };
};

/**
 * Common names for WSQ message
 */
export type PayloadQwsMessage = BinaryQwsMessage | JsonQwsMessage;
export type QwsMessage = BinaryQwsMessage | JsonQwsMessage | ReadyQwsMessage | AckQwsMessage | ErrorQwsMessage;
