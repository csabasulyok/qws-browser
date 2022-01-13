import { BinaryQwsMessage, deserializeMessage, JsonQwsMessage, serializeMessage } from '../src';

(async () => {
  const jsonMessage: JsonQwsMessage = {
    headers: {
      type: 'json',
      idx: 42,
    },
    body: {
      key1: 'value1',
      key2: 42,
    },
  };

  const binMessage: BinaryQwsMessage = {
    headers: {
      type: 'bin',
      idx: 42,
    },
    body: Buffer.from('Hello World!'),
  };

  // JSON in
  const jsonMessageBuffer = serializeMessage(jsonMessage);
  console.log(`JSON message serialized (${jsonMessageBuffer.length} bytes)`, jsonMessageBuffer);

  // JSON out
  const jsonMessageOut = (await deserializeMessage(jsonMessageBuffer)) as JsonQwsMessage;
  console.log('JSON message', jsonMessageOut.headers, jsonMessageOut.body);

  // Buffer in
  const binMessageBuffer = serializeMessage(binMessage);
  console.log(`Binary message serialized (${binMessageBuffer.length} bytes)`, binMessageBuffer);

  // Buffer out
  const binMessageOut = (await deserializeMessage(binMessageBuffer)) as BinaryQwsMessage;
  console.log('Binary message', binMessageOut.headers, binMessageOut.body.toString());
})();
