import { WsqMessage, BinaryWsqMessage, JsonWsqMessage } from '../common/message';

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
async function jsonBinaryToObject(jsonBlob: Buffer): Record<string, unknown> {
  const objectJson = Buffer.from(jsonBlob.toString(), 'base64').toString();
  return JSON.parse(objectJson);
}

/**
 * Convert blob received through underlying WS into WSQ message
 * Changes type based on type header
 */
export async function deserializeMessage(buffer: Buffer): Promise<WsqMessage> {
  if (buffer.length < 4) {
    console.error('Invalid buffer size');
    return {
      headers: { type: 'bin' },
      body: buffer,
    } as BinaryWsqMessage;
  }

  // take first 4 bytes from header, check if not a too large size
  const headersSize = buffer.readUInt32LE();
  if (headersSize > buffer.length - 4) {
    console.error(`Invalid header size ${headersSize} > ${buffer.length - 4}`);
    return {
      headers: { type: 'bin' },
      body: buffer,
    } as BinaryWsqMessage;
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

    return { headers, body } as WsqMessage;
  } catch (ex) {
    console.error(`Could not decode message: ${ex}`);
    console.error(ex);
    return {
      headers: { type: 'bin' },
      body: buffer,
    } as BinaryWsqMessage;
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

    return { headers, body } as WsqMessage;
  } catch (ex) {
    console.error('Could not decode message', ex);
    return {
      headers: { type: 'bin' },
      body: blob,
    } as BinaryWsqMessage;
  }
}

/**
 * Converts WSQ message into Blob to be sent through underlying WebSocket
 */
export function serializeMessage(message: WsqMessage): Buffer {
  // headers encoded into base64(json)
  const headersEncoded = objectToJsonBinary(message.headers);

  // body is either JSON Blob, original binary data or nothing
  let finalLength: number = 4 + headersEncoded.length;
  let bodyEncoded;

  switch (message.headers.type) {
    case 'bin':
      bodyEncoded = (message as BinaryWsqMessage).body;
      finalLength += bodyEncoded.length;
      break;
    case 'json':
      bodyEncoded = objectToJsonBinary((message as JsonWsqMessage).body);
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
