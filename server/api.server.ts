import express from 'express';
// import mongoose, { Schema } from 'mongoose';
import { Parser } from './parser.server';
// import { Observable } from 'rxjs';
import WebSocket from 'ws';
import { WSMessage } from './interfaces/ws.message';
import { Logger } from './logger';

const PORT: number = 9809;

export default class API {
  wss: WebSocket.Server = new WebSocket.Server({
    port: 3001
  });
  clients: WebSocket[] = [];
  app: any;
  // parser: Parser = new Parser({ path: './logs/20200928.log' });
  constructor() {
    this.app = express();
    // mongoose.connect("mongodb://localhost:27017/libertylogs", { useNewUrlParser: true, useUnifiedTopology: true });
  }
  init() {
    // this.parser._watchdog.subscribe();
    this.app.get('/uber', (res: any, req: any) => { // TEST function. Could be expensive
      // res.send(mongoose.)
    });
    this.app.get('/search', (res: any, req: any) => {
      /** Searching algorythm. Requires data from MongoDB.
          Searching by: * Nickname
                        * Serial numbers
                        * Date
                        * IP
    **/
    });
    this.app.get('/config-files', (res: any, req: any) => {
      /** Gets configuration files
    **/
    });
    this.app.listen(PORT, () => {
      Logger.log('Express server listening on port', PORT)
      this.wss.on('connection', (ws: any, req: any) => {
        this.clients.push(ws);
        ws.on('message', (message: WSMessage) => {
          switch (message.event) {
            case 'TEST': {
              break;
            }
            default: break;
          }
        });
        ws.send(`> You successfully conected to the Liberty Admin Server! IP: ${ws._socket.remoteAddress}`);
      });
      this.wss.on('close', (ws: any) => {
        this.clients.forEach((client: any, index: number) => {
          if (ws._socket.remoteAddress == client._socket.remoteAddress) {
            this.clients.splice(index, 0);
          };
        });
      });
    });
  }
}
