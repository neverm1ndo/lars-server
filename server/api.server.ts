import express from 'express';
import https from 'https';
import fs from 'fs';
import mongoose, { Schema } from 'mongoose';
import jwt from 'express-jwt';
import WebSocket from 'ws';
import { Parser } from './parser.server';

import { Logger } from './logger';

import { WSMessage } from './interfaces/ws.message';
import { LogLine } from './interfaces/logline';

import { map } from 'rxjs/operators';

const PORT: number = 9809;
const LOG_LINE = mongoose.model( 'LogLine', new Schema ({
  unix: { type: Number, required: true },
  date: { type: String, required: true },
  process: { type: String, required: true },
  nickname: { type: String },
  id: { type: Number },
  geo: {
    country: { type: String },
    cc: { type: String },
    ip: { type: String },
    as: { type: Number },
    ss: { type: String },
    org: { type: String },
    c: { type: String }
  }
}));

export default class API {
  wss: WebSocket.Server = new WebSocket.Server({
    port: 3001
  });
  private clients: WebSocket[] = [];
  app: any;
  parser: Parser = new Parser({ path: './logs/20200928.log' });

  constructor() {
    this.app = express();
    this.app.set('secret', 'CHANGE_ME');
    this.app.use('/api', jwt({
      secret: this.app.get('secret'),
      algorithms: ['RS256'],
      credentialsRequired: false,
      getToken: (req: any) => {
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
            return req.headers.authorization.split(' ')[1];
        } else if (req.query && req.query.token) {
          return req.query.token;
        }
        return null;
      }
    }));
    mongoose.connect("mongodb://localhost:27017/libertylogs", { useNewUrlParser: true, useUnifiedTopology: true });
  }

  wsmsg(msg: WSMessage): string {
    return JSON.stringify(msg);
  }

  private subs() {
    Logger.log('Subbing to all events...')
    this.parser.result$.pipe(
      map(val => val.toString())
    ).subscribe((unparsed: string) => {
      this.parser.parse(unparsed).forEach((line: LogLine) => {
        let ln = new LOG_LINE(line);
        ln.save().then(() => { /** Logger.log('Line', line.process, 'saved') **/ });
      })
    }, (err) => { Logger.error(err) });
  }
  public init() {
    // this.subs();
    this.app.get('/api/uber', (req: any, res: any) => { // TEST function. Could be expensive
      if (!req.headers.authorization) return res.sendStatus(401);
      LOG_LINE.find({}, (err: any, lines: mongoose.Document[]) => {
        if (err) return Logger.error(err);
        res.send(lines);
        Logger.log('GET |', req.connection.remoteAddress, req.user,'-> LINES [', req.originalUrl, ']');
      });
    });
    this.app.get('/api/search', (req: any, res: any) => {
      /** Searching algorythm. Requires data from MongoDB.
          Searching by: * Nickname
                        * Serial numbers
                        * Date
                        * IP
    **/
    res.sendStatus(200);
    });
    this.app.get('/api/config-files', (req: any, res: any) => {
      /** Gets configuration files
    **/
    res.sendStatus(200);
    });
    https.createServer({
      'key' : ' ',
      'cert' : ' ',
      'ca' : ' '
    }, this.app).listen(PORT, () => {
      Logger.log('Express API server listening on port', PORT);
      this.wss.on('connection', (ws: any, req: any) => {
        this.clients.push(ws);
        Logger.log(ws._socket.remoteAddress, 'connected to the LAS');
        ws.on('message', (message: string) => {
          switch (JSON.parse(message).event) {
            case 'TEST': {
              break;
            }
            default: break;
          }
        });
        ws.send(this.wsmsg({event: 'client-connection', msg: `> You successfully conected to the Liberty Admin Server! IP: ${ws._socket.remoteAddress}`}));
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
