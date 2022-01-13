import QWebSocket from '../src';

const qws = new QWebSocket('ws://localhost:12345');

qws.onBin((data: Buffer, headers: Record<string, unknown>) => {
  console.log(`> BIN ${headers} ${data.toString()}`);
});

qws.onJson((data: Record<string, unknown>, headers: Record<string, unknown>) => {
  console.log(`> JSON ${headers} ${data}`);
});
