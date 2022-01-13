import { QwsMessage, BinaryQwsMessage, JsonQwsMessage } from '../common/message';

/**
 * Converts generic object into base64-encoded JSON.
 * Used in headers and optionally JSON-style body.
 */
function objectToJsonBinary(object: Record<string, unknown>): string {
  const objectJson = JSON.stringify(object);
  return Buffer.from(objectJson).toString('base64');
}

/**
 * Deserializes base64-json buffers
 * Used in headers and optionally JSON-style body.
 */
function jsonBinaryToObject(jsonBinary: Buffer): Record<string, unknown> {
  const objectJson = Buffer.from(jsonBinary.toString(), 'base64').toString();
  return JSON.parse(objectJson);
}

/**
 * Convert blob received through underlying WS into WSQ message
 * Changes type based on type header
 */
export async function deserializeMessage(buffer: Buffer): Promise<QwsMessage> {
  if (buffer.length < 4) {
    console.error('Invalid buffer size');
    return {
      headers: { type: 'bin' },
      body: buffer,
    } as BinaryQwsMessage;
  }

  // take first 4 bytes from header, check if not a too large size
  const headersSize = buffer.readUInt32LE();
  if (headersSize > buffer.length - 4) {
    console.error(`Invalid header size ${headersSize} > ${buffer.length - 4}`);
    return {
      headers: { type: 'bin' },
      body: buffer,
    } as BinaryQwsMessage;
  }

  try {
    // decode base64-JSON
    const headers = jsonBinaryToObject(buffer.slice(4, headersSize + 4));

    // remaning bytes are body
    const bodyBlob = buffer.slice(headersSize + 4);
    let body: Buffer | Record<string, unknown>;
    const type = headers.type || 'bin';

    switch (type) {
      case 'bin':
        body = bodyBlob;
        break;
      case 'json':
        body = jsonBinaryToObject(bodyBlob);
        break;
      default:
    }

    return { headers, body } as QwsMessage;
  } catch (ex) {
    console.error(`Could not decode message: ${ex}`);
    console.error(ex);
    return {
      headers: { type: 'bin' },
      body: buffer,
    } as BinaryQwsMessage;
  }
}

/**
 * Converts WSQ message into Blob to be sent through underlying WebSocket
 */
export function serializeMessage(message: QwsMessage): Buffer {
  // headers encoded into base64(json)
  const headersEncoded = objectToJsonBinary(message.headers);

  // body is either JSON Blob, original binary data or nothing
  let finalLength: number = 4 + headersEncoded.length;
  let bodyEncoded;

  switch (message.headers.type) {
    case 'bin':
      bodyEncoded = (message as BinaryQwsMessage).body;
      finalLength += bodyEncoded.length;
      break;
    case 'json':
      bodyEncoded = objectToJsonBinary((message as JsonQwsMessage).body);
      finalLength += bodyEncoded.length;
      break;
    default:
  }

  const ret = Buffer.alloc(finalLength);
  ret.writeUInt32LE(headersEncoded.length);
  ret.write(headersEncoded, 4);

  switch (message.headers.type) {
    case 'bin':
      bodyEncoded.copy(ret, 4 + headersEncoded.length, 0, bodyEncoded.length);
      break;
    case 'json':
      ret.write(bodyEncoded, 4);
      break;
    default:
  }

  return ret;
}
