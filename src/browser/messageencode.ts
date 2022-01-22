import logger from '../common/logger';
import { QwsMessage, BinaryQwsMessage, JsonQwsMessage } from '../common/message';

/**
 * Converts generic object into base64-encoded JSON.
 * Used in headers and optionally JSON-style body.
 */
function objectToJsonBinary(object: Record<string, unknown>): string {
  const objectJson = JSON.stringify(object);
  return btoa(unescape(encodeURIComponent(objectJson)));
}

/**
 * Deserializes base64-json buffers
 * Used in headers and optionally JSON-style body.
 */
async function jsonBinaryToObject(jsonBinary: Blob): Promise<Record<string, unknown>> {
  const jsonBinaryText = await jsonBinary.text();
  const objectJson = decodeURIComponent(escape(atob(jsonBinaryText)));
  return JSON.parse(objectJson);
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
    } as BinaryQwsMessage;
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
    } as BinaryQwsMessage;
  }

  try {
    // decode base64-JSON header
    const headers = await jsonBinaryToObject(blob.slice(4, headersSize + 4));
    const bodyBlob = blob.slice(headersSize + 4);
    const type = headers.type || 'bin';

    // body is either JSON Blob, original binary data or nothing
    let body: Blob | Record<string, unknown>;
    switch (type) {
      case 'bin':
        body = bodyBlob;
        break;
      case 'json':
        body = await jsonBinaryToObject(bodyBlob);
        break;
      default:
    }

    return { headers, body } as QwsMessage;
  } catch (ex) {
    logger.error('Could not decode message', ex);
    return {
      headers: { type: 'bin' },
      body: blob,
    } as BinaryQwsMessage;
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
  let bodyEncoded: Blob | string;
  switch (message.headers.type) {
    case 'bin':
      bodyEncoded = (message as BinaryQwsMessage).body;
      break;
    case 'json':
      bodyEncoded = objectToJsonBinary((message as JsonQwsMessage).body);
      break;
    default:
  }

  return new Blob(
    [
      headersSize, // first 4 bytes = uint32 how long is header section
      headersEncoded, // headers in base64(json) format
      bodyEncoded, // binary, json or null body
    ],
    { type: 'application/octet-stream' },
  );
}
