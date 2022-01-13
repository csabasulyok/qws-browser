import express from 'express';
import QWebSocket, { expressQws } from '../src';

const app = expressQws(express());

app.use((_req, _res, next) => {
  console.log('Connect middleware');
  next();
});

app.qws('/', (qws: QWebSocket) => {
  qws.onJson((data: Record<string, unknown>, headers: Record<string, unknown>) => {
    console.log(`> JSON ${headers} ${data}`);
  });
});

app.listen(3000, () => console.log('Server listening on port 3000'));
