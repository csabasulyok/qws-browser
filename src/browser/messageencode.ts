import logger from '../common/logger.js';
import { QwsMessage, BinaryQwsMessage, JsonQwsMessage } from '../common/message.js';

/**
 * Converts generic object into base64-encoded JSON.
 * Used in headers and optionally JSON-style body.
 */
function objectToJsonBinary(object: Record<string, unknown>): string {
  const objectJson = JSON.stringify(object);
  // base64 of the UTF-8 bytes, same as Buffer.from(json).toString('base64') on Node.js
  const bytes = new TextEncoder().encode(objectJson);
  return btoa(Array.from(bytes, (byte) => String.fromCodePoint(byte)).join(''));
}

/**
 * Deserializes base64-json buffers
 * Used in headers and optionally JSON-style body.
 */
async function jsonBinaryToObject(jsonBinary: Blob): Promise<Record<string, unknown>> {
  const jsonBinaryText = await jsonBinary.text();
  const bytes = Uint8Array.from(atob(jsonBinaryText), (char) => char.codePointAt(0)!);
  const objectJson = new TextDecoder().decode(bytes);
  return JSON.parse(objectJson) as Record<string, unknown>;
}

/**
 * Convert binary data received through underlying WS into WSQ message
 * Changes type based on type header
 */
export async function deserializeMessage(blob: Blob): Promise<QwsMessage> {
  if (blob.size < 4) {
    logger.error('Invalid blob size');
    return {
      headers: { type: 'bin' },
      body: blob,
    };
  }

  // take first 4 bytes from header, check if not a too large size
  const headersSizeBlob = await blob.slice(0, 4).arrayBuffer();
  const headersSizeArray = new Uint32Array(headersSizeBlob);
  const headersSize = headersSizeArray[0];
  if (headersSize > blob.size - 4) {
    logger.error(`Invalid header size ${headersSize} > ${blob.size - 4}`);
    return {
      headers: { type: 'bin' },
      body: blob,
    };
  }

  try {
    // decode base64-JSON header
    const headers = await jsonBinaryToObject(blob.slice(4, headersSize + 4));
    const bodyBlob = blob.slice(headersSize + 4);
    const type = headers.type || 'bin';

    // body is either JSON Blob, original binary data or nothing
    let body: Blob | Record<string, unknown> | undefined;
    switch (type) {
      case 'bin': {
        body = bodyBlob;
        break;
      }
      case 'json': {
        body = await jsonBinaryToObject(bodyBlob);
        break;
      }
      default:
    }

    return { headers, body } as QwsMessage;
  } catch (error) {
    logger.error('Could not decode message', error);
    return {
      headers: { type: 'bin' },
      body: blob,
    };
  }
}

/**
 * Converts WSQ message into Blob to be sent through underlying WebSocket
 */
export function serializeMessage(message: QwsMessage): Blob {
  // headers encoded into base64(json)
  const headersEncoded = objectToJsonBinary(message.headers);
  const headersSize = Uint32Array.from([headersEncoded.length]);

  // body is either JSON Blob, original binary data or nothing
  let bodyEncoded: Blob | string | undefined;
  switch (message.headers.type) {
    case 'bin': {
      bodyEncoded = (message as BinaryQwsMessage).body;
      break;
    }
    case 'json': {
      bodyEncoded = objectToJsonBinary((message as JsonQwsMessage).body);
      break;
    }
    case 'ready':
    case 'ack':
    case 'err': {
      // no body
      break;
    }
  }

  return new Blob(
    [
      headersSize, // first 4 bytes = uint32 how long is header section
      headersEncoded, // headers in base64(json) format
      ...(bodyEncoded === undefined ? [] : [bodyEncoded]), // binary, json or no body
    ],
    { type: 'application/octet-stream' },
  );
}
