import QWebSocket from '../src';

const qws = new QWebSocket('ws://localhost:3000/mypath', {
  reconnectNumTries: 2,
  reconnectIntervalMillis: 2000,
});

const interval = setInterval(() => {
  console.log('Sending some messages...');
  // send string
  qws.send({ message: 'Hello World' });
  // send binary
  qws.send(Buffer.from('1234567890-1234567890'));
  // add aux header to binary data
  qws.send(Buffer.from('1234567890-1234567890'), {
    extraHeaderKey: 'extraHeaderValue',
  });
}, 5000);

qws.onError((message: string) => {
  console.error('Error, disconnecting:', message);
  process.exit(1);
});

qws.onClose(() => {
  console.log('WS closed');
  clearInterval(interval);
});
