import express from 'express';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import path from 'path';
// import jwt from 'express-jwt';

import { Logger } from './logger';

const PORT: number = 9009;

export default class Auth {
  app: any;
  pool: mysql.Pool;
  constructor() {
    this.app = express();
    dotenv.config({ path:path.resolve(process.cwd(), 'server/.env') });

    this.pool = mysql.createPool({
      host: process.env.DB_ADDRESS,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD
    });
  }
  init(): void {
    this.app.get('/auth', (req: any, res: any) => {
      Logger.log('Trying to authorise');
      this.pool.query("", (err: any, data: any) => {
        if (err) Logger.error('Failed quering data!');
      });
    });
    this.app.listen(PORT, () => {
      console.log('Auth server listening on ', PORT, ' port');
    });
  }
}
