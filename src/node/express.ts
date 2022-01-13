import express, { Express, Request } from 'express';
import WebSocket from 'ws';
import expressWs, { Application } from 'express-ws';
import QWebSocket from '../common/queuews';

export type QwsHandler = (qws: QWebSocket, req: Request) => void;

export type QwsApplication = Application & {
  qws: (route: string, handler: QwsHandler) => void;
};

export default function expressQws(app?: Express): QwsApplication {
  const expressWsInstance = expressWs(app || express());
  const appWs = expressWsInstance.app as QwsApplication;

  appWs.qws = (route, handler) => {
    appWs.ws(route, (ws: WebSocket, req?: Request) => {
      const qws = new QWebSocket(ws);
      handler(qws, req);
    });
  };
  appWs.qws.bind(appWs.qws);

  return appWs;
}
