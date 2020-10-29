import express from 'express';
import https from 'https';
import http from 'http';
import cors from 'cors';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import path from 'path';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import fs from 'fs';
import md5 from 'md5';

import { Logger } from './logger';

dotenv.config({ path:path.resolve(process.cwd(), 'server/.env') });

const HTTPS_PORT: any = process.env.HTTPS_PORT;
const HTTP_PORT: any = process.env.HTTP_PORT;

export default class Auth {
  app: any;
  connection: any;
  readonly whitelist: string[] = JSON.parse(process.env.CORS_WL!);
  readonly CORSoptions: cors.CorsOptions = {
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'X-Access-Token',
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
  constructor() {
    this.app = express();
    this.app.options('*', cors());
    this.app.use(express.static(__dirname + '/static'));
    this.app.use(helmet());
    this.connection = mysql.createPool({
      host: process.env.DB_ADDRESS,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD
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
  init(): void {
    this.app.get('/user', cors(this.CORSoptions), (req: any, res: any) => {
      Logger.log(`[${req.connection.remoteAddress}]`,'Requesting user data ->', req.query.username);
      this.connection.promise()
        .query("SELECT user_id, user_type, user_avatar FROM phpbb_users WHERE username = ?", [req.query.name])
        .then(([rows, fields]: any[]): void => {
          let user = rows[0];
          res.send(JSON.stringify({
            role: user.user_type,
            id: user.user_id,
            avatar: user.user_avatar
          }));
        })
        .catch((err: any): void => {
          res.sendStatus(401).send('Unauthorized request');
          Logger.error(`[${req.connection.remoteAddress}]`, 401, 'Unauthorized request ->', req.query)
          Logger.error(err);
        })
        .then((): void => this.connection.end());
    });
    this.app.post('/login', cors(this.CORSoptions), bodyParser.json() ,(req: any, res: any): void => {
      Logger.log('Trying to authorize', req.body.email);
      this.connection.promise()
        .query("SELECT username, user_id, user_type, user_avatar, user_password FROM phpbb_users WHERE user_email = ?", [req.body.email])
        .then(([rows, fields]: any[]): void => {
          let user = rows[0];
          if (this.checkPassword(req.body.password, user.user_password)) {
            Logger.log(`[${req.connection.remoteAddress}]`, 'Successfull authorization ->', req.body.email);
            res.send(JSON.stringify({
              name: user.username,
              role: user.user_type,
              id: user.user_id,
              avatar: user.user_avatar,
              token: jwt.sign({ user: user.username, role: user.user_type, id: user.user_id }, process.env.ACCESS_TOKEN_SECRET!)
            }));
          }
        })
        .catch((err: any): void => {
          res.sendStatus(401).send('Failed authorization');
          Logger.error(`[${req.connection.remoteAddress}]`, 401, 'Failed authorization ->', req.body.email)
          Logger.error(err);
        })
        .then((): void => this.connection.end());
    });
    https.createServer({
      cert: fs.readFileSync(__dirname + process.env.SSL_FULLCHAIN_PATH!),
      key: fs.readFileSync(__dirname + process.env.SSL_PRIVKEY_PATH!)
    }, this.app).listen(HTTPS_PORT, () => {
      Logger.log('Auth HTTPS server listening on ', HTTPS_PORT, ' port');
    });
    http.createServer(this.app).listen(HTTP_PORT, () => {
      Logger.log('Auth HTTP server listening on ', HTTP_PORT, ' port');
    });
  }
}
