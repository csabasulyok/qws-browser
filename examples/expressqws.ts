import express from 'express';
import QWebSocket, { expressQws } from '../src';

const app = expressQws(express());

app.use((_req, _res, next) => {
  console.log('Connect middleware');
  next();
});

app.qws('/mypath/:name', (qws: QWebSocket) => {
  qws.onJson((data: Record<string, unknown>, headers: Record<string, unknown>) => {
    console.log('> JSON', headers, data);
  });

  qws.onBin((data: Buffer, headers: Record<string, unknown>) => {
    console.log('> BIN', headers, data.toString());
  });
});

app.listen(3000, () => console.log('Server listening on port 3000'));
