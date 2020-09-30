import express from 'express';
import fs from 'fs';

const PORT: number = 9809;

export default class API {
  app: any;
  constructor() {
    this.app = express();
  }
  init() {
    this.app.get('/search', (res: any, req: any) => {
      /** Searching algorythm. Requires data from MongoDB.
          Searching by: * Nickname
                        * Serial numbers
                        * Date
                        * IP
    **/
    });
    this.app.listen(PORT, () => {
      console.log('Server listening on ', PORT, ' port');
    });
  }
}
