import express from 'express';
import https from 'https';
import http from 'http';
import cors from 'cors';
import mysql from 'mysql2';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import jwte from 'express-jwt';
import md5 from 'md5';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import WebSocket from 'ws';
import { Parser } from './parser.server';
import { Watcher } from './watcher';
import { Logger } from './logger';
import { FSTreeNode } from './FSTree';

import { WSMessage } from './interfaces/ws.message';
import { LogLine } from './interfaces/logline';

import { map } from 'rxjs/operators';

dotenv.config({ path:path.resolve(process.cwd(), 'server/.env') });

const HTTP_PORT: number = 8080;
const HTTPS_PORT: number = 8443;

const LOG_LINE = mongoose.model( 'LogLine', new Schema ({
  unix: { type: Number, required: true },
  date: { type: String, required: true },
  process: { type: String, required: true },
  nickname: { type: String },
  id: { type: Number },
  content: { type: String },
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
  readonly whitelist: string[] = JSON.parse(process.env.CORS_WL!);
  readonly CORSoptions: cors.CorsOptions = {
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'X-Access-Token',
      'Authorization'
    ],
    credentials: true,
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    origin: (origin: any, callback: any) => {
      if (this.whitelist.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    preflightContinue: false,
  };
  private clients: WebSocket[] = [];
  app: any;
  connection: any;
  parser: Parser = new Parser();
  watcher: Watcher = new Watcher();
  first: boolean = false;

  constructor(first: boolean) {
    this.first = first;
    this.app = express();
    this.app.options('*', cors());
    this.app.set('secret', process.env.ACCESS_TOKEN_SECRET);
    this.app.use('/api', jwte({
      secret: this.app.get('secret'),
      algorithms: ['HS256'],
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
    this.app.use(helmet());
    this.app.use('/app', express.static(path.resolve(process.cwd(), 'app')));
    mongoose.connect(process.env.MONGO!, { useNewUrlParser: true, useUnifiedTopology: true });
    this.connection = mysql.createPool({
      host: process.env.DB_ADDRESS,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD
    });
  }

  wsmsg(msg: WSMessage): string {
    return JSON.stringify(msg);
  }

  private firstLaunch(dir: string): void {
    fs.readdir(dir, (err: NodeJS.ErrnoException | null, dirs: any[]) => {
      if (err) return err;
      for (let i = 0; i < dirs.length; i++) {
        if (typeof dirs[i] == 'string') {
          let fullPath = path.join(dir, dirs[i]);
          if (fs.lstatSync(fullPath).isDirectory()) {
            this.firstLaunch(fullPath);
          } else {
            fs.readFile(fullPath,(err: NodeJS.ErrnoException | null, buffer: Buffer) => {
              if (err) return err;
              this.parser.parse(buffer).forEach((line: LogLine) => {
                let ln = new LOG_LINE(line);
                ln.save();
              });
            })
          }
        }
      }
    });
  }

  checkPassword(pass: string, hash: string): boolean {
    let salt = hash.slice(0, hash.length - 32);
    let realPassword = hash.slice(hash.length - 32, hash.length);
    let password = md5(salt + pass);
    if (password === realPassword) {
      return true;
    } else {
      return false;
    }
  }

  private subs() {
    Logger.log('default', 'Subbing to all events...');
    this.watcher.result$.pipe(
      map(val => val.toString())
    ).subscribe((unparsed: string) => {
      this.parser.parse(unparsed).forEach((line: LogLine) => {
        let ln = new LOG_LINE(line);
        ln.save();
      })
    }, (err) => { Logger.log('error', err) });
  }
  public init() {
    if (this.first) {
      this.firstLaunch(process.env.LOGS_PATH!);
    }
    this.subs();
  this.app.get('/api/user', cors(this.CORSoptions), (req: any, res: any) => {
    Logger.log('default', `[${req.connection.remoteAddress}]`,'Requesting user data ->', req.query.username);
    this.connection.promise()
      .query("SELECT user_id, user_type, user_avatar FROM phpbb_users WHERE username = ?", [req.query.name])
      .then(([rows]: any[]): void => {
        let user = rows[0];
        res.send(JSON.stringify({
          role: user.user_type,
          id: user.user_id,
          avatar: user.user_avatar
        }));
      })
      .catch((err: any): void => {
        res.sendStatus(401).send('Unauthorized request');
        Logger.log('error', `[${req.connection.remoteAddress}]`, 401, 'Unauthorized request ->', req.query)
        Logger.log('error', err);
      })
      .then((): void => this.connection.end());
  });
  this.app.post('/login', cors(this.CORSoptions), bodyParser.json() ,(req: any, res: any): void => {
    Logger.log('default', 'Trying to authorize', req.body.email);
    this.connection.promise()
      .query("SELECT username, user_id, user_type, user_avatar, user_password FROM phpbb_users WHERE user_email = ?", [req.body.email])
      .then(([rows]: any[]): void => {
        let user = rows[0];
        if (this.checkPassword(req.body.password, user.user_password)) {
          Logger.log(`[${req.connection.remoteAddress}]`, 'Successfull authorization ->', req.body.email);
          res.send(JSON.stringify({
            name: user.username,
            role: user.user_type,
            id: user.user_id,
            avatar: 'http://www.gta-liberty.ru/images/avatars/upload/' + user.user_avatar,
            token: jwt.sign({ user: user.username, role: user.user_type, id: user.user_id }, this.app.get('secret'), { algorithm: 'HS256'})
          }));
        }
      })
      .catch((err: any): void => {
        res.sendStatus(401).send('Failed authorization');
        Logger.log('error', `[${req.connection.remoteAddress}]`, 401, 'Failed authorization ->', req.body.email)
        Logger.log('error', err);
      })
      .then((): void => this.connection.end());
  });
      this.app.post('/login-secret', bodyParser.json(), cors(this.CORSoptions), (req: any, res: any): void => {
        if (req.body.password === this.app.get('secret')) {
          Logger.log('default', `[${req.connection.remoteAddress}]`, 'Login in by the test service account...');
          res.send(JSON.stringify({
            name: 'TEST',
            role: 0,
            id: 0,
            avatar: 'https://avatars1.githubusercontent.com/u/6806120?s=460&u=4d9f445122df253c138d32175e7b7da1dfe63b05&v=4',
            token: jwt.sign({ user: 'TEST', role: 0, id: 0 }, this.app.get('secret'), { algorithm: 'HS256'})
          }));
        } else {
          Logger.log('error', 'Failed login in by the test service account');
          res.sendStatus(401).send('Failed authorization');
        }
      });
    this.app.get('/api/uber', cors(this.CORSoptions), (req: any, res: any) => { // TEST function. Could be expensive
      if (!req.headers.authorization) return res.sendStatus(401);
      Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[34mROLE: ${req.user.role}`, '\x1b[0m' ,'-> LINES [', req.originalUrl, ']');
      LOG_LINE.find({}, (err: any, lines: mongoose.Document[]) => {
        if (err) return Logger.log('error', err);
        res.send(lines);
      });
    });
    this.app.get('/api/last', cors(this.CORSoptions), (req: any, res: any) => { // GET last lines. Default : 100
      if (!req.headers.authorization) return res.sendStatus(401);
      let lim = 100;
      let page = 0;
      if (req.query.lim) lim = +req.query.lim;
      if (req.query.page) page = +req.query.page;
      Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[34mROLE: ${req.user.role}`, '\x1b[0m' ,'-> LINES', lim, page,' [', req.originalUrl, ']');
      LOG_LINE.find({}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page }, (err: any, lines: mongoose.Document[]) => {
        if (err) return Logger.log('error', err);
        res.send(lines);
      });
    });
    this.app.get('/api/search', cors(this.CORSoptions), (req: any, res: any) => { // GET Search by nickname, ip, serals
      if (!req.headers.authorization) return res.sendStatus(401);
      let lim = 40;
      let page = 0;
      if (req.query.lim) lim = +req.query.lim;
      if (req.query.page) page = +req.query.page;
        Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[34mROLE: ${req.user.role}`, '\x1b[0m' ,'-> SEARCH\n',
                   '                            └ ', JSON.stringify(req.query));
        if (req.query.ip) {
          LOG_LINE.find({"geo.ip": req.query.ip}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page}, (err: any, lines: mongoose.Document[]) => {
            if (err) return Logger.log('error', err);
            res.send(lines);
          });
          return true;
        }
        if (req.query.nickname) {
            LOG_LINE.find({nickname: req.query.nickname}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page}, (err: any, lines: mongoose.Document[]) => {
            if (err) return Logger.log('error', err);
            res.send(lines);
          });
          return true;
        }
        if (req.query.as && req.query.ss) {
          LOG_LINE.find({"geo.as": req.query.as, "geo.ss": req.query.ss}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page}, (err: any, lines: mongoose.Document[]) => {
            if (err) return Logger.log('error', err);
            res.send(lines);
          });
          return true;
        }
    });
    this.app.get('/api/config-files-tree', cors(this.CORSoptions), (req: any, res: any) => { // GET Files(configs) and directories tree
      if (!req.headers.authorization) return res.sendStatus(401);
      Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[34mROLE: ${req.user.role}`, '\x1b[0m' ,'-> CONFIG_FILES_TREE [', req.originalUrl, ']');
      let root = FSTreeNode.buildTree(process.env.CFG_PATH!, 'configs');
      res.send(JSON.stringify(root));
    });
    this.app.get('/api/config-file', cors(this.CORSoptions), (req: any, res: any) => {
      if (!req.headers.authorization) return res.sendStatus(401);
      Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[34mROLE: ${req.user.role}`, '\x1b[0m' ,'-> CONFIG_FILE', req.query.path, '[', req.originalUrl, ']');
      if (req.query.path) {
        res.set('Content-Type', 'text/plain');
        fs.readFile(decodeURI(req.query.path), (err: NodeJS.ErrnoException | null, data: any) => {
          if (err) {  res.status(500).send(err) }
          else { res.send(data) };
        });
      }
    });
    this.app.post('/api/save-config-file', cors(this.CORSoptions), bodyParser.json(), (req: any, res: any) => { // POST Rewrite changed config(any) file
      if (!req.headers.authorization)  { res.sendStatus(401); return ; }
      Logger.log('default', 'POST │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[34mROLE: ${req.user.role}`, '\x1b[0m' ,'-> SAVE_CONFIG_FILE', req.body.file.path, '[', req.originalUrl, ']');
        fs.writeFile(req.body.file.path, req.body.file.data, (err: NodeJS.ErrnoException | null) => {
          if (err) { res.status(500).send(err) }
          else { res.send(`File ${req.body.file.path} successfully saved`) };
        });
    });
    this.app.delete('/api/delete-file', cors(this.CORSoptions), bodyParser.json(), (req: any, res: any) => { // DELETE Removes config file
      if (!req.headers.authorization)  { res.sendStatus(401); return ; }
      res.set('Content-Type', 'text/plain');
      Logger.log('default', 'DELETE │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[34mROLE: ${req.user.role}`, '\x1b[0m' ,'-> DELETE_FILE', req.body.file.name, '[', req.originalUrl, ']');
        fs.unlink(req.body.file.path, (err: NodeJS.ErrnoException | null) => {
          if (err) {  res.status(500).send(err); }
          else { res.status(200) };
        });
    });
    this.app.get('/api/maps-files-tree', cors(this.CORSoptions), (req: any, res: any) => { // GET Files(maps) tree
      if (!req.headers.authorization) return res.sendStatus(401);
      Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[34mROLE: ${req.user.role}`, '\x1b[0m' ,'-> MAPS_FILES_TREE [', req.originalUrl, ']');
      let root = FSTreeNode.buildTree(process.env.MAPS_PATH!, 'maps');
      res.send(JSON.stringify(root));
    });
    this.app.post('/api/save-map', cors(this.CORSoptions), (req: any, res: any) => { // POST Write map file
      if (!req.headers.authorization)  { res.sendStatus(401); return ; }
      Logger.log('default', 'POST │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[34mROLE: ${req.user.role}`, '\x1b[0m' ,'-> SAVE_MAP_FILE', req.body.file.path, '[', req.originalUrl, ']');
        fs.writeFile(req.body.file.path, req.body.file.data, (err: NodeJS.ErrnoException | null) => {
          if (err) { res.status(500).send(err) }
          else { res.send(`Map ${req.body.file.path} successfully saved`) };
        });
    });
    this.app.delete('/api/delete-map', cors(this.CORSoptions), bodyParser.json(), (req: any, res: any) => { // DELETE Removes map file
      if (!req.headers.authorization)  { res.sendStatus(401); return ; }
      res.set('Content-Type', 'text/plain');
      Logger.log('default', 'DELETE │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[34mROLE: ${req.user.role}`, '\x1b[0m' ,'-> DELETE_MAP', req.body.file.name, '[', req.originalUrl, ']');
        fs.unlink(req.body.file.path, (err: NodeJS.ErrnoException | null) => {
          if (err) {  res.status(500).send(err); }
          else { res.status(200) };
        });
    });
    http.createServer(this.app).listen(HTTP_PORT, () => {
      Logger.log('default', 'HTTP LLS listening on port', HTTP_PORT);
    });
    // let httpsServer = https.createServer({
    // // cert: fs.readFileSync(path.resolve(process.cwd(), process.env.SSL_FULLCHAIN_PATH!)),
    // key: fs.readFileSync(process.env.SSL_PRIVKEY_PATH!)
    // }, this.app).listen(HTTPS_PORT, () => {
    //   Logger.log('HTTPS LLS listening on port', HTTPS_PORT);
    // });
    //
    /** WEBSOCKET SERVICE **/
    let wss = new WebSocket.Server({
      port: 3000
    });
    wss.on('connection', (ws: any) => {
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
      ws.send(this.wsmsg({event: 'client-connection', msg: `> You successfully conected to the LLS ! IP: ${ws._socket.remoteAddress}`}));
    });
    wss.on('close', (ws: any) => {
      this.clients.forEach((client: any, index: number) => {
        if (ws._socket.remoteAddress == client._socket.remoteAddress) {
          this.clients.splice(index, 0);
        };
      });
    });
    wss.on('error', (err) => {
      Logger.log('error', err);
    });
  }
}
