/**
 * Custom message format for WSQ messages:
 * - first 4 bytes:   uint32 saying how long the header information is
 * - next n bytes:    base64(json)-encoded headers
 * - remaining bytes: actual body - could be binary or base64(json), denoted in headers
 */

/**
 * Denotes message type, must be included in header.
 * 'bin' - payload message with binary body
 * 'json' - payload message with JSON body
 * 'ready' - ready message sent after connection and setup
 * 'ack' - acknowledgment message for a payload message received from other side
 * 'err' - error
 */
export type WsqMessageType = 'bin' | 'json' | 'ready' | 'ack' | 'err';

/**
 * Headers are sent in base64(json) format.
 */
export type WsqMessageExtraHeaders = {
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
export type BinaryWsqMessage = {
  headers: WsqMessageExtraHeaders & {
    type: 'bin';

    /**
     * Message index in order. Helps in acknowledgments
     */
    idx: number;
  };

  body: Blob;
};

/**
 * JSON payload message
 * Contain base64-JSON encoded data
 */
export type JsonWsqMessage = {
  headers: WsqMessageExtraHeaders & {
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
 */
export type ReadyWsqMessage = {
  headers: WsqMessageExtraHeaders & {
    type: 'ready';
  };
};

/**
 * Acknowledgment message
 * Sent back for every payload message
 */
export type AckWsqMessage = {
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
export type ErrorWsqMessage = {
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
export type PayloadWsqMessage = BinaryWsqMessage | JsonWsqMessage;
export type WsqMessage = BinaryWsqMessage | JsonWsqMessage | AckWsqMessage | ErrorWsqMessage;
