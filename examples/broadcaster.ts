import QWebSocket from '../src';

const qws = new QWebSocket('ws://localhost:3000/');

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

qws.onError((err: string) => {
  console.error(err);
});

qws.onClose(() => {
  console.log('WS closed');
  clearInterval(interval);
});
