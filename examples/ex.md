# Either

## Send single message

```ts
import QWebSocket from 'qws';

const qws = new QWebSocket('ws://localhost:12345');
qws.send('Hello World');
qws.close();
```

## Broadcast towards server

```ts
import QWebSocket from 'qws';

const qws = new QWebSocket('ws://localhost:12345');

const interval = setInterval(() => {
  // send string
  qws.send('Hello World');
  // send binary
  qws.send(new Blob(['1234567890-1234567890']));
  // add aux header to binary data
  qws.send(new Blob(['1234567890-1234567890']), {
    extraHeaderKey: 'extraHeaderValue',
  });
}, 5000);

qws.onErr((err: string) => {
  console.error(err);
});

qws.onClose(() => {
  clearInterval(interval);
});
```

## Listen for messages

```ts
import QWebSocket, { BinaryQwsMessageHeaders, JsonQwsMessageHeaders } from 'qws';

const qws = new QWebSocket('ws://localhost:12345');

qws.onBin((message: Blob, headers: BinaryQwsMessageHeaders) => {
  console.log(`Received ${message}`);
});

qws.onJson<DataClass>((data: DataClass, headers: JsonQwsMessageHeaders) => {
  console.log('Received', data);
});
```

# Server w/ express-ws

## Listen

```ts
import express from 'express';
import QWebSocket, { expressQws } from 'qws';

const app = expressQws(express());

app.use((req, res, next) => {
  console.log('Connect middleware');
});

app.qws('/somepath', (qws: QWebSocket) => {
  qws.onJson<DataClass>((data: DataClass, headers: JsonQwsMessageHeaders) => {
    console.log('Received', data);
  });
});

app.listen(3000, () => console.log('Server listening on port 3000'));
```

## Broadcast

```ts
import express from 'express';
import QWebSocket, { expressQws } from 'qws';

const app = expressQws(express());

app.use((req, res, next) => {
  console.log('Connect middleware');
});

app.qws('/somepath', (qws: QWebSocket) => {
  const interval = setInterval(() => {
    qws.send('Hello World');
  }, 5000);

  qws.onClose(() => {
    clearInterval(interval);
  });
});

app.listen(3000, () => console.log('Server listening on port 3000'));
```
