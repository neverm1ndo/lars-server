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

import { Logger } from './logger';

const HTTPS_PORT: number = 443;
const HTTP_PORT: number = 80;

export default class Auth {
  app: any;
  readonly connection: mysql.Connection;
  readonly whitelist = ['http://api.stackexchange.com', 'http://localhost:4200', '*'];
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
    dotenv.config({ path:path.resolve(process.cwd(), 'server/.env') });
    this.app = express();
    this.app.use(cors(this.CORSoptions));
    this.app.use(express.static('static'));
    this.app.use(helmet());
    this.connection = mysql.createConnection({
      host: process.env.DB_ADDRESS,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD
    });
  }

  certsIsReady(): boolean {
    if (!fs.existsSync(path.join(__dirname + '/sslcert'))) {
      return true;
    } else {
      return false;
    }
  }
  init(): void {
    this.app.post('/login', bodyParser.json() ,(req: any, res: any): void => {
      Logger.log('Trying to authorize', req.body.email);
      this.connection.promise()
        .query(`SELECT username, user_id, user_type, user_avatar FROM phpbb_users WHERE user_email = '${req.body.email}' AND user_password = '${req.body.password}'`)
        .then(([rows, fields]: any[]): void => {
          Logger.log(`[${req.connection.remoteAddress}]`, 'Successfull authorization ->', req.body.email);
          res.send(JSON.stringify({
            name: rows.username,
            role: rows.user_type,
            id: rows.user_id,
            avatar: rows.user_avatar,
            token: jwt.sign({ user: rows.username, role: rows.user_type, id: rows.user_id }, process.env.ACCESS_TOKEN_SECRET!)
          }));
        })
        .catch((err: any): void => {
          res.sendStatus(401)('Failed authorization');
          Logger.error(`[${req.connection.remoteAddress}]`, 401, 'Failed authorization ->', req.body.email)
          Logger.error(err);
        })
        .then((): void => this.connection.end());
    });
    if (this.certsIsReady()) {
      https.createServer({
        cert: fs.readFileSync('./sslcert/fullchain.pem'),
        key: fs.readFileSync('./sslcert/privkey.pem')
      }, this.app).listen(HTTPS_PORT, () => {
        console.log('Auth HTTPS server listening on ', HTTPS_PORT, ' port');
      });
    }
    http.createServer(this.app).listen(HTTP_PORT, () => {
      Logger.log('Auth HTTP server listening on ', HTTP_PORT, ' port');
    });
  }
}
