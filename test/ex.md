# Either

## Send single message

```ts
import QWebSocket from 'wsq';

const wsq = new QWebSocket('ws://localhost:12345');
wsq.send('Hello World');
wsq.close();
```

## Broadcast towards server

```ts
import QWebSocket from 'wsq';

const wsq = new QWebSocket('ws://localhost:12345');

const interval = setInterval(() => {
  // send string
  wsq.send('Hello World');
  // send binary
  wsq.send(new Blob(['1234567890-1234567890']));
  // add aux header to binary data
  wsq.send(new Blob(['1234567890-1234567890']), {
    extraHeaderKey: 'extraHeaderValue',
  });
}, 5000);

wsq.onErr((err: string) => {
  console.error(err);
});

wsq.onClose(() => {
  clearInterval(interval);
});
```

## Listen for messages

```ts
import QWebSocket, { BinaryWsqMessageHeaders, JsonWsqMessageHeaders } from 'wsq';

const wsq = new QWebSocket('ws://localhost:12345');

wsq.onBin((message: Blob, headers: BinaryWsqMessageHeaders) => {
  console.log(`Received ${message}`);
});

wsq.onJson<DataClass>((data: DataClass, headers: JsonWsqMessageHeaders) => {
  console.log('Received', data);
});
```

# Server w/ express-ws

## Listen

```ts
import express from 'express';
import QWebSocket, { expressWsq } from 'wsq';

const app = expressWsq(express());

app.use((req, res, next) => {
  console.log('Connect middleware');
});

app.wsq('/somepath', (wsq: QWebSocket) => {
  wsq.onJson<DataClass>((data: DataClass, headers: JsonWsqMessageHeaders) => {
    console.log('Received', data);
  });
});

app.listen(3000, () => console.log('Server listening on port 3000'));
```

## Broadcast

```ts
import express from 'express';
import QWebSocket, { expressWsq } from 'wsq';

const app = expressWsq(express());

app.use((req, res, next) => {
  console.log('Connect middleware');
});

app.wsq('/somepath', (wsq: QWebSocket) => {
  const interval = setInterval(() => {
    wsq.send('Hello World');
  }, 5000);

  wsq.onClose(() => {
    clearInterval(interval);
  });
});

app.listen(3000, () => console.log('Server listening on port 3000'));
```
