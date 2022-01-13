export type WebSocketMessageHeaders = {
  [key: string]: unknown;
};

/**
 * Custom message format for nrand WS messages:
 * - first 4 bytes:   uint32 saying how long the header information is
 * - next n bytes:    base64(json)-encoded headers
 * - remaining bytes: actual body
 */
export default class WebSocketMessage {
  headers: WebSocketMessageHeaders;
  body: Buffer;

  constructor(headers: WebSocketMessageHeaders, body?: Buffer) {
    this.headers = headers || {};
    this.body = body;
  }

  static fromBuffer(buffer: Buffer): WebSocketMessage {
    if (buffer.length < 4) {
      console.error('Invalid buffer size');
      return new WebSocketMessage({}, buffer);
    }

    // take first 4 bytes from header, check if not a too large size
    const headersSize = buffer.readUInt32LE();
    if (headersSize > buffer.length - 4) {
      console.error(`Invalid header size ${headersSize} > ${buffer.length - 4}`);
      return new WebSocketMessage({}, buffer);
    }

    try {
      // decode base64-JSON
      const headersEncoded = buffer.slice(4, headersSize + 4).toString();
      const headersJson = Buffer.from(headersEncoded, 'base64').toString();
      const headers = JSON.parse(headersJson);

      // remaning bytes are body
      const body = buffer.slice(headersSize + 4);
      return new WebSocketMessage(headers, body);
    } catch (ex) {
      console.error(`Could not decode message: ${ex}`);
      console.error(ex);
      return new WebSocketMessage({}, buffer);
    }
  }

  toBuffer(): Buffer {
    const headersJson = JSON.stringify(this.headers);
    const headersEncoded = Buffer.from(headersJson).toString('base64');

    const finalLength = this.body ? 4 + headersEncoded.length + this.body.length : 4 + headersEncoded.length;
    const ret = Buffer.alloc(finalLength);
    ret.writeUInt32LE(headersEncoded.length);
    ret.write(headersEncoded, 4);
    if (this.body) {
      this.body.copy(ret, 4 + headersEncoded.length, 0, this.body.length);
    }
    return ret;
  }
}
